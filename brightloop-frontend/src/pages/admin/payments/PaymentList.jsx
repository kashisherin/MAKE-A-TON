import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineBanknotes,
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlineCreditCard,
  HiOutlineBuildingLibrary,
  HiOutlineQrCode,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import {
  DataTable,
  Pagination,
  SearchInput,
  Modal,
} from '@/components/common';
import { paymentsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';
import PaymentForm from './PaymentForm';

const METHOD_OPTIONS = [
  { label: 'All Methods', value: '' },
  { label: 'UPI', value: 'upi' },
  { label: 'Card', value: 'card' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cash', value: 'cash' },
];

export default function PaymentList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        payment_method: methodFilter || undefined,
      };
      const response = await paymentsAPI.list(params);
      const data = response.data;
      if (data.results) {
        setPayments(data.results);
        setTotalCount(data.count || data.results.length);
      } else if (Array.isArray(data)) {
        setPayments(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      toast.error('Failed to load payment transactions');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getMethodBadge = (method) => {
    const m = (method || '').toLowerCase();
    if (m === 'upi') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <HiOutlineQrCode className="w-3.5 h-3.5" /> UPI
        </span>
      );
    }
    if (m === 'card') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <HiOutlineCreditCard className="w-3.5 h-3.5" /> Card
        </span>
      );
    }
    if (m === 'bank_transfer') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <HiOutlineBuildingLibrary className="w-3.5 h-3.5" /> Bank Transfer
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
        <HiOutlineBanknotes className="w-3.5 h-3.5" /> {m || 'Cash'}
      </span>
    );
  };

  const columns = [
    {
      key: 'transaction_id',
      label: 'Transaction ID / Ref',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-mono font-bold text-xs">
            TX
          </div>
          <div>
            <div className="font-semibold text-slate-900 font-mono text-xs">
              {val || row.reference || `TXN-${String(row.id).padStart(6, '0')}`}
            </div>
            <div className="text-[11px] text-slate-400">
              Inv: {row.invoice_number || `INV-${row.invoice_id}`}
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
      key: 'payment_method',
      label: 'Method',
      render: (val) => getMethodBadge(val),
    },
    {
      key: 'amount',
      label: 'Amount Collected',
      sortable: true,
      render: (val) => (
        <span className="font-extrabold text-emerald-700">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'payment_date',
      label: 'Date Settled',
      render: (val, row) => formatDate(val || row.date || row.created_at),
    },
    {
      key: 'notes',
      label: 'Notes / Channel',
      render: (val) => <span className="text-xs text-slate-500 truncate max-w-xs block">{val || 'Standard payment'}</span>,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Reconciliation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile payments across UPI, Card, Bank Transfers, and Cash with automated ledger updates.
          </p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="btn-primary">
          <HiOutlinePlus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search by transaction reference or customer..."
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
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
          >
            {METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        keyField="id"
        emptyTitle="No payments recorded"
        emptyMessage="Recorded payments against outstanding invoices will appear here."
        emptyAction={
          <button onClick={() => setIsFormOpen(true)} className="btn-primary btn-sm">
            <HiOutlinePlus className="w-4 h-4" /> Record Payment
          </button>
        }
      />

      {!loading && payments.length > 0 && (
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

      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Record Customer Payment"
          size="md"
        >
          <PaymentForm
            onSuccess={() => {
              setIsFormOpen(false);
              fetchPayments();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
