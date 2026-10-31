import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineArrowPath,
  HiOutlineEye,
  HiOutlinePaperAirplane,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineArrowDownTray,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import {
  DataTable,
  Pagination,
  SearchInput,
  StatusBadge,
  ConfirmDialog,
} from '@/components/common';
import { invoicesAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

const STATUS_FILTERS = [
  { label: 'All Invoices', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Sent', value: 'sent' },
  { label: 'Partially Paid', value: 'partially_paid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function InvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [generating, setGenerating] = useState(false);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      };
      const response = await invoicesAPI.list(params);
      const data = response.data;
      if (data.results) {
        setInvoices(data.results);
        setTotalCount(data.count || data.results.length);
      } else if (Array.isArray(data)) {
        setInvoices(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleGenerateDueInvoices = async () => {
    setGenerating(true);
    try {
      const res = await invoicesAPI.generateFromSubscriptions();
      const count = res.data?.generated_count || 0;
      toast.success(
        count > 0
          ? `Automated Billing: ${count} invoices successfully generated!`
          : 'All active subscriptions are currently up to date.'
      );
      setGenerateConfirmOpen(false);
      fetchInvoices();
    } catch (err) {
      toast.error('Failed to generate recurring invoices');
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center font-mono font-bold text-xs">
            INV
          </div>
          <div>
            <div className="font-semibold text-slate-900 font-mono">
              {val || `INV-${String(row.id).padStart(5, '0')}`}
            </div>
            {row.subscription_number && (
              <div className="text-[11px] text-slate-400 font-mono">
                Sub: {row.subscription_number}
              </div>
            )}
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
      key: 'date',
      label: 'Issue / Due Date',
      render: (_, row) => (
        <div className="text-xs text-slate-700">
          <div>{formatDate(row.date || row.created_at)}</div>
          <div className={`text-[11px] ${row.status === 'overdue' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
            Due: {formatDate(row.due_date)}
          </div>
        </div>
      ),
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      sortable: true,
      render: (val) => (
        <span className="font-bold text-slate-900">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'balance',
      label: 'Outstanding',
      render: (val, row) => {
        const bal = val !== undefined ? val : (parseFloat(row.total_amount) || 0) - (parseFloat(row.paid_amount) || 0);
        return (
          <span className={`text-xs font-semibold ${bal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {formatCurrency(bal)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/admin/invoices/${row.id}`)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Invoice"
          >
            <HiOutlineEye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices & Billing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated recurring invoices, payment reconciliation, partial balances, and PDF generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setGenerateConfirmOpen(true)}
            className="btn-secondary text-brand-700 bg-brand-50 border-brand-200"
            disabled={generating}
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            Run Billing Engine
          </button>
          <Link to="/admin/invoices/new" className="btn-primary">
            <HiOutlinePlus className="w-4 h-4" />
            Manual Invoice
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search invoice # or customer..."
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
            {STATUS_FILTERS.map((opt) => (
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
        data={invoices}
        loading={loading}
        keyField="id"
        emptyTitle="No invoices found"
        emptyMessage="Generate recurring invoices from active subscriptions or create a manual billing item."
        onRowClick={(row) => navigate(`/admin/invoices/${row.id}`)}
      />

      {/* Pagination */}
      {!loading && invoices.length > 0 && (
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

      {/* Confirm Automated Billing Run */}
      <ConfirmDialog
        isOpen={generateConfirmOpen}
        onClose={() => setGenerateConfirmOpen(false)}
        onConfirm={handleGenerateDueInvoices}
        title="Execute Recurring Billing Scheduler"
        message="This will scan all Confirmed and Active subscriptions across the database, calculate due billing periods with idempotency checks, apply valid taxes and discounts, and generate official invoices."
        confirmText="Execute Billing Engine"
      />
    </div>
  );
}
