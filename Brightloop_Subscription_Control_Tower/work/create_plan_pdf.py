from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

OUT = r"C:\Users\PC\Documents\Codex\2026-10-31\files-mentioned-by-the-user-subscription\outputs\Brightloop_Subscription_Control_Tower_Plan.pdf"

purple = colors.HexColor('#5B3B67')
orange = colors.HexColor('#F5A623')
ink = colors.HexColor('#202124')
muted = colors.HexColor('#5F6368')
light = colors.HexColor('#F7F3F8')
gold = colors.HexColor('#FFF3D6')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=28, leading=33, textColor=purple, alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle(name='CoverSub', parent=styles['Normal'], fontSize=13, leading=18, textColor=muted, alignment=TA_CENTER, spaceAfter=20))
styles.add(ParagraphStyle(name='H1x', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=purple, spaceBefore=10, spaceAfter=8))
styles.add(ParagraphStyle(name='H2x', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12.5, leading=16, textColor=ink, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name='Bodyx', parent=styles['BodyText'], fontSize=9.4, leading=13.5, textColor=ink, spaceAfter=6))
styles.add(ParagraphStyle(name='Smallx', parent=styles['BodyText'], fontSize=8, leading=11, textColor=muted, spaceAfter=4))
styles.add(ParagraphStyle(name='Callout', parent=styles['BodyText'], fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=purple, backColor=gold, borderPadding=8, spaceBefore=6, spaceAfter=10))

def P(text, style='Bodyx'):
    return Paragraph(text, styles[style])

def bullets(items):
    return [P('• ' + x) for x in items]

def section(title, body=None):
    out = [P(title, 'H1x')]
    if body: out.append(P(body))
    return out

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#DDDDDD'))
    canvas.line(0.65*inch, 0.48*inch, 7.85*inch, 0.48*inch)
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(muted)
    canvas.drawString(0.65*inch, 0.28*inch, 'Brightloop Subscription Control Tower')
    canvas.drawRightString(7.85*inch, 0.28*inch, f'Page {doc.page}')
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=letter, rightMargin=.68*inch, leftMargin=.68*inch, topMargin=.62*inch, bottomMargin=.68*inch)
story = []

# Cover
story += [Spacer(1, .55*inch), P('BRIGHTLOOP', 'CoverSub'), P('Subscription Control Tower', 'CoverTitle'), P('Hackathon product plan: complete subscription management + Digital Twin Agentic AI', 'CoverSub')]
story.append(Table([[P('<b>Core promise</b><br/>Manage the complete subscription lifecycle from quotation to payment.', 'Bodyx'), P('<b>Novel differentiator</b><br/>Simulate pricing, discounts, renewals, and revenue safely before changing live data.', 'Bodyx')]], colWidths=[3.35*inch, 3.35*inch], style=TableStyle([('BACKGROUND',(0,0),(-1,-1),light),('BOX',(0,0),(-1,-1),0.5,purple),('INNERGRID',(0,0),(-1,-1),0.25,colors.white),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12)])))
story += [Spacer(1, .28*inch), P('The baseline follows the Brightloop problem statement: products, plans, subscriptions, quotations, invoices, taxes, discounts, payments, overdue tracking, role-based access, and finance reporting.', 'Bodyx'), Spacer(1, 1.6*inch), P('Prepared for hackathon implementation', 'Smallx'), PageBreak()]

story += section('1. Product vision', 'Brightloop Subscription Control Tower is a unified platform for running a subscription business. It combines an operational billing system with a safe simulation layer that helps finance teams make better decisions.')
story.append(P('“We do not only record what happened. We help the business understand what will happen next.”', 'Callout'))
story += [P('The core system satisfies the required workflow. The Digital Twin Agentic AI is an additional feature that turns the system into an intelligent, explainable revenue-control platform.')]

story += section('2. Core features from the brief')
core = [
    ['Area', 'Required capability'],
    ['Users & access', 'Admin, internal staff, and customer roles; unique email; password rules; reset link; customer-only portal access.'],
    ['Products & plans', 'Products, variants, sales/cost prices, notes, billing frequency, minimum quantity, availability dates, pause/renew/close rules.'],
    ['Quotation flow', 'Quotation templates with product lines, plans, payment terms, and validity period.'],
    ['Subscription lifecycle', 'Draft -> Quotation -> Confirmed -> Active -> Closed, with number, customer, plan, dates, lines, taxes, and totals.'],
    ['Automatic billing', 'Generate invoices from subscriptions; calculate taxes; prevent duplicate or skipped billing.'],
    ['Discounts', 'Fixed or percentage rules, minimum quantity, dates, usage limits, product or whole-subscription scope.'],
    ['Payments', 'Record method, amount, date, note; match payments to invoices; track paid, partial, outstanding, and overdue.'],
    ['Finance dashboard', 'Active subscriptions, revenue, payments, overdue invoices, filters, summary cards, and fast response at scale.'],
]
tbl = Table([[P(f'<b>{a}</b>'), P(f'<b>{b}</b>')] if i==0 else [P(a),P(b)] for i,(a,b) in enumerate(core)], colWidths=[1.48*inch, 5.3*inch], repeatRows=1)
tbl.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),purple),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#D8D8D8')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,light]),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
story.append(tbl)
story.append(PageBreak())

story += section('3. Novel feature: Digital Twin Agentic AI')
story.append(P('The Digital Twin is an isolated, simulated copy of the Brightloop business. It mirrors customers, products, plans, subscriptions, discounts, invoices, payments, and renewal dates, but it cannot change live records during a simulation.', 'Bodyx'))
story += [P('What the agent can answer', 'H2x')] + bullets([
    'What happens if we increase the monthly plan price by 10%?',
    'Which subscriptions are most likely to become overdue next month?',
    'What if all discounts expiring this month are removed?',
    'Which customers should receive an upgrade offer?',
    'How much revenue is at risk next month?',
])
story += [P('The agent returns', 'H2x')] + bullets(['Predicted revenue and revenue at risk', 'Affected subscriptions and customers', 'Expected overdue amount', 'Discount and tax impact', 'Customer-risk indicators', 'A plain-language recommendation'])

story += section('4. Agent workflow and safety')
workflow = [['Step', 'What happens'], ['1. Understand', 'The local AI interprets the finance lead question.'], ['2. Select tool', 'It chooses an approved simulation function.'], ['3. Calculate', 'Python performs exact revenue, tax, discount, and invoice calculations.'], ['4. Explain', 'The AI summarizes the result and its assumptions.'], ['5. Approve', 'The user reviews a proposed change.'], ['6. Apply', 'Only after approval does the system update real Odoo data.']]
wt = Table([[P(f'<b>{a}</b>'),P(f'<b>{b}</b>')] if i==0 else [P(a),P(b)] for i,(a,b) in enumerate(workflow)], colWidths=[1.15*inch, 5.63*inch], repeatRows=1)
wt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),orange),('TEXTCOLOR',(0,0),(-1,0),ink),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#D8D8D8')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,gold]),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
story.append(wt)

story += section('5. Standout supporting features')
story += [P('Billing-run simulator', 'H2x')] + bullets(['Preview invoice count, total revenue, taxes, discounts, missing data, and duplicate-billing risks before creating invoices.'])
story += [P('Explainable invoices', 'H2x')] + bullets(['Show how each invoice total was formed: plan price, variant charge, quantity, discount, taxes, and final amount.'])
story += [P('Subscription state guard', 'H2x')] + bullets(['Block invalid transitions such as activating an unconfirmed subscription, billing a closed subscription, or applying an expired discount.'])
story += [P('Payment matching assistant', 'H2x')] + bullets(['Suggest invoice matches using customer, amount, date, method, and note; handle partial and over-payments.'])

story.append(PageBreak())
story += section('6. Technical architecture')
arch = [['Layer', 'Implementation'], ['Core business system', 'Odoo Community Edition or an Odoo-style Python application.'], ['Data', 'PostgreSQL for the main system; SQLite is acceptable for a small demo.'], ['Digital Twin', 'A separate snapshot of business records used only for simulation.'], ['Simulation engine', 'Python functions for pricing, tax, discount, revenue, payment, and risk calculations.'], ['Agent', 'Local Ollama model such as Qwen, Llama, or Mistral.'], ['Interface', 'Odoo views or a Streamlit finance/AI dashboard.'], ['Safety', 'Tool allow-list, audit log, and approval before every real-data change.']]
at = Table([[P(f'<b>{a}</b>'),P(f'<b>{b}</b>')] if i==0 else [P(a),P(b)] for i,(a,b) in enumerate(arch)], colWidths=[1.55*inch, 5.23*inch], repeatRows=1)
at.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),purple),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#D8D8D8')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,light]),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
story.append(at)
story += [P('Free-cost AI plan', 'H2x')] + bullets(['Run the model locally with Ollama.', 'Use Python for all exact financial calculations.', 'Send only the user’s question and compact results to the local model.', 'Avoid paid APIs and keep business data private.'])

story += section('7. Hackathon demo storyline')
story += bullets([
    'Admin creates a product, variant, tax rule, and monthly plan.',
    'Sales staff creates a quotation from a template.',
    'The quote becomes a confirmed, active subscription.',
    'Billing day automatically creates an invoice with taxes and discount.',
    'A payment is recorded and matched to the invoice.',
    'A second invoice becomes overdue and appears on the finance dashboard.',
    'The finance lead asks: “What happens if we increase the monthly plan by 10%?”',
    'The Digital Twin shows revenue change, affected customers, risk, and recommendation.',
    'The finance lead approves or rejects the proposed change.',
])
story.append(P('The judge sees both the required end-to-end workflow and a memorable intelligence layer built directly on top of it.', 'Callout'))

story += section('8. Build priority')
priority = [['Priority', 'Build'], ['1', 'Authentication, roles, products, plans, and subscriptions'], ['2', 'Quotation-to-active lifecycle'], ['3', 'Automatic invoices, taxes, discounts, and payments'], ['4', 'Overdue tracking and finance dashboard'], ['5', 'Digital Twin snapshot and scenario simulator'], ['6', 'Local AI agent and approved tool calls'], ['7', 'Approval workflow, explainable invoices, and billing preview']]
pt = Table([[P(f'<b>{a}</b>'),P(f'<b>{b}</b>')] if i==0 else [P(a),P(b)] for i,(a,b) in enumerate(priority)], colWidths=[.75*inch, 6.03*inch], repeatRows=1)
pt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),orange),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#D8D8D8')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,gold]),('ALIGN',(0,1),(0,-1),'CENTER'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
story.append(pt)

story += section('Final pitch')
story.append(P('“Brightloop Subscription Control Tower manages the complete subscription lifecycle—from quotation to payment—and adds a Digital Twin Agent that lets finance teams safely simulate pricing, discounts, renewals, and revenue decisions before changing the real business.”', 'Callout'))

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
