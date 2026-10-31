import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCalendarDays,
  HiOutlineBanknotes,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';
import {
  subscriptionsAPI,
  customersAPI,
  plansAPI,
  productsAPI,
  taxesAPI,
} from '@/api/endpoints';
import { formatCurrency } from '@/utils/helpers';

export default function SubscriptionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    payment_terms: 'net_30',
    notes: '',
  });

  const [lines, setLines] = useState([
    {
      id: `line-${Date.now()}`,
      product_id: '',
      quantity: 1,
      unit_price: 0,
      tax_id: '',
      tax_rate: 0,
    },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, plRes, prRes, tRes] = await Promise.all([
          customersAPI.list({ page_size: 100 }),
          plansAPI.list({ page_size: 100 }),
          productsAPI.list({ page_size: 100 }),
          taxesAPI.list({ page_size: 50 }),
        ]);
        setCustomers(cRes.data.results || cRes.data || []);
        setPlans(plRes.data.results || plRes.data || []);
        setProducts(prRes.data.results || prRes.data || []);
        setTaxes(tRes.data.results || tRes.data || []);
      } catch (err) {
        // Fallback
      }
    }
    loadData();

    if (isEdit) {
      subscriptionsAPI.get(id).then((res) => {
        const sub = res.data;
        setFormData({
          customer_id: sub.customer?.id || sub.customer_id || '',
          plan_id: sub.plan?.id || sub.plan_id || '',
          start_date: sub.start_date ? sub.start_date.split('T')[0] : '',
          expiry_date: sub.expiry_date ? sub.expiry_date.split('T')[0] : '',
          payment_terms: sub.payment_terms || 'net_30',
          notes: sub.notes || '',
        });
        if (sub.lines && sub.lines.length > 0) {
          setLines(
            sub.lines.map((l) => ({
              id: l.id || `line-${Date.now()}-${Math.random()}`,
              product_id: l.product?.id || l.product_id || '',
              quantity: l.quantity || 1,
              unit_price: parseFloat(l.unit_price) || 0,
              tax_id: l.tax_id || '',
              tax_rate: parseFloat(l.tax_rate) || 0,
            }))
          );
        }
      });
    }
  }, [id, isEdit]);

  const handlePlanChange = (planId) => {
    setFormData((prev) => ({ ...prev, plan_id: planId }));
    const selectedPlan = plans.find((p) => p.id === planId);
    if (selectedPlan && selectedPlan.products && selectedPlan.products.length > 0) {
      setLines(
        selectedPlan.products.map((p) => ({
          id: `line-${Date.now()}-${Math.random()}`,
          product_id: p.id,
          quantity: 1,
          unit_price: parseFloat(p.sales_price) || 0,
          tax_id: '',
          tax_rate: 0,
        }))
      );
    }
  };

  const handleLineChange = (index, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[index], [field]: value };
      if (field === 'product_id') {
        const p = products.find((prod) => prod.id === value);
        if (p) line.unit_price = parseFloat(p.sales_price) || 0;
      }
      if (field === 'tax_id') {
        const t = taxes.find((tax) => tax.id === value);
        line.tax_rate = t ? parseFloat(t.rate) || 0 : 0;
      }
      updated[index] = line;
      return updated;
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        product_id: '',
        quantity: 1,
        unit_price: 0,
        tax_id: '',
        tax_rate: 0,
      },
    ]);
  };

  const handleRemoveLine = (idx) => {
    if (lines.length === 1) {
      toast.error('Subscription must contain at least one product line');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const calculateSubtotal = () =>
    lines.reduce((acc, l) => acc + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);

  const calculateTaxTotal = () =>
    lines.reduce(
      (acc, l) =>
        acc +
        (((parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0) * (parseFloat(l.tax_rate) || 0)) / 100),
      0
    );

  const subtotal = calculateSubtotal();
  const taxTotal = calculateTaxTotal();
  const grandTotal = subtotal + taxTotal;

  const handleSubmit = async (e, shouldConfirm = false) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    if (!formData.plan_id) {
      toast.error('Please select a subscription plan');
      return;
    }
    if (lines.some((l) => !l.product_id)) {
      toast.error('Please select products for all lines');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        status: shouldConfirm ? 'confirmed' : 'draft',
        total_amount: grandTotal,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          tax_rate: parseFloat(l.tax_rate) || 0,
          line_amount:
            (parseFloat(l.quantity) || 1) * (parseFloat(l.unit_price) || 0) * (1 + (parseFloat(l.tax_rate) || 0) / 100),
        })),
      };

      if (isEdit) {
        await subscriptionsAPI.update(id, payload);
        toast.success('Subscription updated');
      } else {
        await subscriptionsAPI.create(payload);
        toast.success(shouldConfirm ? 'Subscription created & confirmed' : 'Subscription drafted');
      }
      navigate('/admin/subscriptions');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to save subscription';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/subscriptions"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Subscriptions
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
            Create & Confirm
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Edit Subscription' : 'Create New Subscription'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Initialize recurring entitlement for a customer under an authorized subscription plan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <FormField label="Subscription Plan Tier" required>
            <select
              value={formData.plan_id}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="select-field"
              required
            >
              <option value="">Choose plan...</option>
              {plans.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} — {formatCurrency(pl.price)} / {pl.billing_frequency}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Start Date" required>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
              className="input-field"
              required
            />
          </FormField>

          <FormField label="Expiry Date (Optional)">
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))}
              className="input-field"
            />
          </FormField>

          <FormField label="Payment Terms" required>
            <select
              value={formData.payment_terms}
              onChange={(e) => setFormData((prev) => ({ ...prev, payment_terms: e.target.value }))}
              className="select-field"
            >
              <option value="immediate">Immediate</option>
              <option value="net_15">Net 15 Days</option>
              <option value="net_30">Net 30 Days</option>
              <option value="net_60">Net 60 Days</option>
            </select>
          </FormField>
        </div>

        {/* Subscription Lines */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Subscription Lines (Products & Quantities)
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
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
                <tr>
                  <th className="px-3 py-2.5 text-left">Product</th>
                  <th className="px-3 py-2.5 text-left w-24">Quantity</th>
                  <th className="px-3 py-2.5 text-left w-32">Unit Price (₹)</th>
                  <th className="px-3 py-2.5 text-left w-32">Tax Rule</th>
                  <th className="px-3 py-2.5 text-right w-32">Total</th>
                  <th className="px-2 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l, idx) => {
                  const qty = parseFloat(l.quantity) || 0;
                  const price = parseFloat(l.unit_price) || 0;
                  const tax = parseFloat(l.tax_rate) || 0;
                  const total = qty * price * (1 + tax / 100);

                  return (
                    <tr key={l.id || idx}>
                      <td className="p-2">
                        <select
                          value={l.product_id}
                          onChange={(e) => handleLineChange(idx, 'product_id', e.target.value)}
                          className="select-field text-xs py-1.5"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={l.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          className="input-field text-xs py-1.5"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={l.unit_price}
                          onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                          className="input-field text-xs py-1.5"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={l.tax_id}
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
                      <td className="p-2 text-right font-semibold text-slate-800 text-xs">
                        {formatCurrency(total)}
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

        {/* Totals */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes:</span>
              <span className="font-medium text-slate-800">+{formatCurrency(taxTotal)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-base">
              <span>Recurring Total:</span>
              <span className="text-brand-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
