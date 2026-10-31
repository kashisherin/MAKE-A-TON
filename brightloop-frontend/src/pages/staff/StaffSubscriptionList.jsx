import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineCreditCard, HiOutlineEye } from 'react-icons/hi2';
import { DataTable, SearchInput, StatusBadge } from '@/components/common';
import { subscriptionsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function StaffSubscriptionList() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadSubs() {
      setLoading(true);
      try {
        const res = await subscriptionsAPI.list({ search: search || undefined });
        setSubscriptions(res.data.results || res.data || []);
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadSubs();
  }, [search]);

  const columns = [
    {
      key: 'subscription_number',
      label: 'Subscription #',
      render: (val, row) => (
        <span className="font-mono font-semibold text-slate-900 text-xs">
          {val || `SUB-${String(row.id).padStart(5, '0')}`}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (val, row) => row.customer_name || val?.name || 'Customer',
    },
    {
      key: 'plan',
      label: 'Plan Tier',
      render: (val, row) => row.plan_name || val?.name || 'Standard Tier',
    },
    {
      key: 'total_amount',
      label: 'Billing Amount',
      render: (val) => <span className="font-bold text-slate-900">{formatCurrency(val)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'actions',
      label: 'Action',
      className: 'text-right',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/admin/subscriptions/${row.id}`)}
          className="btn-secondary btn-sm"
        >
          <HiOutlineEye className="w-4 h-4" /> View
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Managed Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-1">Operational view of assigned customer subscriptions.</p>
      </div>

      <div className="w-80">
        <SearchInput
          placeholder="Search by subscription or customer..."
          value={search}
          onChange={setSearch}
        />
      </div>

      <DataTable
        columns={columns}
        data={subscriptions}
        loading={loading}
        keyField="id"
        emptyTitle="No subscriptions listed"
      />
    </div>
  );
}
