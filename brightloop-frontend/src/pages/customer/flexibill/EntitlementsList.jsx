import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineBolt,
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePlay,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, StatusBadge, ProgressBar } from '@/components/common';
import { flexiBillAPI } from '@/api/endpoints';
import { formatDate } from '@/utils/helpers';

export default function EntitlementsList() {
  const [entitlements, setEntitlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState(null);

  const fetchEntitlements = async () => {
    setLoading(true);
    try {
      const res = await flexiBillAPI.listEntitlements();
      setEntitlements(res.data.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load entitlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, []);

  const handleUseOperation = async (id, name) => {
    setExecutingId(id);
    try {
      const res = await flexiBillAPI.useEntitlement(id);
      const remaining = res.data?.remaining_usage;
      toast.success(
        `Protected operation executed! Remaining tokens: ${remaining !== undefined ? remaining : 'updated'}`
      );
      fetchEntitlements();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Access denied or quota exhausted';
      toast.error(msg);
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/customer/flexistore"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to FLEXI-Store
        </Link>
        <Link to="/customer/flexistore" className="btn-primary btn-sm">
          Browse More Passes
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Digital Entitlements</h1>
        <p className="text-sm text-slate-500 mt-1">
          Active API passes, feature authorizations, and usage-metered tokens enforced in real time.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner message="Querying digital entitlement registry..." />
      ) : entitlements.length === 0 ? (
        <div className="p-12 text-center card space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
            <HiOutlineBolt className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">No active entitlements</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not currently have any active pay-per-use passes or time-limited tokens.
          </p>
          <Link to="/customer/flexistore" className="btn-primary btn-sm inline-block mt-2">
            Visit Flexi-Store
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {entitlements.map((ent) => {
            const isExhausted = ent.remaining_usage !== null && ent.remaining_usage <= 0;
            const isExpired = ent.expires_at && new Date(ent.expires_at) < new Date();
            const isActive = !isExhausted && !isExpired && ent.status !== 'revoked';

            const total = ent.allowed_usage || 10;
            const remaining = ent.remaining_usage !== null ? ent.remaining_usage : total;
            const used = total - remaining;
            const pct = Math.round((remaining / total) * 100);

            return (
              <div
                key={ent.id}
                className={`card p-6 border transition-all ${
                  isActive ? 'border-purple-200 shadow-sm' : 'border-slate-200 bg-slate-50/50 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-slate-900">
                        {ent.product_name || ent.product?.name || 'Micro-Pass'}
                      </h3>
                      <StatusBadge status={isActive ? 'active' : 'expired'} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>Activated: {formatDate(ent.created_at || new Date())}</span>
                      <span>•</span>
                      <span>
                        Expires: {ent.expires_at ? formatDate(ent.expires_at) : 'On Token Depletion'}
                      </span>
                    </div>
                  </div>

                  {isActive && ent.access_type === 'usage_based' && (
                    <button
                      onClick={() => handleUseOperation(ent.id, ent.product_name)}
                      disabled={executingId === ent.id}
                      className="btn-ai btn-sm"
                    >
                      <HiOutlineSparkles className="w-4 h-4" />
                      {executingId === ent.id ? 'Verifying...' : 'Execute Protected Action'}
                    </button>
                  )}
                </div>

                {ent.access_type === 'usage_based' && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                      <span>Usage Tokens: {remaining} remaining of {total}</span>
                      <span>{pct}% Available</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
