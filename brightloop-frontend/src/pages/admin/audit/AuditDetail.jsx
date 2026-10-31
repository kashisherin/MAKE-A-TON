import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineShieldCheck } from 'react-icons/hi2';

export default function AuditDetail() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link
        to="/admin/audit"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Audit Trail
      </Link>
      <div className="card p-6">
        <h1 className="text-xl font-bold text-slate-900">Audit Entry Inspection</h1>
        <p className="text-xs text-slate-500 mt-1">Detailed state diff and authorization signature.</p>
      </div>
    </div>
  );
}
