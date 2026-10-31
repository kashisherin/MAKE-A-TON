import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineCreditCard,
  HiOutlinePlus,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineEye,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import {
  DataTable,
  Pagination,
  SearchInput,
  FilterBar,
  StatusBadge,
  ConfirmDialog,
} from '@/components/common';
import { subscriptionsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Quotation', value: 'quotation' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
];

export default function SubscriptionList() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Action dialogs
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    action: null,
    sub: null,
    title: '',
    message: '',
    confirmText: '',
    isDanger: false,
  });

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      };
      const response = await subscriptionsAPI.list(params);
      const data = response.data;
      if (data.results) {
        setSubscriptions(data.results);
        setTotalCount(data.count || data.results.length);
      } else if (Array.isArray(data)) {
        setSubscriptions(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const triggerAction = (sub, action, title, message, confirmText, isDanger = false, e) => {
    e?.stopPropagation();
    setDialogState({
      isOpen: true,
      sub,
      action,
      title,
      message,
      confirmText,
      isDanger,
    });
  };

  const handleConfirmAction = async () => {
    const { sub, action } = dialogState;
    if (!sub || !action) return;

    try {
      if (action === 'confirm') {
        await subscriptionsAPI.confirm(sub.id);
        toast.success(`Subscription ${sub.subscription_number || sub.id} confirmed`);
      } else if (action === 'activate') {
        await subscriptionsAPI.activate(sub.id);
        toast.success(`Subscription activated`);
      } else if (action === 'pause') {
        await subscriptionsAPI.pause(sub.id);
        toast.success(`Subscription paused`);
      } else if (action === 'resume') {
        await subscriptionsAPI.resume(sub.id);
        toast.success(`Subscription resumed`);
      } else if (action === 'close') {
        await subscriptionsAPI.close(sub.id, { reason: 'Early closure by admin' });
        toast.success(`Subscription closed`);
      } else if (action === 'renew') {
        await subscriptionsAPI.renew(sub.id, {});
        toast.success(`Subscription renewed for next term`);
      }
      setDialogState((prev) => ({ ...prev, isOpen: false }));
      fetchSubscriptions();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Lifecycle transition failed';
      toast.error(msg);
    }
  };

  const columns = [
    {
      key: 'subscription_number',
      label: 'Subscription #',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-mono font-bold text-xs">
            SUB
          </div>
          <div>
            <div className="font-semibold text-slate-900 font-mono">
              {val || `SUB-${String(row.id).padStart(5, '0')}`}
            </div>
            <div className="text-[11px] text-slate-400 capitalize">
              {row.plan?.billing_frequency || row.billing_frequency || 'Monthly'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-900">
            {row.customer_name || val?.name || 'Customer'}
          </div>
          <div className="text-xs text-slate-400">
            {row.customer_email || val?.email || ''}
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan Tier',
      render: (val, row) => (
        <span className="font-medium text-slate-800">
          {val?.name || row.plan_name || 'Enterprise Custom'}
        </span>
      ),
    },
    {
      key: 'total_amount',
      label: 'Recurring Amount',
      sortable: true,
      render: (val) => (
        <span className="font-bold text-slate-900">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'dates',
      label: 'Validity Period',
      render: (_, row) => (
        <div className="text-xs text-slate-600 flex items-center gap-1">
          <HiOutlineCalendarDays className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDate(row.start_date)}</span>
          <span className="text-slate-400">→</span>
          <span>{row.expiry_date ? formatDate(row.expiry_date) : 'Continuous'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Lifecycle Stage',
      render: (val) => <StatusBadge status={val} showDot pulse={val === 'active'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/admin/subscriptions/${row.id}`)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Details"
          >
            <HiOutlineEye className="w-4 h-4" />
          </button>

          {row.status === 'draft' && (
            <button
              onClick={(e) =>
                triggerAction(
                  row,
                  'confirm',
                  'Confirm Subscription',
                  `Transition Draft subscription ${row.subscription_number} into Confirmed status?`,
                  'Confirm Subscription',
                  false,
                  e
                )
              }
              className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
            >
              Confirm
            </button>
          )}

          {row.status === 'confirmed' && (
            <button
              onClick={(e) =>
                triggerAction(
                  row,
                  'activate',
                  'Activate Subscription',
                  `Activate subscription ${row.subscription_number}? This will initiate recurring billing cycles.`,
                  'Activate Now',
                  false,
                  e
                )
              }
              className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
            >
              Activate
            </button>
          )}

          {row.status === 'active' && (
            <>
              <button
                onClick={(e) =>
                  triggerAction(
                    row,
                    'pause',
                    'Pause Subscription',
                    `Pause recurring billing and active service entitlement for ${row.subscription_number}?`,
                    'Pause Service',
                    false,
                    e
                  )
                }
                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Pause Subscription"
              >
                <HiOutlinePause className="w-4 h-4" />
              </button>
              <button
                onClick={(e) =>
                  triggerAction(
                    row,
                    'renew',
                    'Renew Subscription Term',
                    `Renew subscription ${row.subscription_number} for an additional billing cycle?`,
                    'Renew Term',
                    false,
                    e
                  )
                }
                className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                title="Renew Term"
              >
                <HiOutlineArrowPath className="w-4 h-4" />
              </button>
            </>
          )}

          {row.status === 'paused' && (
            <button
              onClick={(e) =>
                triggerAction(
                  row,
                  'resume',
                  'Resume Subscription',
                  `Resume billing and entitlements for ${row.subscription_number}?`,
                  'Resume Subscription',
                  false,
                  e
                )
              }
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Resume Subscription"
            >
              <HiOutlinePlay className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enforce lifecycle state transitions: Draft → Quotation → Confirmed → Active → Closed.
          </p>
        </div>
        <Link to="/admin/subscriptions/new" className="btn-primary">
          <HiOutlinePlus className="w-4 h-4" />
          New Subscription
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search subscription # or customer..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            className="select-field text-sm py-2"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={subscriptions}
        loading={loading}
        keyField="id"
        emptyTitle="No subscriptions found"
        emptyMessage="Create or convert quotations to begin managing active subscriptions."
        emptyAction={
          <Link to="/admin/subscriptions/new" className="btn-primary btn-sm">
            <HiOutlinePlus className="w-4 h-4" /> Create Subscription
          </Link>
        }
        onRowClick={(row) => navigate(`/admin/subscriptions/${row.id}`)}
      />

      {/* Pagination */}
      {!loading && subscriptions.length > 0 && (
        <Pagination
          currentPage={page}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        isDanger={dialogState.isDanger}
      />
    </div>
  );
}
