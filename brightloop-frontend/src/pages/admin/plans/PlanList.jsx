import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineRectangleStack,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineEye,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineClock,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import {
  DataTable,
  Pagination,
  SearchInput,
  StatusBadge,
  Modal,
  ConfirmDialog,
} from '@/components/common';
import { plansAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';
import PlanForm from './PlanForm';

const FREQUENCY_OPTIONS = [
  { label: 'All Frequencies', value: '' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export default function PlanList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        billing_frequency: frequencyFilter || undefined,
      };
      const response = await plansAPI.list(params);
      const data = response.data;
      if (data.results) {
        setPlans(data.results);
        setTotalCount(data.count || data.results.length);
      } else if (Array.isArray(data)) {
        setPlans(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, frequencyFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreate = () => {
    setSelectedPlan(null);
    setIsFormOpen(true);
  };

  const handleEdit = (plan, e) => {
    e?.stopPropagation();
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedPlan(null);
    fetchPlans();
  };

  const columns = [
    {
      key: 'name',
      label: 'Plan Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            <HiOutlineRectangleStack className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-400">
              Min Qty: {row.min_quantity || 1} • {row.products?.length || 0} Products
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Price & Billing',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900">{formatCurrency(val)}</span>
          <span className="text-xs text-slate-400 ml-1">/ {row.billing_frequency}</span>
        </div>
      ),
    },
    {
      key: 'billing_frequency',
      label: 'Frequency',
      render: (val) => (
        <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          {val}
        </span>
      ),
    },
    {
      key: 'rules',
      label: 'Permissions',
      render: (_, row) => (
        <div className="flex items-center gap-2 text-xs">
          <span
            title="Pause allowed"
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
              row.allow_pause ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400 line-through'
            }`}
          >
            Pause
          </span>
          <span
            title="Renewal allowed"
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
              row.allow_renewal ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400 line-through'
            }`}
          >
            Renew
          </span>
          <span
            title="Early closure allowed"
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
              row.allow_early_closure ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400 line-through'
            }`}
          >
            Early Close
          </span>
        </div>
      ),
    },
    {
      key: 'availability',
      label: 'Validity',
      render: (_, row) => (
        <div className="text-xs text-slate-600">
          {row.start_date ? formatDate(row.start_date) : 'Always'}
          {' → '}
          {row.end_date ? formatDate(row.end_date) : 'Open'}
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => <StatusBadge status={val !== false ? 'active' : 'closed'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/admin/plans/${row.id}`)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Details"
          >
            <HiOutlineEye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => handleEdit(row, e)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Plan"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure recurring billing packages, frequencies, lifecycle permissions, and pricing.
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <HiOutlinePlus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search plans by name..."
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
            value={frequencyFilter}
            onChange={(e) => {
              setFrequencyFilter(e.target.value);
              setPage(1);
            }}
          >
            {FREQUENCY_OPTIONS.map((opt) => (
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
        data={plans}
        loading={loading}
        keyField="id"
        emptyTitle="No subscription plans found"
        emptyMessage="Define your first recurring billing plan to start selling subscriptions."
        emptyAction={
          <button onClick={handleCreate} className="btn-primary btn-sm">
            <HiOutlinePlus className="w-4 h-4" /> Create Plan
          </button>
        }
        onRowClick={(row) => navigate(`/admin/plans/${row.id}`)}
      />

      {/* Pagination */}
      {!loading && plans.length > 0 && (
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

      {/* Form Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
          size="lg"
        >
          <PlanForm
            plan={selectedPlan}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
