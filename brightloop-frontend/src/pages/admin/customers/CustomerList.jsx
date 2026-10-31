import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineUsers,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineEye,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineFunnel,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { Spinner, Badge, EmptyState } from '@/components/common';
import { customersAPI } from '@/api/endpoints';
import { formatCurrency, formatDate, getStatusConfig } from '@/utils/helpers';

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

const PAGE_SIZE = 10;

function HealthBadge({ score }) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-slate-400">N/A</span>;
  }
  let color = 'bg-green-100 text-green-700';
  let label = 'Healthy';
  if (score < 40) {
    color = 'bg-red-100 text-red-700';
    label = 'At Risk';
  } else if (score < 70) {
    color = 'bg-amber-100 text-amber-700';
    label = 'Warning';
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {score}
      <span className="hidden sm:inline">— {label}</span>
    </span>
  );
}

function Avatar({ name, src }) {
  if (src) {
    return <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover" />;
  }
  const initials = (name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const colors = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-cyan-500',
  ];
  const colorIndex = (name || '').length % colors.length;
  return (
    <div
      className={`w-8 h-8 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white text-xs font-semibold`}
    >
      {initials || '?'}
    </div>
  );
}

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
      };
      if (search.trim()) {
        params.search = search.trim();
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await customersAPI.list(params);
      const data = response.data;
      setCustomers(data.customers || data.data || []);
      setTotalPages(data.totalPages || data.meta?.totalPages || 1);
      setTotalCount(data.total || data.meta?.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleRowClick = (customerId) => {
    navigate(`/admin/customers/${customerId}`);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== '' || statusFilter !== '';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">
            {totalCount} {totalCount === 1 ? 'customer' : 'customers'} total
          </p>
        </div>
        <Link
          to="/admin/customers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Customer
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <HiOutlineFunnel className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <HiOutlineXMark className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
            <span className="ml-3 text-slate-500">Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={HiOutlineUsers}
              title={hasActiveFilters ? 'No customers found' : 'No customers yet'}
              description={
                hasActiveFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by adding your first customer.'
              }
              action={
                hasActiveFilters
                  ? { label: 'Clear Filters', onClick: clearFilters }
                  : { label: 'Add Customer', to: '/admin/customers/new' }
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Email
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Phone
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Company
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Subscriptions
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">
                      Total Spent
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Health
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => {
                    const statusConf = getStatusConfig(customer.status);
                    return (
                      <tr
                        key={customer.id}
                        onClick={() => handleRowClick(customer.id)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={customer.name || `${customer.firstName} ${customer.lastName}`} src={customer.avatar} />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">
                                {customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 hidden md:table-cell">
                          <span className="truncate block max-w-[200px]">{customer.email}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 hidden lg:table-cell">
                          {customer.phone || '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 hidden lg:table-cell">
                          {customer.company || '—'}
                        </td>
                        <td className="px-6 py-4 text-center hidden md:table-cell">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            {customer.subscriptionsCount ?? customer.subscriptions?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-900 font-medium hidden xl:table-cell">
                          {formatCurrency(customer.totalSpent ?? 0)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <HealthBadge score={customer.healthScore} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge
                            color={statusConf?.color || 'gray'}
                            size="sm"
                          >
                            {statusConf?.label || customer.status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/customers/${customer.id}`);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <HiOutlineEye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/customers/${customer.id}/edit`);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit customer"
                            >
                              <HiOutlinePencilSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <HiOutlineChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          pageNum === page
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-white border border-transparent hover:border-slate-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <HiOutlineChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
