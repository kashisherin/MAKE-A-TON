import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineCreditCard,
  HiOutlineArrowLeft,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineUser,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import {
  LoadingSpinner,
  StatusBadge,
  ConfirmDialog,
  DataTable,
} from '@/components/common';
import { subscriptionsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

const LIFECYCLE_STAGES = ['draft', 'quotation', 'confirmed', 'active', 'closed'];

export default function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal dialogs
  const [dialog, setDialog] = useState({
    isOpen: false,
    action: null,
    title: '',
    message: '',
    confirmText: '',
    isDanger: false,
  });

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const [subRes, histRes] = await Promise.all([
        subscriptionsAPI.get(id),
        subscriptionsAPI.getHistory(id).catch(() => ({ data: [] })),
      ]);
      setSubscription(subRes.data);
      setHistory(histRes.data || []);
    } catch (err) {
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const openActionDialog = (action, title, message, confirmText, isDanger = false) => {
    setDialog({
      isOpen: true,
      action,
      title,
      message,
      confirmText,
      isDanger,
    });
  };

  const handleConfirmAction = async () => {
    const { action } = dialog;
    if (!action) return;

    try {
      if (action === 'confirm') {
        await subscriptionsAPI.confirm(id);
        toast.success('Subscription confirmed');
      } else if (action === 'activate') {
        await subscriptionsAPI.activate(id);
        toast.success('Subscription activated! Billing active.');
      } else if (action === 'pause') {
        await subscriptionsAPI.pause(id);
        toast.success('Subscription paused');
      } else if (action === 'resume') {
        await subscriptionsAPI.resume(id);
        toast.success('Subscription resumed');
      } else if (action === 'renew') {
        await subscriptionsAPI.renew(id, {});
        toast.success('Subscription renewed for next term');
      } else if (action === 'close') {
        await subscriptionsAPI.close(id, { reason: 'Closed by administrator' });
        toast.success('Subscription closed');
      }
      setDialog((prev) => ({ ...prev, isOpen: false }));
      fetchSubscription();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Action failed';
      toast.error(msg);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading subscription control tower data..." />;
  }

  if (!subscription) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Subscription not found.</p>
        <Link to="/admin/subscriptions" className="btn-primary mt-4">
          Back to Subscriptions
        </Link>
      </div>
    );
  }

  const currentStatus = subscription.status?.toLowerCase() || 'draft';
  const currentStageIndex = LIFECYCLE_STAGES.indexOf(currentStatus);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/admin/subscriptions"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Subscriptions
        </Link>

        {/* Dynamic Context Actions */}
        <div className="flex items-center gap-2.5">
          {currentStatus === 'draft' && (
            <button
              onClick={() =>
                openActionDialog(
                  'confirm',
                  'Confirm Subscription',
                  'Transition this draft into Confirmed status before activating billing?',
                  'Confirm Subscription'
                )
              }
              className="btn-primary btn-sm"
            >
              <HiOutlineCheckCircle className="w-4 h-4" /> Confirm Subscription
            </button>
          )}

          {currentStatus === 'confirmed' && (
            <button
              onClick={() =>
                openActionDialog(
                  'activate',
                  'Activate Subscription',
                  'Activate subscription and begin recurring billing schedule?',
                  'Activate Now'
                )
              }
              className="btn-success btn-sm"
            >
              <HiOutlinePlay className="w-4 h-4" /> Activate Subscription
            </button>
          )}

          {currentStatus === 'active' && (
            <>
              {subscription.plan?.allow_pause !== false && (
                <button
                  onClick={() =>
                    openActionDialog(
                      'pause',
                      'Pause Subscription',
                      'Temporarily halt billing cycles and feature entitlements?',
                      'Pause Subscription'
                    )
                  }
                  className="btn-secondary btn-sm text-amber-700 bg-amber-50 border-amber-200"
                >
                  <HiOutlinePause className="w-4 h-4" /> Pause
                </button>
              )}

              {subscription.plan?.allow_renewal !== false && (
                <button
                  onClick={() =>
                    openActionDialog(
                      'renew',
                      'Renew Subscription Term',
                      'Extend subscription term by an additional billing period?',
                      'Renew Now'
                    )
                  }
                  className="btn-secondary btn-sm text-brand-700 bg-brand-50 border-brand-200"
                >
                  <HiOutlineArrowPath className="w-4 h-4" /> Renew
                </button>
              )}

              {subscription.plan?.allow_early_closure !== false && (
                <button
                  onClick={() =>
                    openActionDialog(
                      'close',
                      'Close Subscription Early',
                      'Immediately terminate subscription and halt future automated invoices?',
                      'Close Subscription',
                      true
                    )
                  }
                  className="btn-danger btn-sm"
                >
                  <HiOutlineXCircle className="w-4 h-4" /> Close Subscription
                </button>
              )}
            </>
          )}

          {currentStatus === 'paused' && (
            <button
              onClick={() =>
                openActionDialog(
                  'resume',
                  'Resume Subscription',
                  'Resume regular billing cycles and reactive user entitlements?',
                  'Resume Subscription'
                )
              }
              className="btn-success btn-sm"
            >
              <HiOutlinePlay className="w-4 h-4" /> Resume Subscription
            </button>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-2xl shadow-sm">
              <HiOutlineCreditCard className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 font-mono">
                  {subscription.subscription_number || `SUB-${String(subscription.id).padStart(5, '0')}`}
                </h1>
                <StatusBadge status={subscription.status} size="lg" showDot pulse={currentStatus === 'active'} />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Customer: <span className="font-semibold text-slate-800">{subscription.customer?.name || subscription.customer_name}</span> • Plan: <span className="font-semibold text-slate-800">{subscription.plan?.name || subscription.plan_name}</span>
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Recurring Amount</span>
            <div className="text-3xl font-extrabold text-brand-600">
              {formatCurrency(subscription.total_amount)}
              <span className="text-xs font-normal text-slate-400">/{subscription.plan?.billing_frequency || 'cycle'}</span>
            </div>
          </div>
        </div>

        {/* Lifecycle Stage Progress Bar */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Exact Lifecycle Progress: Draft → Quotation → Confirmed → Active → Closed
          </h4>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={stage} className="flex flex-col items-center">
                  <div
                    className={`w-full py-1.5 rounded-lg font-semibold capitalize border transition-all ${
                      isCurrent
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : isPast
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {isPast && '✓ '}
                    {stage}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm pt-2">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 uppercase font-semibold">Start Date</span>
            <p className="font-medium text-slate-800 mt-1">{formatDate(subscription.start_date)}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 uppercase font-semibold">Expiry Date</span>
            <p className="font-medium text-slate-800 mt-1">
              {subscription.expiry_date ? formatDate(subscription.expiry_date) : 'Open Ended'}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 uppercase font-semibold">Payment Terms</span>
            <p className="font-medium text-slate-800 mt-1 capitalize">
              {(subscription.payment_terms || 'net_30').replace('_', ' ')}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 uppercase font-semibold">Next Invoice Run</span>
            <p className="font-medium text-slate-800 mt-1">
              {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'Due on Cycle'}
            </p>
          </div>
        </div>

        {/* Subscription Lines Table */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HiOutlineCube className="w-5 h-5 text-brand-600" />
            Configured Subscription Lines
          </h3>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Product / Service</th>
                  <th className="px-4 py-3 text-center">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Tax Rate</th>
                  <th className="px-4 py-3 text-right">Line Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {subscription.lines && subscription.lines.length > 0 ? (
                  subscription.lines.map((l, idx) => (
                    <tr key={l.id || idx}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {l.product?.name || l.product_name || 'Standard Service Package'}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">{l.quantity || 1}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(l.unit_price)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {l.tax_rate ? `${l.tax_rate}%` : '0%'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(l.line_amount || l.quantity * l.unit_price)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-slate-400">
                      No line items recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoices Generated for this subscription */}
        {subscription.invoices && subscription.invoices.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HiOutlineDocumentText className="w-5 h-5 text-indigo-600" />
              Invoices Generated
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Invoice #</th>
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {subscription.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">
                        {inv.invoice_number || `INV-${inv.id}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(inv.date || inv.created_at)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/invoices/${inv.id}`}
                          className="text-brand-600 hover:text-brand-800 text-xs font-semibold"
                        >
                          View Invoice →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscription History Audit Log */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HiOutlineClock className="w-5 h-5 text-slate-600" />
            Subscription Lifecycle History
          </h3>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            {history.length > 0 ? (
              history.map((h, i) => (
                <div key={h.id || i} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    <span className="font-semibold text-slate-800 capitalize">{h.action || h.event}</span>
                    <span className="text-slate-500">by {h.user || 'System Automation'}</span>
                  </div>
                  <span className="text-slate-400">{formatDate(h.timestamp || new Date())}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No historical transitions recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        isDanger={dialog.isDanger}
      />
    </div>
  );
}
