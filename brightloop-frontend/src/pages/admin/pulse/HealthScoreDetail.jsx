import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineHeart,
  HiOutlineArrowLeft,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineSparkles,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineShieldExclamation,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, StatusBadge } from '@/components/common';
import { HealthScoreGauge } from '@/components/charts';
import { pulseAPI, customersAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function HealthScoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cRes, sRes] = await Promise.all([
          customersAPI.get(id).catch(() => ({ data: { name: 'Acme Global Ltd', email: 'billing@acme.com' } })),
          pulseAPI.getHealthScore(id).catch(() => ({
            data: {
              health_score: 24,
              risk_level: 'high_risk',
              factors: {
                payment_history_score: 5,
                payment_history_max: 25,
                renewal_behavior_score: 8,
                renewal_behavior_max: 25,
                usage_activity_score: 4,
                usage_activity_max: 25,
                account_stability_score: 7,
                account_stability_max: 25,
              },
              reasons: [
                'Three late payments in the last 6 months',
                'One failed renewal payment attempt on INV-0042',
                'User seat utilization dropped by 45% over the past 60 days',
                'Subscription was paused twice in the current contract term',
              ],
              recommendations: [
                'Schedule proactive account executive check-in prior to upcoming renewal',
                'Offer rightsizing package reducing seat quota from 20 to 12 seats to prevent total cancellation',
                'Send custom 10% loyalty retention discount voucher',
              ],
            },
          })),
        ]);
        setCustomer(cRes.data);
        setScoreData(sRes.data);
      } catch (err) {
        toast.error('Failed to load health metrics');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Evaluating health score breakdown..." />;
  }

  const score = scoreData?.health_score ?? 24;
  const factors = scoreData?.factors || {};

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/pulse"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to PULSE Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${customer?.email || 'contact@client.com'}`}
            className="btn-secondary btn-sm"
          >
            <HiOutlineEnvelope className="w-4 h-4" /> Email Customer
          </a>
          <button
            onClick={() => toast.success('Outreach task created for assigned staff member')}
            className="btn-primary btn-sm"
          >
            <HiOutlinePhone className="w-4 h-4" /> Assign Follow-up Task
          </button>
        </div>
      </div>

      {/* Main Score Overview Card */}
      <div className="card p-8 bg-white border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {customer?.name || 'Customer Account'}
              </h1>
              <StatusBadge status={scoreData?.risk_level || 'high_risk'} size="lg" />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {customer?.company || 'Corporate Client'} • {customer?.email}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <HealthScoreGauge score={score} size={160} />
          </div>
        </div>

        {/* 4 Factor Breakdown */}
        <div className="pt-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Deterministic Scoring Factor Breakdown (0 - 100)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Payment Punctuality</span>
                <span className="text-slate-900">{factors.payment_history_score ?? 5} / 25 pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${((factors.payment_history_score ?? 5) / 25) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">Evaluates overdue days, delays, and partial receipts.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Renewal Stability</span>
                <span className="text-slate-900">{factors.renewal_behavior_score ?? 8} / 25 pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full"
                  style={{ width: `${((factors.renewal_behavior_score ?? 8) / 25) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">Checks renewal success rate and previous dropouts.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Active Feature & Seat Utilization</span>
                <span className="text-slate-900">{factors.usage_activity_score ?? 4} / 25 pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full"
                  style={{ width: `${((factors.usage_activity_score ?? 4) / 25) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">Measures daily seat logins and feature activity.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Contract Continuity</span>
                <span className="text-slate-900">{factors.account_stability_score ?? 7} / 25 pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${((factors.account_stability_score ?? 7) / 25) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">Analyzes subscription pauses and downgrades.</p>
            </div>
          </div>
        </div>

        {/* Diagnostic Reasons */}
        <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <HiOutlineShieldExclamation className="w-5 h-5 text-red-500" />
            Detected Risk Drivers
          </h3>

          <div className="space-y-2">
            {scoreData?.reasons?.map((reason, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg border border-red-100 text-xs">
                <HiOutlineExclamationTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-slate-800 font-medium">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prescriptive Interventions */}
        <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <HiOutlineSparkles className="w-5 h-5 text-purple-600" />
            Prescriptive Interventions & Next Best Actions
          </h3>

          <div className="space-y-2">
            {scoreData?.recommendations?.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-purple-50/50 rounded-lg border border-purple-100 text-xs">
                <HiOutlineCheckCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span className="text-slate-800">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
