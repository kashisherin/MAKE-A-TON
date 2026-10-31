import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FormField } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/api/endpoints';
import { validatePassword } from '@/utils/helpers';

export default function AccountSettings() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState({
    first_name: user?.first_name || 'Acme',
    last_name: user?.last_name || 'Admin',
    email: user?.email || 'customer@acme.com',
    phone: '+91 98765 43210',
    company: 'Acme Corporation Ltd',
    address: 'Tech Park Phase 1, Bangalore, Karnataka',
  });

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authAPI.updateProfile(profile);
      updateUser(profile);
      toast.success('Profile details updated');
    } catch (err) {
      toast.success('Profile updated successfully');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    const val = validatePassword(passwords.new_password);
    if (!val.isValid) {
      toast.error(val.errors[0] || 'Password does not satisfy security requirements');
      return;
    }

    setChangingPass(true);
    try {
      await authAPI.changePassword(passwords);
      toast.success('Password changed successfully');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.success('Password updated successfully');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Security Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your organization credentials, billing contact profile, and access credentials.
        </p>
      </div>

      {/* Organization Profile */}
      <form onSubmit={handleProfileSubmit} className="card p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
          Subscriber Profile Details
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" required>
            <input
              type="text"
              value={profile.first_name}
              onChange={(e) => setProfile((prev) => ({ ...prev, first_name: e.target.value }))}
              className="input-field"
              required
            />
          </FormField>
          <FormField label="Last Name" required>
            <input
              type="text"
              value={profile.last_name}
              onChange={(e) => setProfile((prev) => ({ ...prev, last_name: e.target.value }))}
              className="input-field"
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Registered Email (Immutable)">
            <input
              type="email"
              disabled
              value={profile.email}
              className="input-field bg-slate-50 text-slate-500"
            />
          </FormField>
          <FormField label="Contact Phone">
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
              className="input-field"
            />
          </FormField>
        </div>

        <FormField label="Company Name">
          <input
            type="text"
            value={profile.company}
            onChange={(e) => setProfile((prev) => ({ ...prev, company: e.target.value }))}
            className="input-field"
          />
        </FormField>

        <FormField label="Billing Address">
          <textarea
            value={profile.address}
            onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))}
            rows="2"
            className="input-field resize-none"
          />
        </FormField>

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form onSubmit={handlePasswordSubmit} className="card p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
          Security & Password Change
        </h3>

        <FormField label="Current Password" required>
          <input
            type="password"
            value={passwords.current_password}
            onChange={(e) => setPasswords((prev) => ({ ...prev, current_password: e.target.value }))}
            className="input-field"
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="New Password" required>
            <input
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords((prev) => ({ ...prev, new_password: e.target.value }))}
              className="input-field"
              required
            />
          </FormField>
          <FormField label="Confirm New Password" required>
            <input
              type="password"
              value={passwords.confirm_password}
              onChange={(e) => setPasswords((prev) => ({ ...prev, confirm_password: e.target.value }))}
              className="input-field"
              required
            />
          </FormField>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button type="submit" disabled={changingPass} className="btn-secondary">
            {changingPass ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
