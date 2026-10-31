import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineArrowRightCircle,
  HiOutlinePaperAirplane,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineBookmarkSquare,
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
import { quotationsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

const STATUS_FILTERS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Converted', value: 'converted' },
];

export default function QuotationList() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [convertDialog, setConvertDialog] = useState({ isOpen: false, item: null });

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      };
      const response = await quotationsAPI.list(params);
      const data = response.data;
      if (data.results) {
        setQuotations(data.results);
        setTotalCount(data.count || data.results.length);
      } else if (Array.isArray(data)) {
        setQuotations(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleSend = async (q, e) => {
    e.stopPropagation();
    try {
      await quotationsAPI.send(q.id);
      toast.success(`Quotation ${q.number} sent to customer`);
      fetchQuotations();
    } catch (err) {
      toast.error('Failed to send quotation');
    }
  };

  const handleConvertPrompt = (q, e) => {
    e.stopPropagation();
    setConvertDialog({ isOpen: true, item: q });
  };

  const handleConfirmConvert = async () => {
    if (!convertDialog.item) return;
    try {
      const res = await quotationsAPI.convertToSubscription(convertDialog.item.id);
      toast.success(`Quotation converted to subscription!`);
      setConvertDialog({ isOpen: false, item: null });
      fetchQuotations();
      if (res.data?.subscription_id) {
        navigate(`/admin/subscriptions/${res.data.subscription_id}`);
      }
    } catch (err) {
      toast.error('Failed to convert quotation');
    }
  };

  const columns = [
    {
      key: 'number',
      label: 'Quotation #',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center font-mono font-bold text-xs">
            QT
          </div>
          <span className="font-semibold text-slate-900 font-mono">{val || `QT-${row.id}`}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (val, row) => (
        <div>
          <div className="font-medium text-slate-900">
            {row.customer_name || (val?.name ?? '—')}
          </div>
          <div className="text-xs text-slate-400">
            {row.customer_email || val?.email || ''}
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
      key: 'valid_until',
      label: 'Valid Until',
      render: (val) => formatDate(val),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => formatDate(val || new Date()),
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
            onClick={() => navigate(`/admin/quotations/${row.id}`)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Details"
          >
            <HiOutlineEye className="w-4 h-4" />
          </button>

          {row.status === 'draft' && (
            <button
              onClick={(e) => handleSend(row, e)}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Send to Customer"
            >
              <HiOutlinePaperAirplane className="w-4 h-4" />
            </button>
          )}

          {row.status === 'accepted' && (
            <button
              onClick={(e) => handleConvertPrompt(row, e)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
              title="Convert to Subscription"
            >
              <HiOutlineArrowRightCircle className="w-4 h-4" />
              Convert
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build bespoke commercial estimates, send proposals, and convert accepted quotes to active subscriptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/quotations/templates" className="btn-secondary">
            <HiOutlineBookmarkSquare className="w-4 h-4" />
            Templates
          </Link>
          <Link to="/admin/quotations/new" className="btn-primary">
            <HiOutlinePlus className="w-4 h-4" />
            New Quotation
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search quotation # or customer..."
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
        data={quotations}
        loading={loading}
        keyField="id"
        emptyTitle="No quotations found"
        emptyMessage="Draft a new quotation to send proposal options to prospective customers."
        emptyAction={
          <Link to="/admin/quotations/new" className="btn-primary btn-sm">
            <HiOutlinePlus className="w-4 h-4" /> New Quotation
          </Link>
        }
        onRowClick={(row) => navigate(`/admin/quotations/${row.id}`)}
      />

      {/* Pagination */}
      {!loading && quotations.length > 0 && (
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

      {/* Convert Confirm Dialog */}
      <ConfirmDialog
        isOpen={convertDialog.isOpen}
        onClose={() => setConvertDialog({ isOpen: false, item: null })}
        onConfirm={handleConfirmConvert}
        title="Convert Quotation to Subscription"
        message={`Are you sure you want to convert Quotation "${convertDialog.item?.number}" into an active subscription? This will initialize the subscription and invoice generation lifecycle without duplicating lines.`}
        confirmText="Confirm & Convert"
      />
    </div>
  );
}
