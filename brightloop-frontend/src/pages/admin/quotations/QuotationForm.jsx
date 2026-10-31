import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineCurrencyRupee,
  HiOutlineBookmarkSquare,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { FormField, CurrencyDisplay } from '@/components/common';
import {
  quotationsAPI,
  customersAPI,
  productsAPI,
  plansAPI,
  taxesAPI,
  discountsAPI,
} from '@/api/endpoints';
import { formatCurrency } from '@/utils/helpers';

export default function QuotationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    valid_until: '',
    notes: '',
    template_id: '',
  });

  const [lines, setLines] = useState([
    {
      id: `line-${Date.now()}`,
      product_id: '',
      plan_id: '',
      quantity: 1,
      unit_price: 0,
      tax_id: '',
      tax_rate: 0,
      discount_id: '',
      discount_amount: 0,
    },
  ]);

  // Load auxiliary data
  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, pRes, plRes, tRes, dRes, tplRes] = await Promise.all([
          customersAPI.list({ page_size: 100 }),
          productsAPI.list({ page_size: 100 }),
          plansAPI.list({ page_size: 100 }),
          taxesAPI.list({ page_size: 50 }),
          discountsAPI.list({ page_size: 50 }),
          quotationsAPI.listTemplates({ page_size: 50 }),
        ]);

        setCustomers(cRes.data.results || cRes.data || []);
        setProducts(pRes.data.results || pRes.data || []);
        setPlans(plRes.data.results || plRes.data || []);
        setTaxes(tRes.data.results || tRes.data || []);
        setDiscounts(dRes.data.results || dRes.data || []);
        setTemplates(tplRes.data.results || tplRes.data || []);
      } catch (err) {
        // Continue
      }
    }
    loadData();

    if (isEdit) {
      quotationsAPI.get(id).then((res) => {
        const q = res.data;
        setFormData({
          customer_id: q.customer?.id || q.customer_id || '',
          valid_until: q.valid_until ? q.valid_until.split('T')[0] : '',
          notes: q.notes || '',
          template_id: '',
        });
        if (q.lines && q.lines.length > 0) {
          setLines(
            q.lines.map((l) => ({
              id: l.id || `line-${Date.now()}-${Math.random()}`,
              product_id: l.product?.id || l.product_id || '',
              plan_id: l.plan?.id || l.plan_id || '',
              quantity: l.quantity || 1,
              unit_price: parseFloat(l.unit_price) || 0,
              tax_id: l.tax_id || '',
              tax_rate: parseFloat(l.tax_rate) || 0,
              discount_id: l.discount_id || '',
              discount_amount: parseFloat(l.discount_amount) || 0,
            }))
          );
        }
      });
    }
  }, [id, isEdit]);

  // Handle template selection
  const handleApplyTemplate = async (templateId) => {
    if (!templateId) return;
    try {
      const res = await quotationsAPI.getTemplate(templateId);
      const tpl = res.data;
      if (tpl.lines && tpl.lines.length > 0) {
        setLines(
          tpl.lines.map((l) => ({
            id: `tpl-${Date.now()}-${Math.random()}`,
            product_id: l.product_id || l.product?.id || '',
            plan_id: l.plan_id || l.plan?.id || '',
            quantity: l.quantity || 1,
            unit_price: parseFloat(l.unit_price) || 0,
            tax_id: l.tax_id || '',
            tax_rate: parseFloat(l.tax_rate) || 0,
            discount_id: l.discount_id || '',
            discount_amount: parseFloat(l.discount_amount) || 0,
          }))
        );
        toast.success(`Loaded items from template "${tpl.name}"`);
      }
    } catch (err) {
      toast.error('Failed to apply template');
    }
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        product_id: '',
        plan_id: '',
        quantity: 1,
        unit_price: 0,
        tax_id: '',
        tax_rate: 0,
        discount_id: '',
        discount_amount: 0,
      },
    ]);
  };

  const handleRemoveLine = (index) => {
    if (lines.length === 1) {
      toast.error('A quotation must have at least one line');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[index], [field]: value };

      if (field === 'product_id') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          line.unit_price = parseFloat(prod.sales_price) || 0;
        }
      }

      if (field === 'plan_id') {
        const pl = plans.find((p) => p.id === value);
        if (pl) {
          line.unit_price = parseFloat(pl.price) || line.unit_price;
        }
      }

      if (field === 'tax_id') {
        const t = taxes.find((tax) => tax.id === value);
        line.tax_rate = t ? parseFloat(t.rate) || 0 : 0;
      }

      if (field === 'discount_id') {
        const d = discounts.find((disc) => disc.id === value);
        if (d) {
          const rawSubtotal = (parseFloat(line.quantity) || 1) * (parseFloat(line.unit_price) || 0);
          if (d.type === 'percentage') {
            line.discount_amount = (rawSubtotal * (parseFloat(d.value) || 0)) / 100;
          } else {
            line.discount_amount = parseFloat(d.value) || 0;
          }
        } else {
          line.discount_amount = 0;
        }
      }

      updated[index] = line;
      return updated;
    });
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    lines.forEach((line) => {
      const qty = parseFloat(line.quantity) || 0;
      const price = parseFloat(line.unit_price) || 0;
      const lineSubtotal = qty * price;
      const lineDiscount = parseFloat(line.discount_amount) || 0;
      const taxable = Math.max(0, lineSubtotal - lineDiscount);
      const lineTax = (taxable * (parseFloat(line.tax_rate) || 0)) / 100;

      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;
      totalTax += lineTax;
    });

    const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

    return {
      subtotal,
      totalTax,
      totalDiscount,
      grandTotal,
    };
  };

  const { subtotal, totalTax, totalDiscount, grandTotal } = calculateTotals();

  const handleSubmit = async (e, sendDirectly = false) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    if (lines.some((l) => !l.product_id && !l.plan_id)) {
      toast.error('All lines must have a product or plan selected');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        status: sendDirectly ? 'sent' : 'draft',
        subtotal_amount: subtotal,
        tax_amount: totalTax,
        discount_amount: totalDiscount,
        total_amount: grandTotal,
        lines: lines.map((l) => ({
          product_id: l.product_id || null,
          plan_id: l.plan_id || null,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          tax_rate: parseFloat(l.tax_rate) || 0,
          discount_amount: parseFloat(l.discount_amount) || 0,
          line_total:
            (parseFloat(l.quantity) || 1) * (parseFloat(l.unit_price) || 0) -
            (parseFloat(l.discount_amount) || 0) +
            (((parseFloat(l.quantity) || 1) * (parseFloat(l.unit_price) || 0) -
              (parseFloat(l.discount_amount) || 0)) *
              (parseFloat(l.tax_rate) || 0)) /
              100,
        })),
      };

      if (isEdit) {
        await quotationsAPI.update(id, payload);
        toast.success('Quotation updated');
      } else {
        await quotationsAPI.create(payload);
        toast.success(sendDirectly ? 'Quotation created and sent!' : 'Quotation drafted');
      }
      navigate('/admin/quotations');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save quotation';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/quotations"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Quotations
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={loading}
            className="btn-secondary"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="btn-primary"
          >
            Save & Send to Customer
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Edit Quotation' : 'Create Commercial Quotation'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Build a comprehensive quotation with products, subscription plans, taxes and discounts.
          </p>
        </div>

        {/* Customer & Template selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Customer" required>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, customer_id: e.target.value }))}
              className="select-field"
              required
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || `${c.first_name || ''} ${c.last_name || ''}`} ({c.email})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Load from Template (Optional)">
            <select
              value={formData.template_id}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, template_id: e.target.value }));
                handleApplyTemplate(e.target.value);
              }}
              className="select-field"
            >
              <option value="">Choose a template to pre-fill lines...</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Quotation Valid Until" required>
            <input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData((prev) => ({ ...prev, valid_until: e.target.value }))}
              className="input-field"
              required
            />
          </FormField>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Quotation Lines & Products
            </h3>
            <button
              type="button"
              onClick={handleAddLine}
              className="btn-secondary btn-sm"
            >
              <HiOutlinePlus className="w-3.5 h-3.5" /> Add Line
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Product / Service</th>
                    <th className="px-3 py-2.5 text-left">Plan (Optional)</th>
                    <th className="px-3 py-2.5 text-left w-24">Qty</th>
                    <th className="px-3 py-2.5 text-left w-32">Unit Price (₹)</th>
                    <th className="px-3 py-2.5 text-left w-32">Tax</th>
                    <th className="px-3 py-2.5 text-left w-36">Discount</th>
                    <th className="px-3 py-2.5 text-right w-32">Total</th>
                    <th className="px-2 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, idx) => {
                    const lineQty = parseFloat(line.quantity) || 0;
                    const linePrice = parseFloat(line.unit_price) || 0;
                    const raw = lineQty * linePrice;
                    const disc = parseFloat(line.discount_amount) || 0;
                    const taxable = Math.max(0, raw - disc);
                    const lineTax = (taxable * (parseFloat(line.tax_rate) || 0)) / 100;
                    const lineTotal = taxable + lineTax;

                    return (
                      <tr key={line.id || idx} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <select
                            value={line.product_id}
                            onChange={(e) => handleLineChange(idx, 'product_id', e.target.value)}
                            className="select-field text-xs py-1.5"
                          >
                            <option value="">Select product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (₹{p.sales_price})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2">
                          <select
                            value={line.plan_id}
                            onChange={(e) => handleLineChange(idx, 'plan_id', e.target.value)}
                            className="select-field text-xs py-1.5"
                          >
                            <option value="">Standalone / None</option>
                            {plans.map((pl) => (
                              <option key={pl.id} value={pl.id}>
                                {pl.name} (₹{pl.price}/{pl.billing_frequency})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            className="input-field text-xs py-1.5"
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.unit_price}
                            onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                            className="input-field text-xs py-1.5"
                          />
                        </td>

                        <td className="p-2">
                          <select
                            value={line.tax_id}
                            onChange={(e) => handleLineChange(idx, 'tax_id', e.target.value)}
                            className="select-field text-xs py-1.5"
                          >
                            <option value="">0% Tax</option>
                            {taxes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.rate}%)
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2">
                          <select
                            value={line.discount_id}
                            onChange={(e) => handleLineChange(idx, 'discount_id', e.target.value)}
                            className="select-field text-xs py-1.5"
                          >
                            <option value="">No Discount</option>
                            {discounts.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.type === 'percentage' ? `${d.value}%` : `₹${d.value}`})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2 text-right font-semibold text-slate-800 text-xs">
                          {formatCurrency(lineTotal)}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div>
            <FormField label="Commercial Notes & Terms">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows="4"
                placeholder="Include custom payment terms, SLA provisions, or delivery timelines..."
                className="input-field resize-none"
              />
            </FormField>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 font-medium">
                <span>Discounts Applied:</span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-slate-600">
              <span>Estimated Taxes:</span>
              <span className="font-medium text-slate-800">+{formatCurrency(totalTax)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between text-base font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-xl text-brand-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
