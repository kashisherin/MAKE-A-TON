import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';
import { discountsAPI, productsAPI } from '@/api/endpoints';
import { DISCOUNT_TYPES } from '@/utils/constants';

export default function DiscountForm({ discount, onSuccess, onCancel }) {
  const isEdit = !!discount?.id;
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  const [formData, setFormData] = useState({
    name: discount?.name || '',
    code: discount?.code || '',
    type: discount?.type || 'percentage',
    value: discount?.value ?? '',
    min_purchase: discount?.min_purchase ?? 0,
    min_quantity: discount?.min_quantity ?? 1,
    start_date: discount?.start_date ? discount.start_date.split('T')[0] : '',
    end_date: discount?.end_date ? discount.end_date.split('T')[0] : '',
    usage_limit: discount?.usage_limit ?? '',
    apply_to: discount?.apply_to || 'whole_subscription',
    product_ids: discount?.products ? discount.products.map((p) => p.id || p) : [],
    is_active: discount?.is_active ?? true,
  });

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await productsAPI.list({ page_size: 100 });
        setAllProducts(res.data.results || res.data || []);
      } catch (err) {
        // Fallback
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

  const handleProductToggle = (id) => {
    setFormData((prev) => {
      const exists = prev.product_ids.includes(id);
      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((pId) => pId !== id)
          : [...prev.product_ids, id],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Discount name is required');
      return;
    }
    const val = parseFloat(formData.value);
    if (isNaN(val) || val <= 0) {
      toast.error('Discount value must be greater than zero');
      return;
    }
    if (formData.type === 'percentage' && val > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      toast.error('End date cannot precede start date');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        value: val,
        min_purchase: parseFloat(formData.min_purchase) || 0,
        min_quantity: parseInt(formData.min_quantity, 10) || 1,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit, 10) : null,
      };

      if (isEdit) {
        await discountsAPI.update(discount.id, payload);
        toast.success('Discount rule updated');
      } else {
        await discountsAPI.create(payload);
        toast.success('Discount rule created');
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save discount';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Discount Name" required>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Summer SaaSPass Incentive"
            className="input-field"
            required
          />
        </FormField>

        <FormField label="Promo Code (Optional)">
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="e.g. SUMMER25"
            className="input-field uppercase font-mono"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Discount Type" required>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="select-field"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
          </select>
        </FormField>

        <FormField label={formData.type === 'percentage' ? 'Percentage Off (%)' : 'Amount Off (₹)'} required>
          <input
            type="number"
            step="0.01"
            min="0.01"
            name="value"
            value={formData.value}
            onChange={handleChange}
            placeholder={formData.type === 'percentage' ? '20' : '500'}
            className="input-field"
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Min Purchase Amount (₹)">
          <input
            type="number"
            min="0"
            name="min_purchase"
            value={formData.min_purchase}
            onChange={handleChange}
            placeholder="0"
            className="input-field"
          />
        </FormField>

        <FormField label="Min Item Quantity">
          <input
            type="number"
            min="1"
            name="min_quantity"
            value={formData.min_quantity}
            onChange={handleChange}
            placeholder="1"
            className="input-field"
          />
        </FormField>

        <FormField label="Max Redemptions Limit">
          <input
            type="number"
            min="1"
            name="usage_limit"
            value={formData.usage_limit}
            onChange={handleChange}
            placeholder="e.g. 50 (blank for unlimited)"
            className="input-field"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Start Date">
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className="input-field"
          />
        </FormField>

        <FormField label="End Date">
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            className="input-field"
          />
        </FormField>
      </div>

      {/* Scope */}
      <FormField label="Application Scope" required>
        <select
          name="apply_to"
          value={formData.apply_to}
          onChange={handleChange}
          className="select-field"
        >
          <option value="whole_subscription">Whole Subscription Invoice</option>
          <option value="product">Specific Products Only</option>
        </select>
      </FormField>

      {formData.apply_to === 'product' && (
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
          <span className="text-xs font-semibold text-slate-700">Select eligible products:</span>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {allProducts.map((p) => {
              const checked = formData.product_ids.includes(p.id);
              return (
                <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleProductToggle(p.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                  />
                  <span>{p.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm font-medium text-slate-700">Active Promotion Rule</span>
      </label>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : isEdit ? 'Update Discount' : 'Create Discount'}
        </button>
      </div>
    </form>
  );
}
