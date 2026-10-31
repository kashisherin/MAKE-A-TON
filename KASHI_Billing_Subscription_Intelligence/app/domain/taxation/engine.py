from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Sequence
from app.services.money import money, CENT


@dataclass(frozen=True)
class TaxComponentResult:
    tax_name: str
    tax_code: str
    rate_percent: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal


@dataclass(frozen=True)
class TaxCalculationResult:
    taxable_subtotal: Decimal
    tax_total: Decimal
    grand_total: Decimal
    components: list[TaxComponentResult]


class TaxEngine:
    """
    Configurable, multi-jurisdiction tax engine supporting:
    - Percentage and fixed taxes
    - Tax-inclusive and tax-exclusive pricing
    - Indian GST (CGST + SGST vs IGST) based on place of supply vs supplier state
    - Location and product-specific rules
    - Tax exemption overrides
    """

    @staticmethod
    def calculate_tax_exclusive(
        taxable_base: Decimal,
        rate_percent: Decimal,
    ) -> Decimal:
        """Calculate tax on top of base amount: tax = base * (rate / 100)"""
        if taxable_base <= Decimal("0.00") or rate_percent <= Decimal("0.0000"):
            return Decimal("0.00")
        raw = taxable_base * rate_percent / Decimal("100")
        return raw.quantize(CENT, rounding=ROUND_HALF_UP)

    @staticmethod
    def extract_tax_inclusive(
        inclusive_total: Decimal,
        rate_percent: Decimal,
    ) -> tuple[Decimal, Decimal]:
        """
        Extract tax from tax-inclusive price:
        taxable_base = inclusive_total / (1 + rate / 100)
        tax = inclusive_total - taxable_base
        """
        if inclusive_total <= Decimal("0.00") or rate_percent <= Decimal("0.0000"):
            return inclusive_total, Decimal("0.00")
        one_plus_rate = Decimal("1") + (rate_percent / Decimal("100"))
        taxable_base = (inclusive_total / one_plus_rate).quantize(CENT, rounding=ROUND_HALF_UP)
        tax_amount = inclusive_total - taxable_base
        return taxable_base, tax_amount

    @classmethod
    def calculate_gst_breakdown(
        cls,
        taxable_amount: Decimal,
        total_rate_percent: Decimal,
        place_of_supply: str | None,
        supplier_state: str = "KA",
        is_inclusive: bool = False,
    ) -> list[TaxComponentResult]:
        """
        Indian GST calculation rules:
        - Intra-state (Supplier State == Place of Supply): split into CGST (50%) and SGST (50%)
        - Inter-state (Supplier State != Place of Supply): 100% IGST
        """
        if taxable_amount <= Decimal("0.00") or total_rate_percent <= Decimal("0.0000"):
            return []

        base = taxable_amount
        if is_inclusive:
            base, _ = cls.extract_tax_inclusive(taxable_amount, total_rate_percent)

        is_intra_state = (
            place_of_supply is None
            or place_of_supply.strip().upper() == supplier_state.strip().upper()
        )

        results: list[TaxComponentResult] = []
        if is_intra_state:
            half_rate = (total_rate_percent / Decimal("2")).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            cgst_tax = cls.calculate_tax_exclusive(base, half_rate)
            sgst_tax = cls.calculate_tax_exclusive(base, half_rate)
            results.append(
                TaxComponentResult(
                    tax_name="Central Goods and Services Tax (CGST)",
                    tax_code="CGST",
                    rate_percent=half_rate,
                    taxable_amount=base,
                    tax_amount=cgst_tax,
                )
            )
            results.append(
                TaxComponentResult(
                    tax_name="State Goods and Services Tax (SGST)",
                    tax_code="SGST",
                    rate_percent=half_rate,
                    taxable_amount=base,
                    tax_amount=sgst_tax,
                )
            )
        else:
            igst_tax = cls.calculate_tax_exclusive(base, total_rate_percent)
            results.append(
                TaxComponentResult(
                    tax_name="Integrated Goods and Services Tax (IGST)",
                    tax_code="IGST",
                    rate_percent=total_rate_percent,
                    taxable_amount=base,
                    tax_amount=igst_tax,
                )
            )

        return results

    @classmethod
    def calculate_line_tax(
        cls,
        line_subtotal: Decimal,
        discount_amount: Decimal,
        applicable_rate_percent: Decimal,
        is_inclusive: bool,
        is_exempt: bool,
        place_of_supply: str | None,
        supplier_state: str = "KA",
        jurisdiction_country: str = "IND",
    ) -> TaxCalculationResult:
        """
        Computes tax for a single invoice line after line discount.
        Discounts apply before tax.
        """
        taxable_base = max(Decimal("0.00"), line_subtotal - discount_amount)
        if is_exempt or applicable_rate_percent <= Decimal("0.0000") or taxable_base == Decimal("0.00"):
            return TaxCalculationResult(
                taxable_subtotal=taxable_base,
                tax_total=Decimal("0.00"),
                grand_total=taxable_base,
                components=[],
            )

        if jurisdiction_country.upper() == "IND":
            components = cls.calculate_gst_breakdown(
                taxable_amount=taxable_base,
                total_rate_percent=applicable_rate_percent,
                place_of_supply=place_of_supply,
                supplier_state=supplier_state,
                is_inclusive=is_inclusive,
            )
        else:
            # Generic VAT / Sales tax
            if is_inclusive:
                taxable_base, tax = cls.extract_tax_inclusive(taxable_base, applicable_rate_percent)
            else:
                tax = cls.calculate_tax_exclusive(taxable_base, applicable_rate_percent)
            components = [
                TaxComponentResult(
                    tax_name="Value Added Tax",
                    tax_code="VAT",
                    rate_percent=applicable_rate_percent,
                    taxable_amount=taxable_base,
                    tax_amount=tax,
                )
            ]

        tax_sum = sum((c.tax_amount for c in components), Decimal("0.00"))
        grand_total = taxable_base if is_inclusive else taxable_base + tax_sum
        return TaxCalculationResult(
            taxable_subtotal=taxable_base,
            tax_total=tax_sum,
            grand_total=grand_total,
            components=components,
        )

