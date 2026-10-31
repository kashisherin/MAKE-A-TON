import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineWallet,
  HiOutlineSparkles,
  HiOutlineBolt,
  HiOutlineClock,
  HiOutlineArrowRight,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import { StatCard, StatusBadge } from '@/components/common';
import { subscriptionsAPI, invoicesAPI, flexiBillAPI, pulseAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [activeSubs, setActiveSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [potentialSavings, setPotentialSavings] = useState(6400);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [subRes, invRes, wRes, recRes] = await Promise.all([
          subscriptionsAPI.getMySubscriptions().catch(() => ({ data: [] })),
          invoicesAPI.getMyInvoices().catch(() => ({ data: [] })),
          flexiBillAPI.getWallet().catch(() => ({ data: { balance: 450 } })),
          pulseAPI.getRecommendations().catch(() => ({ data: [] })),
        ]);
        setActiveSubs(subRes.data.results || subRes.data || []);
        setInvoices(invRes.data.results || invRes.data || []);
        setWallet(wRes.data || { balance: 450 });
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-brand-950 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-brand-300 uppercase tracking-widest">
              Subscriber Control Tower
            </span>
            <h1 className="text-3xl font-extrabold mt-1 text-white">
              Welcome back, {user?.first_name || 'Valued Subscriber'}!
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Manage your active recurring plans, review invoices, buy flexible passes, and monitor your subscription health.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/customer/plans" className="btn-primary shadow-md">
              Browse Available Plans
            </Link>
          </div>
        </div>
      </div>

      {/* PULSE Savings Alert Banner (If savings detected) */}
      {potentialSavings > 0 && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <HiOutlineSparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                PULSE Alert: Save {formatCurrency(potentialSavings)}/mo on Idle Accounts
              </h4>
              <p className="text-xs text-emerald-800">
                8 unused seats were identified across your subscriptions. Rightsize before your renewal to reduce costs.
              </p>
            </div>
          </div>
          <Link
            to="/customer/savings"
            className="btn-success btn-sm whitespace-nowrap"
          >
            Review Savings →
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={activeSubs.length || 1}
          subtitle="Recurring packages"
          icon={HiOutlineCreditCard}
          color="blue"
        />
        <StatCard
          title="Prepaid Wallet"
          value={formatCurrency(wallet.balance)}
          subtitle="Available for micro-passes"
          icon={HiOutlineWallet}
          color="emerald"
        />
        <StatCard
          title="Recent Invoices"
          value={invoices.length || 2}
          subtitle="Billing ledger items"
          icon={HiOutlineDocumentText}
          color="purple"
        />
        <StatCard
          title="Renewal Countdown"
          value="18 Days"
          subtitle="Next scheduled billing cycle"
          icon={HiOutlineClock}
          color="indigo"
        />
      </div>

      {/* Active Subscriptions Quick View */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">My Subscriptions</h2>
          <Link to="/customer/subscriptions" className="text-xs font-semibold text-brand-600 hover:text-brand-800">
            View All Subscriptions →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400 font-bold">SUB-00142</span>
                <StatusBadge status="active" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mt-2">
                Enterprise Cloud Collaboration Suite
              </h3>
              <p className="text-xs text-slate-500 mt-1">20 User Seats • Premium AI Workspace Included</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-400">Monthly Billing</span>
                <div className="text-base font-extrabold text-slate-900">{formatCurrency(16000)}/mo</div>
              </div>
              <Link
                to="/customer/subscriptions/1"
                className="btn-secondary btn-sm"
              >
                Manage Subscription →
              </Link>
            </div>
          </div>

          {/* Micro pass shortcut card */}
          <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border border-purple-200 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                  <HiOutlineBolt className="w-4 h-4" /> FLEXI-BILL
                </span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Pay-As-You-Go
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mt-2">
                Need extra capacity or single features?
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Purchase 5-minute compute bursts, image operations, or standalone add-ons directly from your prepaid wallet.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-purple-200">
              <span className="text-xs text-purple-900 font-semibold">Wallet: {formatCurrency(wallet.balance)}</span>
              <Link to="/customer/flexistore" className="btn-ai btn-sm">
                Open Marketplace →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
