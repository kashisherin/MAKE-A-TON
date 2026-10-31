import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineChevronRight,
  HiOutlineUserPlus,
  HiOutlinePencilSquare,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/common';
import { customersAPI } from '@/api/endpoints';

function FormField({ label, name, type = 'text', value, onChange, error, required, placeholder, disabled }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors ${
            error ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
          }`}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors ${
            error ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'
          }`}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const INITIAL_FORM_DATA = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  country: '',
};

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchCustomer = useCallback(async () => {
    if (!isEditing) return;
    setLoading(true);
    setFetchError(null);
    try {
      const response = await customersAPI.get(id);
      const c = response.data;
      setFormData({
        firstName: c.firstName || c.name?.split(' ')[0] || '',
        lastName: c.lastName || c.name?.split(' ').slice(1).join(' ') || '',
        email: c.email || '',
        phone: c.phone || '',
        company: c.company || '',
        street: c.address?.street || '',
        city: c.address?.city || '',
        state: c.address?.state || '',
        zip: c.address?.zip || c.address?.zipCode || '',
        country: c.address?.country || '',
      });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load customer details';
      setFetchError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[+\d\s()-]{7,20}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors below');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined,
        address: {
          street: formData.street.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          zip: formData.zip.trim() || undefined,
          country: formData.country.trim() || undefined,
        },
      };

      // Remove address if all fields are empty
      const addressValues = Object.values(payload.address).filter(Boolean);
      if (addressValues.length === 0) {
        delete payload.address;
      }

      if (isEditing) {
        await customersAPI.update(id, payload);
        toast.success('Customer updated successfully');
      } else {
        await customersAPI.create(payload);
        toast.success('Customer created successfully');
      }

      navigate('/admin/customers');
    } catch (err) {
      const message = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} customer`;
      toast.error(message);

      if (err.response?.data?.errors) {
        const serverErrors = {};
        const errorsData = err.response.data.errors;
        if (Array.isArray(errorsData)) {
          errorsData.forEach((e) => {
            if (e.field) serverErrors[e.field] = e.message;
          });
        } else if (typeof errorsData === 'object') {
          Object.assign(serverErrors, errorsData);
        }
        setErrors((prev) => ({ ...prev, ...serverErrors }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
        <span className="ml-3 text-slate-500">Loading customer...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <HiOutlineExclamationTriangle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-semibold text-slate-700">Failed to Load Customer</h2>
        <p className="text-slate-500">{fetchError}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/customers')}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Back to Customers
          </button>
          <button
            onClick={fetchCustomer}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb and Back */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={() => navigate('/admin/customers')}
          className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Back
        </button>
        <HiOutlineChevronRight className="w-3 h-3 text-slate-400" />
        <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/admin/customers')}>
          Customers
        </span>
        <HiOutlineChevronRight className="w-3 h-3 text-slate-400" />
        <span className="text-slate-900 font-medium">{isEditing ? 'Edit Customer' : 'New Customer'}</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center gap-3">
        {isEditing ? (
          <HiOutlinePencilSquare className="w-7 h-7 text-amber-500" />
        ) : (
          <HiOutlineUserPlus className="w-7 h-7 text-blue-500" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Edit Customer' : 'Add New Customer'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isEditing ? 'Update customer information' : 'Create a new customer account'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-200">
          {/* Personal Information */}
          <div className="p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                required
                placeholder="Enter first name"
                disabled={submitting}
              />
              <FormField
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                required
                placeholder="Enter last name"
                disabled={submitting}
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
                placeholder="customer@example.com"
                disabled={submitting}
              />
              <FormField
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                placeholder="+1 (555) 123-4567"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Company */}
          <div className="p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Company</h3>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                label="Company Name"
                name="company"
                value={formData.company}
                onChange={handleChange}
                error={errors.company}
                placeholder="Enter company name"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Address */}
          <div className="p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Address</h3>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                label="Street Address"
                name="street"
                value={formData.street}
                onChange={handleChange}
                error={errors.street}
                placeholder="123 Main Street"
                disabled={submitting}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  error={errors.city}
                  placeholder="San Francisco"
                  disabled={submitting}
                />
                <FormField
                  label="State / Province"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  error={errors.state}
                  placeholder="CA"
                  disabled={submitting}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="ZIP / Postal Code"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  error={errors.zip}
                  placeholder="94102"
                  disabled={submitting}
                />
                <FormField
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  error={errors.country}
                  placeholder="United States"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/admin/customers')}
            disabled={submitting}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
            {submitting
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
              ? 'Update Customer'
              : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
