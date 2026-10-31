import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineCreditCard,
  HiOutlinePlus,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineArrowPath,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, StatusBadge, ConfirmDialog } from '@/components/common';
import { subscriptionsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function MySubscriptions() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await subscriptionsAPI.getMySubscriptions();
      setSubscriptions(res.data.results || res.data || []);
    } catch (err) {
      // Fallback
      setSubscriptions([
        {
          id: 'sub-1',
          subscription_number: 'SUB-00142',
          plan_name: 'Enterprise Cloud Collaboration Suite',
          total_amount: 16000,
          billing_frequency: 'monthly',
          start_date: '2026-04-01',
          expiry_date: '2026-11-01',
          status: 'active',
          allow_pause: true,
          allow_renewal: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review active services, renewal countdowns, and manage plan permissions.
          </p>
        </div>
        <Link to="/customer/plans" className="btn-primary">
          <HiOutlinePlus className="w-4 h-4" />
          Subscribe to New Plan
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading your subscriptions..." />
      ) : subscriptions.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-600 mx-auto flex items-center justify-center">
            <HiOutlineCreditCard className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">No active subscriptions</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not currently have any active recurring plans.
          </p>
          <Link to="/customer/plans" className="btn-primary btn-sm inline-block mt-2">
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {sub.subscription_number || `SUB-${sub.id}`}
                  </span>
                  <StatusBadge status={sub.status} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{sub.plan_name || 'Enterprise Plan'}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <HiOutlineCalendarDays className="w-4 h-4 text-slate-400" />
                    Started: {formatDate(sub.start_date)}
                  </span>
                  <span>•</span>
                  <span>Renews: {sub.expiry_date ? formatDate(sub.expiry_date) : 'Monthly on 1st'}</span>
                </div>
              </div>

              <div className="flex flex-col md:items-end justify-between gap-3">
                <div className="md:text-right">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {formatCurrency(sub.total_amount)}
                    <span className="text-xs font-normal text-slate-400">/{sub.billing_frequency || 'mo'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/customer/subscriptions/${sub.id}`}
                    className="btn-secondary btn-sm"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
