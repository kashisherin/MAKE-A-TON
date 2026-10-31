import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineExclamationTriangle, HiOutlineHome } from 'react-icons/hi2';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
        <HiOutlineExclamationTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-md mt-2">
        The destination you requested does not exist or requires higher role authorization.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link to="/login" className="btn-secondary">
          Login Screen
        </Link>
        <Link to="/admin/dashboard" className="btn-primary">
          <HiOutlineHome className="w-4 h-4" /> Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
