import React, { useState, useEffect } from 'react';
import {
  HiOutlineRectangleStack,
  HiOutlineCalendarDays,
  HiOutlineCheck,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';
import { plansAPI, productsAPI } from '@/api/endpoints';
import { BILLING_FREQUENCIES } from '@/utils/constants';

export default function PlanForm({ plan, onSuccess, onCancel }) {
  const isEdit = !!plan?.id;
  const [loading, setLoading] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);

  const [formData, setFormData] = useState({
    name: plan?.name || '',
    price: plan?.price ?? '',
    billing_frequency: plan?.billing_frequency || 'monthly',
    min_quantity: plan?.min_quantity || 1,
    start_date: plan?.start_date ? plan.start_date.split('T')[0] : '',
    end_date: plan?.end_date ? plan.end_date.split('T')[0] : '',
    auto_close: plan?.auto_close ?? false,
    auto_close_days: plan?.auto_close_days || 30,
    allow_early_closure: plan?.allow_early_closure ?? true,
    allow_pause: plan?.allow_pause ?? true,
    allow_renewal: plan?.allow_renewal ?? true,
    is_active: plan?.is_active ?? true,
    product_ids: plan?.products ? plan.products.map((p) => p.id || p) : [],
  });

  useEffect(() => {
    // Load products list for association
    async function loadProducts() {
      try {
        const res = await productsAPI.list({ page_size: 100 });
        const list = res.data.results || res.data || [];
        setAvailableProducts(list);
      } catch (err) {
        // Fallback placeholder
      }
    }
    loadProducts();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleProductToggle = (productId) => {
    setFormData((prev) => {
      const exists = prev.product_ids.includes(productId);
      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((id) => id !== productId)
          : [...prev.product_ids, productId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (formData.price === '' || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      toast.error('Valid positive price is required');
      return;
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      toast.error('End date cannot be earlier than start date');
      return;
    }
    if (formData.product_ids.length === 0) {
      toast.error('Please associate at least one product with this plan');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        min_quantity: parseInt(formData.min_quantity, 10) || 1,
        auto_close_days: formData.auto_close ? parseInt(formData.auto_close_days, 10) || 30 : null,
      };

      if (isEdit) {
        await plansAPI.update(plan.id, payload);
        toast.success('Subscription plan updated');
      } else {
        await plansAPI.create(payload);
        toast.success('Subscription plan created');
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save plan';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <FormField label="Plan Name" required>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Professional Monthly Tier"
              className="input-field"
              required
            />
          </FormField>
        </div>

        <FormField label="Billing Frequency" required>
          <select
            name="billing_frequency"
            value={formData.billing_frequency}
            onChange={handleChange}
            className="select-field capitalize"
          >
            {BILLING_FREQUENCIES.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Recurring Price (₹)" required>
          <input
            type="number"
            step="0.01"
            min="0"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="0.00"
            className="input-field"
            required
          />
        </FormField>

        <FormField label="Minimum Quantity" required>
          <input
            type="number"
            min="1"
            name="min_quantity"
            value={formData.min_quantity}
            onChange={handleChange}
            className="input-field"
            required
          />
        </FormField>
      </div>

      {/* Associated Products */}
      <div>
        <label className="label">
          Associated Products <span className="text-red-500">*</span>
        </label>
        <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50 scrollbar-thin">
          {availableProducts.length > 0 ? (
            availableProducts.map((p) => {
              const selected = formData.product_ids.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handleProductToggle(p.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                    selected
                      ? 'bg-brand-50 border-brand-300 text-brand-900'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selected
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selected && <HiOutlineCheck className="w-3 h-3 stroke-2" />}
                    </div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-slate-400 capitalize">({p.type || 'Service'})</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">₹{p.sales_price}</span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-500">No active products found. Please add products first.</p>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Select which catalog items are included in this recurring package.
        </p>
      </div>

      {/* Availability Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Availability Start Date">
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className="input-field"
          />
        </FormField>

        <FormField label="Availability End Date">
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            className="input-field"
          />
        </FormField>
      </div>

      {/* Lifecycle Rules & Permissions */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Subscription Lifecycle & Permissions
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              name="allow_pause"
              checked={formData.allow_pause}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-medium text-slate-700">Allow Pause</span>
          </label>

          <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              name="allow_renewal"
              checked={formData.allow_renewal}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-medium text-slate-700">Allow Renewal</span>
          </label>

          <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              name="allow_early_closure"
              checked={formData.allow_early_closure}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-medium text-slate-700">Allow Early Close</span>
          </label>
        </div>

        {/* Auto closure */}
        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="auto_close"
              checked={formData.auto_close}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-medium text-slate-700">Auto-close subscription after term</span>
          </label>

          {formData.auto_close && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Duration:</span>
              <input
                type="number"
                min="1"
                name="auto_close_days"
                value={formData.auto_close_days}
                onChange={handleChange}
                className="input-field text-xs py-1 w-20"
              />
              <span className="text-xs text-slate-500">days</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-slate-700">Active Plan</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Plan' : 'Create Plan'}
          </button>
        </div>
      </div>
    </form>
  );
}
