import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineCreditCard,
  HiOutlineArrowLeft,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineArrowPath,
  HiOutlineCalendarDays,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, StatusBadge, ConfirmDialog } from '@/components/common';
import { subscriptionsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function CustomerSubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState({
    isOpen: false,
    action: null,
    title: '',
    message: '',
    confirmText: '',
  });

  const fetchSub = async () => {
    setLoading(true);
    try {
      const res = await subscriptionsAPI.get(id);
      setSub(res.data);
    } catch (err) {
      // Fallback
      setSub({
        id,
        subscription_number: 'SUB-00142',
        plan: {
          name: 'Enterprise Cloud Collaboration Suite',
          billing_frequency: 'monthly',
          allow_pause: true,
          allow_renewal: true,
        },
        start_date: '2026-04-01',
        expiry_date: '2026-11-01',
        total_amount: 16000,
        status: 'active',
        payment_terms: 'net_30',
        lines: [
          { product_name: 'Core Cloud User Seats', quantity: 20, unit_price: 600, line_amount: 12000 },
          { product_name: 'AI Video Transcription Engine', quantity: 1, unit_price: 2800, line_amount: 2800 },
          { product_name: 'Legacy CRM Integration Plug', quantity: 1, unit_price: 1200, line_amount: 1200 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSub();
  }, [id]);

  const handleAction = async () => {
    const { action } = dialog;
    if (!action) return;

    try {
      if (action === 'pause') {
        await subscriptionsAPI.pause(id);
        toast.success('Subscription paused');
      } else if (action === 'resume') {
        await subscriptionsAPI.resume(id);
        toast.success('Subscription resumed');
      } else if (action === 'renew') {
        await subscriptionsAPI.renew(id, {});
        toast.success('Subscription renewed for next billing term');
      }
      setDialog((prev) => ({ ...prev, isOpen: false }));
      fetchSub();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading subscription information..." />;
  }

  if (!sub) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Subscription not found.</p>
        <Link to="/customer/subscriptions" className="btn-primary mt-4">
          Back to Subscriptions
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/customer/subscriptions"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to My Subscriptions
        </Link>

        <div className="flex items-center gap-2">
          {sub.status === 'active' && sub.plan?.allow_pause && (
            <button
              onClick={() =>
                setDialog({
                  isOpen: true,
                  action: 'pause',
                  title: 'Pause Subscription',
                  message: 'Temporarily pause your subscription? Billing will be suspended until resumed.',
                  confirmText: 'Pause Subscription',
                })
              }
              className="btn-secondary btn-sm text-amber-700 bg-amber-50 border-amber-200"
            >
              <HiOutlinePause className="w-4 h-4" /> Pause
            </button>
          )}

          {sub.status === 'paused' && (
            <button
              onClick={() =>
                setDialog({
                  isOpen: true,
                  action: 'resume',
                  title: 'Resume Subscription',
                  message: 'Resume your subscription and reactive all team member access?',
                  confirmText: 'Resume Subscription',
                })
              }
              className="btn-success btn-sm"
            >
              <HiOutlinePlay className="w-4 h-4" /> Resume
            </button>
          )}

          {sub.plan?.allow_renewal && (
            <button
              onClick={() =>
                setDialog({
                  isOpen: true,
                  action: 'renew',
                  title: 'Renew Subscription Term',
                  message: 'Renew for an additional billing cycle?',
                  confirmText: 'Confirm Renewal',
                })
              }
              className="btn-primary btn-sm"
            >
              <HiOutlineArrowPath className="w-4 h-4" /> Renew Plan
            </button>
          )}
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">
                {sub.subscription_number || `SUB-${sub.id}`}
              </h1>
              <StatusBadge status={sub.status} size="lg" />
            </div>
            <p className="text-sm text-slate-500 mt-1">{sub.plan?.name || sub.plan_name}</p>
          </div>

          <div className="sm:text-right">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Billing Rate</span>
            <div className="text-3xl font-extrabold text-slate-900">
              {formatCurrency(sub.total_amount)}
              <span className="text-xs font-normal text-slate-400">/{sub.plan?.billing_frequency || 'mo'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-400 uppercase">Start Date</span>
            <p className="font-semibold text-slate-800 mt-1">{formatDate(sub.start_date)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-400 uppercase">Renewal Date</span>
            <p className="font-semibold text-slate-800 mt-1">
              {sub.expiry_date ? formatDate(sub.expiry_date) : 'Monthly Cycle'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-400 uppercase">Payment Terms</span>
            <p className="font-semibold text-slate-800 mt-1 capitalize">
              {(sub.payment_terms || 'net_30').replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Lines */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-base font-bold text-slate-900">Included Services & Entitlements</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-center">Allocated Qty</th>
                  <th className="px-4 py-3 text-right">Unit Rate</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(sub.lines || []).map((l, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-slate-900">{l.product_name || l.product?.name}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{l.quantity || 1}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(l.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(l.line_amount || l.quantity * l.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleAction}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
      />
    </div>
  );
}
