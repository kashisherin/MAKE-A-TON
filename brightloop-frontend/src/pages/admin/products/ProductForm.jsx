import React, { useState, useEffect } from 'react';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSparkles,
  HiOutlineTag,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';
import { productsAPI } from '@/api/endpoints';
import { formatCurrency } from '@/utils/helpers';

export default function ProductForm({ product, onSuccess, onCancel }) {
  const isEdit = !!product?.id;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    code: product?.code || '',
    type: product?.type || 'service',
    sales_price: product?.sales_price ?? '',
    cost_price: product?.cost_price ?? '',
    notes: product?.notes || '',
    is_active: product?.is_active ?? true,
  });

  const [variants, setVariants] = useState(product?.variants || []);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantAdjustment, setNewVariantAdjustment] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddVariant = () => {
    if (!newVariantName.trim()) {
      toast.error('Variant name is required');
      return;
    }
    const adj = parseFloat(newVariantAdjustment) || 0;
    setVariants((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        name: newVariantName.trim(),
        price_adjustment: adj,
      },
    ]);
    setNewVariantName('');
    setNewVariantAdjustment('');
  };

  const handleAddOdooVariant = () => {
    // Explicit Odoo requirement: adds ₹560 to product price
    setVariants((prev) => [
      ...prev,
      {
        id: `temp-odoo-${Date.now()}`,
        name: 'Odoo Brand Edition',
        price_adjustment: 560,
      },
    ]);
    toast.success('Added Odoo Brand variant (+₹560)');
  };

  const handleRemoveVariant = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (formData.sales_price === '' || isNaN(Number(formData.sales_price))) {
      toast.error('Valid sales price is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        sales_price: parseFloat(formData.sales_price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
        variants: variants.map((v) => ({
          name: v.name,
          price_adjustment: parseFloat(v.price_adjustment) || 0,
        })),
      };

      if (isEdit) {
        await productsAPI.update(product.id, payload);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(payload);
        toast.success('Product created successfully');
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save product';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Product Name" required>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Enterprise Cloud Suite"
            className="input-field"
            required
          />
        </FormField>

        <FormField label="SKU / Product Code">
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="e.g. PROD-ECS-01"
            className="input-field"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Product Type" required>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="select-field"
          >
            <option value="service">Service</option>
            <option value="consumable">Consumable</option>
            <option value="digital">Digital Product</option>
          </select>
        </FormField>

        <FormField label="Sales Price (₹)" required>
          <input
            type="number"
            step="0.01"
            min="0"
            name="sales_price"
            value={formData.sales_price}
            onChange={handleChange}
            placeholder="0.00"
            className="input-field"
            required
          />
        </FormField>

        <FormField label="Cost Price (₹)">
          <input
            type="number"
            step="0.01"
            min="0"
            name="cost_price"
            value={formData.cost_price}
            onChange={handleChange}
            placeholder="0.00"
            className="input-field"
          />
        </FormField>
      </div>

      <FormField label="Description & Notes">
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          placeholder="Product specifications, service level agreements, or billing notes..."
          className="input-field resize-none"
        />
      </FormField>

      {/* Product Variants Section */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <HiOutlineTag className="w-4 h-4 text-brand-600" />
              Product Variants & Price Adjustments
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Define custom editions or the standard Odoo brand variant.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddOdooVariant}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
          >
            <HiOutlineSparkles className="w-3.5 h-3.5" />
            + Odoo Brand Variant (+₹560)
          </button>
        </div>

        {/* Existing variants */}
        {variants.length > 0 ? (
          <div className="space-y-2">
            {variants.map((v, i) => {
              const basePrice = parseFloat(formData.sales_price) || 0;
              const adj = parseFloat(v.price_adjustment) || 0;
              const effectivePrice = basePrice + adj;
              return (
                <div
                  key={v.id || i}
                  className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-800">{v.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        adj >= 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {adj >= 0 ? `+${formatCurrency(adj)}` : `-${formatCurrency(Math.abs(adj))}`}
                    </span>
                    <span className="text-xs text-slate-400">
                      (Effective: {formatCurrency(effectivePrice)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(i)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No variants added yet.</p>
        )}

        {/* Add custom variant row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-200">
          <div className="sm:col-span-6">
            <input
              type="text"
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="Variant Name (e.g. Pro, Premium, 10-User)"
              className="input-field text-xs py-1.5"
            />
          </div>
          <div className="sm:col-span-4">
            <input
              type="number"
              step="0.01"
              value={newVariantAdjustment}
              onChange={(e) => setNewVariantAdjustment(e.target.value)}
              placeholder="Adjustment (e.g. 560 or -100)"
              className="input-field text-xs py-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleAddVariant}
              className="btn-secondary btn-sm w-full h-full text-xs"
            >
              <HiOutlinePlus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
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
          <span className="text-sm font-medium text-slate-700">Active Product</span>
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
            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </form>
  );
}
