import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';
import { flexiBillAPI } from '@/api/endpoints';
import { ACCESS_TYPES } from '@/utils/constants';

export default function AccessProductForm({ product, onSuccess, onCancel }) {
  const isEdit = !!product?.id;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    access_type: product?.access_type || 'time_based',
    price: product?.price ?? '',
    duration_minutes: product?.duration_minutes ?? 60,
    usage_limit: product?.usage_limit ?? 10,
    feature_key: product?.feature_key || '',
    description: product?.description || '',
    is_active: product?.is_active ?? true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    const p = parseFloat(formData.price);
    if (isNaN(p) || p <= 0) {
      toast.error('Valid price is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        price: p,
        duration_minutes: parseInt(formData.duration_minutes, 10) || null,
        usage_limit: parseInt(formData.usage_limit, 10) || null,
      };

      if (isEdit) {
        await flexiBillAPI.updateAccessProduct(product.id, payload);
        toast.success('Access product updated');
      } else {
        await flexiBillAPI.createAccessProduct(payload);
        toast.success('Access product created');
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save access product';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Access Package Name" required>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. 1-Hour Cloud Burst Pass"
            className="input-field"
            required
          />
        </FormField>

        <FormField label="Purchasing Model" required>
          <select
            name="access_type"
            value={formData.access_type}
            onChange={handleChange}
            className="select-field"
          >
            {ACCESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Price (₹)" required>
          <input
            type="number"
            step="0.01"
            min="0"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="e.g. 15.00"
            className="input-field"
            required
          />
        </FormField>

        {formData.access_type === 'time_based' && (
          <FormField label="Duration (Minutes)" required>
            <input
              type="number"
              min="1"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              placeholder="e.g. 5, 60, 1440"
              className="input-field"
              required
            />
          </FormField>
        )}

        {formData.access_type === 'usage_based' && (
          <FormField label="Operation / Usage Count" required>
            <input
              type="number"
              min="1"
              name="usage_limit"
              value={formData.usage_limit}
              onChange={handleChange}
              placeholder="e.g. 5, 10, 50"
              className="input-field"
              required
            />
          </FormField>
        )}

        {formData.access_type === 'feature_based' && (
          <FormField label="Feature Entitlement Key" required>
            <input
              type="text"
              name="feature_key"
              value={formData.feature_key}
              onChange={handleChange}
              placeholder="e.g. ADVANCED_EXPORTS"
              className="input-field font-mono"
              required
            />
          </FormField>
        )}
      </div>

      <FormField label="Product Description">
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="2"
          placeholder="Service parameters, token rates, SLA..."
          className="input-field resize-none"
        />
      </FormField>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm font-medium text-slate-700">Active in Flexi Store</span>
      </label>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : isEdit ? 'Update Package' : 'Create Package'}
        </button>
      </div>
    </form>
  );
}
