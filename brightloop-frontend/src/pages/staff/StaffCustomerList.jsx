import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineEye } from 'react-icons/hi2';
import { DataTable, SearchInput, StatusBadge } from '@/components/common';
import { customersAPI } from '@/api/endpoints';

export default function StaffCustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      try {
        const res = await customersAPI.list({ search: search || undefined });
        setCustomers(res.data.results || res.data || []);
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, [search]);

  const columns = [
    {
      key: 'name',
      label: 'Customer Name',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-900">{val || `${row.first_name} ${row.last_name}`}</div>
          <div className="text-xs text-slate-400">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'company',
      label: 'Company',
      render: (val) => val || 'Direct Client',
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (val) => val || '—',
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => <StatusBadge status={val !== false ? 'active' : 'closed'} />,
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assigned Customers</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review customer contact details and view active subscriptions.
        </p>
      </div>

      <div className="w-80">
        <SearchInput
          placeholder="Search by customer name or email..."
          value={search}
          onChange={setSearch}
        />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        keyField="id"
        emptyTitle="No assigned customers found"
      />
    </div>
  );
}
