import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';
import { taxesAPI } from '@/api/endpoints';

export default function TaxForm({ tax, onSuccess, onCancel }) {
  const isEdit = !!tax?.id;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: tax?.name || '',
    rate: tax?.rate ?? '',
    tax_type: tax?.tax_type || 'exclusive',
    description: tax?.description || '',
    is_active: tax?.is_active ?? true,
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
      toast.error('Tax name is required');
      return;
    }
    const r = parseFloat(formData.rate);
    if (isNaN(r) || r < 0 || r > 100) {
      toast.error('Tax rate must be between 0% and 100%');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        rate: r,
      };
      if (isEdit) {
        await taxesAPI.update(tax.id, payload);
        toast.success('Tax rule updated');
      } else {
        await taxesAPI.create(payload);
        toast.success('Tax rule created');
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save tax rule';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Tax Name" required>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. GST (18%)"
          className="input-field"
          required
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Rate (%)" required>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            name="rate"
            value={formData.rate}
            onChange={handleChange}
            placeholder="18.00"
            className="input-field"
            required
          />
        </FormField>

        <FormField label="Calculation Mode" required>
          <select
            name="tax_type"
            value={formData.tax_type}
            onChange={handleChange}
            className="select-field"
          >
            <option value="exclusive">Exclusive (Added to Subtotal)</option>
            <option value="inclusive">Inclusive (Included in Price)</option>
          </select>
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="2"
          placeholder="Statutory citation, applicability notes..."
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
        <span className="text-sm font-medium text-slate-700">Active Rule</span>
      </label>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </form>
  );
}
