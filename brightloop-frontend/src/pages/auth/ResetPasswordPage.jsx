import React, { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { validatePassword } from '@/utils/helpers';
import toast from 'react-hot-toast';
import api from '@/api/client';
import {
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArrowLeft,
  HiOutlineRocketLaunch,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';

const PASSWORD_REQUIREMENTS = [
  { key: 'minLength', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lowercase', label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { key: 'special', label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});

  const passwordChecks = useMemo(
    () =>
      PASSWORD_REQUIREMENTS.map((req) => ({
        ...req,
        passed: req.test(form.password),
      })),
    [form.password]
  );

  const allPasswordChecksPassed = passwordChecks.every((c) => c.passed);
  const passwordsMatch =
    form.password === form.confirmPassword && form.confirmPassword.length > 0;

  const canSubmit = allPasswordChecksPassed && passwordsMatch && token;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const inputClass = (fieldName, isInvalid) =>
    `w-full rounded-lg border bg-white/[0.06] py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 ${
      touched[fieldName] && isInvalid
        ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
        : 'border-white/10 focus:border-blue-500 focus:ring-blue-500/30'
    }`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });

    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', {
        token,
        password: form.password,
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to reset password. The link may have expired.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* ── No token provided ── */
  if (!token && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#7c3aed] px-4 py-12">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
              <svg
                className="h-8 w-8 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">Invalid reset link</h2>
            <p className="mb-6 text-sm text-slate-400">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400"
            >
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#7c3aed] px-4 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/30">
            <HiOutlineRocketLaunch className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Brightloop</h1>
          <p className="mt-1 text-sm text-slate-400">Subscription Control Tower</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          {success ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <HiOutlineShieldCheck className="h-9 w-9 text-emerald-400" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white">Password reset!</h2>
              <p className="mb-6 text-sm text-slate-400">
                Your password has been successfully updated. You can now sign in with your new
                password.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
              >
                <HiOutlineArrowLeft className="h-4 w-4" />
                Sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h2 className="mb-1 text-xl font-semibold text-white">Reset your password</h2>
              <p className="mb-6 text-sm text-slate-400">
                Enter a new password for your account
              </p>

              {/* Error Banner */}
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <HiOutlineLockClosed className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="••••••••"
                      className={`${inputClass('password', !allPasswordChecksPassed)} pl-11 pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <HiOutlineEyeSlash className="h-5 w-5" />
                      ) : (
                        <HiOutlineEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Password requirements checklist */}
                  {(form.password || touched.password) && (
                    <ul className="mt-3 space-y-1.5">
                      {passwordChecks.map((check) => (
                        <li
                          key={check.key}
                          className={`flex items-center gap-2 text-xs transition-colors ${
                            check.passed ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {check.passed ? (
                            <HiOutlineCheckCircle className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <HiOutlineXCircle className="h-4 w-4 flex-shrink-0" />
                          )}
                          {check.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Confirm new password
                  </label>
                  <div className="relative">
                    <HiOutlineLockClosed className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="••••••••"
                      className={`${inputClass(
                        'confirmPassword',
                        form.confirmPassword && !passwordsMatch
                      )} pl-11 pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? (
                        <HiOutlineEyeSlash className="h-5 w-5" />
                      ) : (
                        <HiOutlineEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {touched.confirmPassword && form.confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                  )}
                  {touched.confirmPassword && form.confirmPassword && passwordsMatch && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                      <HiOutlineCheckCircle className="h-3.5 w-3.5" />
                      Passwords match
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Resetting…
                    </>
                  ) : (
                    <>
                      <HiOutlineShieldCheck className="h-4 w-4" />
                      Reset password
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <HiOutlineArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Brightloop Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
