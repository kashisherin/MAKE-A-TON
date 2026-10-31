import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineHeart,
  HiOutlineShieldExclamation,
  HiOutlineArrowPath,
  HiOutlineUserGroup,
  HiOutlineExclamationTriangle,
  HiOutlineSparkles,
  HiOutlineEye,
  HiOutlinePhone,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { StatCard, DataTable, StatusBadge, LoadingSpinner } from '@/components/common';
import { CustomerRiskChart, HealthScoreGauge } from '@/components/charts';
import { pulseAPI } from '@/api/endpoints';
import { formatCurrency } from '@/utils/helpers';

export default function PulseDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [atRiskCustomers, setAtRiskCustomers] = useState([]);
  const [metrics, setMetrics] = useState({
    avg_health_score: 74,
    healthy_count: 84,
    medium_risk_count: 18,
    high_risk_count: 7,
    revenue_at_risk: 124500,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [riskRes, scoresRes] = await Promise.all([
        pulseAPI.getAtRiskCustomers().catch(() => ({ data: [] })),
        pulseAPI.getHealthScores().catch(() => ({ data: [] })),
      ]);
      const list = riskRes.data.results || riskRes.data || [];
      setAtRiskCustomers(list);
    } catch (err) {
      // Fallback data
      setAtRiskCustomers([
        {
          id: 'cust-1',
          name: 'Acme Corporation Ltd',
          company: 'Acme Global',
          health_score: 24,
          risk_level: 'high_risk',
          reasons: ['3 late payments in last 90 days', '1 renewal declined', 'Usage down 45%'],
          subscription_value: 48000,
          last_payment_date: '2026-08-15',
        },
        {
          id: 'cust-2',
          name: 'Apex Innovations',
          company: 'Apex Tech',
          health_score: 36,
          risk_level: 'high_risk',
          reasons: ['Subscription paused 2 times', 'Active seats dropped from 20 to 6'],
          subscription_value: 36000,
          last_payment_date: '2026-09-01',
        },
        {
          id: 'cust-3',
          name: 'Starlight Media',
          company: 'Starlight Networks',
          health_score: 55,
          risk_level: 'medium_risk',
          reasons: ['1 overdue invoice pending', 'Feature utilization under 20%'],
          subscription_value: 22500,
          last_payment_date: '2026-09-20',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await pulseAPI.recalculateScores();
      toast.success('PULSE Intelligence Engine recalculated all accounts!');
      fetchData();
    } catch (err) {
      toast.error('Recalculation error');
    } finally {
      setRecalculating(false);
    }
  };

  const riskChartData = [
    { risk_level: 'Healthy (70-100)', count: metrics.healthy_count, color: '#22c55e' },
    { risk_level: 'Medium Risk (40-69)', count: metrics.medium_risk_count, color: '#f59e0b' },
    { risk_level: 'High Risk (0-39)', count: metrics.high_risk_count, color: '#ef4444' },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Customer Name',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-900">{val}</div>
          <div className="text-xs text-slate-400">{row.company || 'Corporate Client'}</div>
        </div>
      ),
    },
    {
      key: 'health_score',
      label: 'Health Score',
      render: (val) => (
        <div className="flex items-center gap-2">
          <span
            className={`font-mono font-bold text-sm px-2 py-0.5 rounded-full ${
              val < 40
                ? 'bg-red-50 text-red-700 border border-red-200'
                : val < 70
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {val} / 100
          </span>
        </div>
      ),
    },
    {
      key: 'risk_level',
      label: 'Risk Tier',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'reasons',
      label: 'Identified Risk Drivers',
      render: (val) => (
        <div className="space-y-0.5 max-w-sm">
          {(val || []).map((r, i) => (
            <div key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'subscription_value',
      label: 'Value at Risk',
      render: (val) => <span className="font-bold text-slate-900">{formatCurrency(val)}</span>,
    },
    {
      key: 'actions',
      label: 'Action',
      className: 'text-right',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/admin/pulse/customer/${row.id}`)}
          className="btn-secondary btn-sm"
        >
          <HiOutlineEye className="w-4 h-4" /> Inspect Profile
        </button>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner message="Evaluating Revenue Health scores..." />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <HiOutlineHeart className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              PULSE – Revenue Health & Retention Score
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Explainable rule-based scoring engine detecting churn triggers, late renewals, and underutilized seats.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/pulse/utilization" className="btn-secondary">
            Seat Utilization Report
          </Link>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="btn-ai"
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            Recalculate Health Scores
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Average Health Score"
          value={`${metrics.avg_health_score}/100`}
          subtitle="Portfolio retention index"
          icon={HiOutlineHeart}
          color="purple"
        />
        <StatCard
          title="Healthy Customers"
          value={metrics.healthy_count}
          subtitle="Score > 70 (Low churn risk)"
          icon={HiOutlineUserGroup}
          color="emerald"
        />
        <StatCard
          title="Medium Risk Accounts"
          value={metrics.medium_risk_count}
          subtitle="Score 40-69 (Follow-up recommended)"
          icon={HiOutlineExclamationTriangle}
          color="amber"
        />
        <StatCard
          title="High Risk Churn Accounts"
          value={metrics.high_risk_count}
          subtitle={`Value at Risk: ${formatCurrency(metrics.revenue_at_risk)}`}
          icon={HiOutlineShieldExclamation}
          color="red"
        />
      </div>

      {/* Risk Chart & Gauge Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
            Average Portfolio Health
          </h3>
          <HealthScoreGauge score={metrics.avg_health_score} size={220} />
          <p className="text-xs text-slate-400 text-center mt-2">
            Deterministic weighted evaluation across payment delays, renewal failures, and usage decay.
          </p>
        </div>

        <div className="lg:col-span-2 card p-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Customer Risk Distribution
          </h3>
          <CustomerRiskChart data={riskChartData} height={200} />
        </div>
      </div>

      {/* At-Risk Accounts Table */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Accounts Requiring Immediate Attention
            </h2>
            <p className="text-xs text-slate-500">
              Proactively engage customers before cancellation with tailored interventions.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={atRiskCustomers}
          keyField="id"
          emptyTitle="All accounts are currently healthy!"
          emptyMessage="No high-risk customer accounts flagged by the PULSE scoring engine."
        />
      </div>
    </div>
  );
}
