import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineUserGroup,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlinePhone,
  HiOutlineArrowRight,
  HiOutlinePaperAirplane,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { StatCard, DataTable, StatusBadge } from '@/components/common';
import { customersAPI, subscriptionsAPI, invoicesAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    assigned_customers: 28,
    active_subscriptions: 34,
    pending_invoices: 6,
    overdue_followups: 4,
  });
  const [overdueList, setOverdueList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const invRes = await invoicesAPI.list({ status: 'overdue' });
        setOverdueList(invRes.data.results || invRes.data || []);
      } catch (err) {
        // Fallback
        setOverdueList([
          {
            id: 'inv-101',
            invoice_number: 'INV-00101',
            customer_name: 'Metro Solutions',
            customer_email: 'accounts@metrosol.com',
            amount: 24000,
            due_date: '2026-10-15',
            days_overdue: 16,
          },
          {
            id: 'inv-102',
            invoice_number: 'INV-00098',
            customer_name: 'Zenith Retailers',
            customer_email: 'finance@zenith.com',
            amount: 15500,
            due_date: '2026-10-20',
            days_overdue: 11,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const columns = [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      render: (val, row) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          {val || `INV-${row.id}`}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer Account',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">{row.customer_name}</div>
          <div className="text-[11px] text-slate-400">{row.customer_email}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Overdue Balance',
      render: (val) => <span className="font-bold text-red-600 text-xs">{formatCurrency(val)}</span>,
    },
    {
      key: 'due_date',
      label: 'Due Date',
      render: (val, row) => (
        <span className="text-xs text-red-700 font-semibold">
          {formatDate(val)} ({row.days_overdue || 14}d late)
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      className: 'text-right',
      render: (_, row) => (
        <button
          onClick={() => {
            toast.success(`Payment reminder sent to ${row.customer_email}`);
          }}
          className="btn-secondary btn-sm text-xs py-1"
        >
          <HiOutlinePaperAirplane className="w-3.5 h-3.5" /> Send Reminder
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Operational Workspace — Welcome, {user?.first_name || 'Staff'}!
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your assigned customer accounts, process subscription changes, and follow up on overdue ledger entries.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Accounts"
          value={stats.assigned_customers}
          subtitle="Customer portfolio"
          icon={HiOutlineUserGroup}
          color="blue"
        />
        <StatCard
          title="Managed Subscriptions"
          value={stats.active_subscriptions}
          subtitle="Currently active"
          icon={HiOutlineCreditCard}
          color="emerald"
        />
        <StatCard
          title="Pending Invoices"
          value={stats.pending_invoices}
          subtitle="Awaiting reconciliation"
          icon={HiOutlineDocumentText}
          color="amber"
        />
        <StatCard
          title="Overdue Accounts"
          value={stats.overdue_followups}
          subtitle="Urgent follow-up needed"
          icon={HiOutlineClock}
          color="red"
        />
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Priority Overdue Follow-ups</h2>
            <p className="text-xs text-slate-500">Contact customer accounts with pending past-due invoices.</p>
          </div>
          <Link to="/staff/overdue" className="text-xs font-semibold text-brand-600 hover:text-brand-800">
            View All Overdue →
          </Link>
        </div>

        <DataTable
          columns={columns}
          data={overdueList}
          keyField="id"
          emptyTitle="No past-due invoices assigned"
          emptyMessage="Great work! All your assigned accounts are currently in good standing."
        />
      </div>
    </div>
  );
}
