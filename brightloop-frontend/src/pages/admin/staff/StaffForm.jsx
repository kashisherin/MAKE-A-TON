import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';
import { usersAPI } from '@/api/endpoints';
import { validatePassword } from '@/utils/helpers';

export default function StaffForm({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'staff',
  });

  const [passwordValidation, setPasswordValidation] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setPasswordValidation(validatePassword(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    const val = validatePassword(formData.password);
    if (!val.isValid) {
      toast.error(val.errors[0] || 'Password does not meet requirements');
      return;
    }

    setLoading(true);
    try {
      await usersAPI.create(formData);
      toast.success('Internal staff member created successfully');
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to create staff member';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First Name" required>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="John"
            className="input-field"
            required
          />
        </FormField>
        <FormField label="Last Name" required>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Doe"
            className="input-field"
            required
          />
        </FormField>
      </div>

      <FormField label="Work Email Address" required>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="staff@brightloop.io"
          className="input-field"
          required
        />
      </FormField>

      <FormField label="Initial Temporary Password" required>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••••••"
          className="input-field"
          required
        />
      </FormField>

      {/* Password criteria checklist */}
      {formData.password && passwordValidation && (
        <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
          <p className="font-semibold text-slate-700">Password Requirements:</p>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <span className={formData.password.length > 8 ? 'text-emerald-600' : 'text-slate-400'}>
              ✓ Longer than 8 characters
            </span>
            <span className={/[A-Z]/.test(formData.password) ? 'text-emerald-600' : 'text-slate-400'}>
              ✓ Uppercase letter
            </span>
            <span className={/[a-z]/.test(formData.password) ? 'text-emerald-600' : 'text-slate-400'}>
              ✓ Lowercase letter
            </span>
            <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-emerald-600' : 'text-slate-400'}>
              ✓ Special character
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create Staff Account'}
        </button>
      </div>
    </form>
  );
}
