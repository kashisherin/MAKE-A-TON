from decimal import Decimal, ROUND_HALF_UP
from pydantic import BaseModel, Field, field_validator

class MoneyInput(BaseModel):
    amount: Decimal = Field(gt=Decimal("0"))
    currency: str = Field(default="INR", min_length=3, max_length=3)

    @field_validator("amount")
    @classmethod
    def normalize_amount(cls, value: Decimal) -> Decimal:
        return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
