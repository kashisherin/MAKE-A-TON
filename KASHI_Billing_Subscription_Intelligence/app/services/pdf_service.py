import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.financial import Invoice


class InvoicePDFService:
    @staticmethod
    def generate_invoice_pdf(invoice: Invoice) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "TitleStyle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1E293B"),
        )
        subtitle_style = ParagraphStyle(
            "SubTitleStyle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748B"),
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#334155"),
        )
        table_header_style = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.white,
            fontName="Helvetica-Bold",
        )
        table_cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#1E293B"),
        )

        story = []

        # Header Section
        header_data = [
            [
                Paragraph("<b>KASHI</b><br/><font size=9 color='#64748B'>Subscription & Financial Intelligence</font>", title_style),
                Paragraph(
                    f"<b>TAX INVOICE</b><br/>"
                    f"<b>Invoice #:</b> {invoice.invoice_number}<br/>"
                    f"<b>Status:</b> {invoice.status.upper()}<br/>"
                    f"<b>Date:</b> {invoice.created_at.strftime('%Y-%m-%d')}<br/>"
                    f"<b>Due Date:</b> {invoice.due_at.strftime('%Y-%m-%d') if invoice.due_at else 'Due on Receipt'}",
                    subtitle_style,
                ),
            ]
        ]
        header_table = Table(header_data, colWidths=[320, 220])
        header_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ])
        )
        story.append(header_table)
        story.append(Spacer(1, 15))

        # Customer & Billing Info
        customer_info = (
            f"<b>Billed To:</b><br/>"
            f"Customer ID: {invoice.customer_id}<br/>"
            f"Address: {invoice.customer_address or 'Not Provided'}<br/>"
            f"Place of Supply: {invoice.place_of_supply or 'KA'}<br/>"
            f"Customer Tax ID / GSTIN: {invoice.customer_tax_id or 'Unregistered'}"
        )
        billing_period_info = (
            f"<b>Billing Period:</b><br/>"
            f"Start: {invoice.billing_period_start.strftime('%Y-%m-%d') if invoice.billing_period_start else 'N/A'}<br/>"
            f"End: {invoice.billing_period_end.strftime('%Y-%m-%d') if invoice.billing_period_end else 'N/A'}<br/>"
            f"Currency: {invoice.currency}"
        )
        client_data = [
            [Paragraph(customer_info, body_style), Paragraph(billing_period_info, body_style)]
        ]
        client_table = Table(client_data, colWidths=[320, 220])
        client_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ])
        )
        story.append(client_table)
        story.append(Spacer(1, 15))

        # Line Items Table
        line_data = [
            [
                Paragraph("Description", table_header_style),
                Paragraph("Qty", table_header_style),
                Paragraph("Unit Price", table_header_style),
                Paragraph("Discount", table_header_style),
                Paragraph("Tax", table_header_style),
                Paragraph("Total", table_header_style),
            ]
        ]
        for line in invoice.lines:
            line_data.append([
                Paragraph(line.description, table_cell_style),
                Paragraph(str(line.quantity), table_cell_style),
                Paragraph(f"{invoice.currency} {line.unit_price:.2f}", table_cell_style),
                Paragraph(f"{invoice.currency} {line.discount_amount:.2f}", table_cell_style),
                Paragraph(f"{invoice.currency} {line.tax_amount:.2f}", table_cell_style),
                Paragraph(f"{invoice.currency} {line.line_total:.2f}", table_cell_style),
            ])

        items_table = Table(line_data, colWidths=[200, 45, 75, 70, 70, 80])
        items_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ])
        )
        story.append(items_table)
        story.append(Spacer(1, 15))

        # Totals Summary Table
        summary_rows = [
            [Paragraph("Subtotal:", body_style), Paragraph(f"{invoice.currency} {invoice.subtotal:.2f}", body_style)],
            [Paragraph("Discount Total:", body_style), Paragraph(f"- {invoice.currency} {invoice.discount_total:.2f}", body_style)],
            [Paragraph("Tax Total:", body_style), Paragraph(f"{invoice.currency} {invoice.tax_total:.2f}", body_style)],
            [Paragraph("<b>Grand Total:</b>", body_style), Paragraph(f"<b>{invoice.currency} {invoice.total:.2f}</b>", body_style)],
            [Paragraph("Amount Paid:", body_style), Paragraph(f"{invoice.currency} {invoice.amount_paid:.2f}", body_style)],
            [Paragraph("<b>Outstanding Balance:</b>", body_style), Paragraph(f"<b>{invoice.currency} {invoice.outstanding_balance:.2f}</b>", body_style)],
        ]
        summary_table = Table(summary_rows, colWidths=[140, 120])
        summary_table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LINEBELOW", (0, 3), (1, 3), 1, colors.HexColor("#0F172A")),
                ("LINEBELOW", (0, 5), (1, 5), 1.5, colors.HexColor("#0F172A")),
            ])
        )

        align_wrapper = Table([["", summary_table]], colWidths=[280, 260])
        align_wrapper.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
        story.append(align_wrapper)
        story.append(Spacer(1, 25))

        # Footer notes
        footer_text = Paragraph(
            "<font size=8 color='#94A3B8'>Thank you for your business. This is a computer generated invoice and requires no physical signature.<br/>"
            "For billing inquiries, please contact billing@kashi.internal</font>",
            body_style,
        )
        story.append(footer_text)

        doc.build(story)
        return buffer.getvalue()

