import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';
import { paymentsAPI, invoicesAPI, customersAPI } from '@/api/endpoints';
import { PAYMENT_METHODS } from '@/utils/constants';
import { formatCurrency } from '@/utils/helpers';

export default function PaymentForm({ preselectedInvoice, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [formData, setFormData] = useState({
    invoice_id: preselectedInvoice?.id || '',
    customer_id: preselectedInvoice?.customer?.id || preselectedInvoice?.customer_id || '',
    payment_method: 'upi',
    amount: preselectedInvoice ? preselectedInvoice.balance || preselectedInvoice.total_amount : '',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    notes: '',
  });

  const selectedInvoice =
    preselectedInvoice || invoices.find((inv) => String(inv.id) === String(formData.invoice_id));

  useEffect(() => {
    async function loadAux() {
      try {
        const [invRes, custRes] = await Promise.all([
          invoicesAPI.list({ status: 'confirmed', page_size: 100 }),
          customersAPI.list({ page_size: 100 }),
        ]);
        setInvoices(invRes.data.results || invRes.data || []);
        setCustomers(custRes.data.results || custRes.data || []);
      } catch (err) {
        // Fallback
      }
    }
    if (!preselectedInvoice) {
      loadAux();
    }
  }, [preselectedInvoice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'invoice_id') {
      const inv = invoices.find((i) => String(i.id) === String(value));
      if (inv) {
        const due = inv.balance !== undefined ? inv.balance : inv.total_amount;
        setFormData((prev) => ({
          ...prev,
          customer_id: inv.customer?.id || inv.customer_id || '',
          amount: due,
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.invoice_id) {
      toast.error('Please select an invoice');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid positive payment amount');
      return;
    }

    setLoading(true);
    try {
      await paymentsAPI.create({
        ...formData,
        amount: amt,
      });
      toast.success('Payment recorded successfully');
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to record payment';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!preselectedInvoice && (
        <FormField label="Invoice" required>
          <select
            name="invoice_id"
            value={formData.invoice_id}
            onChange={handleChange}
            className="select-field"
            required
          >
            <option value="">Select outstanding invoice...</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number || `INV-${inv.id}`} — {inv.customer_name || 'Customer'} ({formatCurrency(inv.balance || inv.total_amount)} due)
              </option>
            ))}
          </select>
        </FormField>
      )}

      {selectedInvoice && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
          <div className="flex justify-between font-semibold text-blue-900">
            <span>Invoice: {selectedInvoice.invoice_number || `INV-${selectedInvoice.id}`}</span>
            <span>Total: {formatCurrency(selectedInvoice.total_amount)}</span>
          </div>
          <div className="flex justify-between text-blue-700">
            <span>Outstanding Balance:</span>
            <span className="font-bold">
              {formatCurrency(selectedInvoice.balance !== undefined ? selectedInvoice.balance : selectedInvoice.total_amount)}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Payment Method" required>
          <select
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            className="select-field"
            required
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Amount Paid (₹)" required>
          <input
            type="number"
            step="0.01"
            min="0.01"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            className="input-field"
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Payment Date" required>
          <input
            type="date"
            name="payment_date"
            value={formData.payment_date}
            onChange={handleChange}
            className="input-field"
            required
          />
        </FormField>

        <FormField label="Reference / Transaction ID" required>
          <input
            type="text"
            name="transaction_id"
            value={formData.transaction_id}
            onChange={handleChange}
            placeholder="e.g. UPI-99882201"
            className="input-field"
            required
          />
        </FormField>
      </div>

      <FormField label="Payment Notes">
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="2"
          placeholder="Bank confirmation remarks, gateway fee notes..."
          className="input-field resize-none"
        />
      </FormField>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-success">
          {loading ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
}
