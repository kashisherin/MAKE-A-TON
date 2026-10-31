import React, { useState } from 'react';
import {
  HiOutlineCog6Tooth,
  HiOutlineBuildingOffice2,
  HiOutlineCreditCard,
  HiOutlineBell,
  HiOutlineKey,
  HiOutlineCheck,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const [generalSettings, setGeneralSettings] = useState({
    company_name: 'Brightloop SaaS Control Tower',
    billing_email: 'billing@brightloop.io',
    currency: 'INR (₹)',
    timezone: 'Asia/Kolkata (IST)',
    gstin: '29ABCDE1234F1Z5',
  });

  const [billingSettings, setBillingSettings] = useState({
    default_terms: 'net_30',
    invoice_prefix: 'INV-',
    auto_billing_enabled: true,
    billing_day_of_month: 1,
    retry_failed_invoices: true,
  });

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Configuration saved successfully');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Billing Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure corporate entity profiles, automated invoice sequencing, and notification triggers.
        </p>
      </div>

      <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'general' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          General & Organization
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'billing' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Billing Automation
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'api' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          API & Webhooks
        </button>
      </div>

      {activeTab === 'general' && (
        <form onSubmit={handleSave} className="card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Legal Company Name" required>
              <input
                type="text"
                value={generalSettings.company_name}
                onChange={(e) => setGeneralSettings((prev) => ({ ...prev, company_name: e.target.value }))}
                className="input-field"
              />
            </FormField>

            <FormField label="Official Billing Email" required>
              <input
                type="email"
                value={generalSettings.billing_email}
                onChange={(e) => setGeneralSettings((prev) => ({ ...prev, billing_email: e.target.value }))}
                className="input-field"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Default Currency">
              <input
                type="text"
                disabled
                value={generalSettings.currency}
                className="input-field bg-slate-50 text-slate-500"
              />
            </FormField>

            <FormField label="Operating Timezone">
              <input
                type="text"
                value={generalSettings.timezone}
                onChange={(e) => setGeneralSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                className="input-field"
              />
            </FormField>

            <FormField label="GSTIN / Corporate Tax ID">
              <input
                type="text"
                value={generalSettings.gstin}
                onChange={(e) => setGeneralSettings((prev) => ({ ...prev, gstin: e.target.value }))}
                className="input-field font-mono"
              />
            </FormField>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button type="submit" className="btn-primary">
              Save Organization Settings
            </button>
          </div>
        </form>
      )}

      {activeTab === 'billing' && (
        <form onSubmit={handleSave} className="card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Default Payment Terms">
              <select
                value={billingSettings.default_terms}
                onChange={(e) => setBillingSettings((prev) => ({ ...prev, default_terms: e.target.value }))}
                className="select-field"
              >
                <option value="immediate">Immediate</option>
                <option value="net_15">Net 15 Days</option>
                <option value="net_30">Net 30 Days</option>
              </select>
            </FormField>

            <FormField label="Invoice Sequence Prefix">
              <input
                type="text"
                value={billingSettings.invoice_prefix}
                onChange={(e) => setBillingSettings((prev) => ({ ...prev, invoice_prefix: e.target.value }))}
                className="input-field font-mono"
              />
            </FormField>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={billingSettings.auto_billing_enabled}
                onChange={(e) => setBillingSettings((prev) => ({ ...prev, auto_billing_enabled: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-slate-800">
                Enable Automated Background Billing Scheduler (Celery / Redis)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={billingSettings.retry_failed_invoices}
                onChange={(e) => setBillingSettings((prev) => ({ ...prev, retry_failed_invoices: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-slate-800">
                Automated Retry on Renewal Payment Failures
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button type="submit" className="btn-primary">
              Save Billing Rules
            </button>
          </div>
        </form>
      )}

      {activeTab === 'api' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Enterprise Webhook Secret Key</h3>
              <p className="text-xs text-slate-500">Authenticate external payment webhooks and ERP connectors.</p>
            </div>
            <button onClick={() => toast.success('API Key Copied')} className="btn-secondary btn-sm">
              Copy Key
            </button>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-700">
            bl_live_sec_9942857182947192837194
          </div>
        </div>
      )}
    </div>
  );
}
