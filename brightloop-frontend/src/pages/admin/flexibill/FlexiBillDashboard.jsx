import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineBolt,
  HiOutlineWallet,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineCube,
  HiOutlineArrowTrendingUp,
  HiOutlinePlus,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { StatCard, DataTable, StatusBadge } from '@/components/common';
import { flexiBillAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function FlexiBillDashboard() {
  const [stats, setStats] = useState({
    total_wallet_balance: 142500,
    active_entitlements: 348,
    access_products_count: 14,
    revenue_micro_purchases: 89400,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [txRes, prodRes] = await Promise.all([
          flexiBillAPI.getTransactions({ page_size: 10 }).catch(() => ({ data: [] })),
          flexiBillAPI.listAccessProducts().catch(() => ({ data: [] })),
        ]);
        const txs = txRes.data.results || txRes.data || [];
        const prods = prodRes.data.results || prodRes.data || [];
        setRecentTransactions(txs);
        setStats((prev) => ({
          ...prev,
          access_products_count: prods.length || prev.access_products_count,
        }));
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const columns = [
    {
      key: 'transaction',
      label: 'Transaction',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.description || 'Prepaid Wallet Deduction'}</div>
          <div className="text-xs text-slate-400 capitalize">{row.access_type || 'Micro-charge'}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (val, row) => row.customer_name || val?.name || 'Customer',
    },
    {
      key: 'type',
      label: 'Type',
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            val === 'credit'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-indigo-50 text-indigo-700'
          }`}
        >
          {val === 'credit' ? 'Wallet Top-up' : 'Usage Deduction'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (val, row) => (
        <span className={`font-bold ${row.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
          {row.type === 'credit' ? '+' : '-'}{formatCurrency(val)}
        </span>
      ),
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (val) => formatDate(val || new Date()),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <HiOutlineBolt className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              FLEXI-BILL Control Center
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Granular consumption engine: Time-based, Usage-based, Feature-based, Content-based & Hybrid models.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/flexibill/products" className="btn-secondary">
            Manage Access Products
          </Link>
          <Link to="/admin/flexibill/products/new" className="btn-primary">
            <HiOutlinePlus className="w-4 h-4" />
            New Micro-Plan
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total User Wallets Balance"
          value={formatCurrency(stats.total_wallet_balance)}
          icon={HiOutlineWallet}
          subtitle="Prepaid escrow across customers"
          color="emerald"
        />
        <StatCard
          title="Active Entitlements"
          value={stats.active_entitlements}
          icon={HiOutlineBolt}
          subtitle="Real-time access passes in flight"
          color="purple"
        />
        <StatCard
          title="Configured Micro-Products"
          value={stats.access_products_count}
          icon={HiOutlineCube}
          subtitle="5 flexible billing models active"
          color="blue"
        />
        <StatCard
          title="Micro-Purchase Revenue"
          value={formatCurrency(stats.revenue_micro_purchases)}
          icon={HiOutlineArrowTrendingUp}
          subtitle="Revenue from non-subscription access"
          color="indigo"
        />
      </div>

      {/* 5 Purchasing Models Explanatory Row */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs mb-2">
            A
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Time-Based Access</h4>
          <p className="text-xs text-slate-500 mt-1">₹5 for 5 min, ₹15 for 1 hr, or ₹30 per day.</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-2">
            B
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Usage-Based Access</h4>
          <p className="text-xs text-slate-500 mt-1">₹5 for 5 image edits, ₹10 for 10 AI operations.</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs mb-2">
            C
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Feature-Based Access</h4>
          <p className="text-xs text-slate-500 mt-1">Unlock isolated tools without full recurring packages.</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs mb-2">
            D
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Content-Based Access</h4>
          <p className="text-xs text-slate-500 mt-1">Pay-per-view access with strict viewing and time caps.</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs mb-2">
            E
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Hybrid Subscriptions</h4>
          <p className="text-xs text-slate-500 mt-1">Base recurring plan plus metered on-demand micro charges.</p>
        </div>
      </div>

      {/* Live Transaction Ledger */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Live Micro-Billing Transaction Ledger
          </h3>
          <span className="text-xs text-slate-400">Concurrency-protected wallet deductions</span>
        </div>

        <DataTable
          columns={columns}
          data={recentTransactions}
          loading={loading}
          keyField="id"
          emptyTitle="No transactions logged"
          emptyMessage="Prepaid wallet top-ups and micro deductions will appear here in real time."
        />
      </div>
    </div>
  );
}
