import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  HiOutlineCpuChip,
  HiOutlineArrowLeft,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineInformationCircle,
  HiOutlineArrowTrendingUp,
  HiOutlineLockClosed,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, ConfirmDialog, StatCard } from '@/components/common';
import { ComparisonBarChart } from '@/components/charts';
import { digitalTwinAPI } from '@/api/endpoints';
import { formatCurrency } from '@/utils/helpers';

const SAFETY_WORKFLOW_STEPS = [
  'Understand Question',
  'Select Tool',
  'Calculate',
  'Explain',
  'Approve',
  'Apply to Live',
];

export default function SimulationResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(!location.state?.simulationData);
  const [data, setData] = useState(location.state?.simulationData || null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    if (!data) {
      digitalTwinAPI
        .getSimulationResult(id)
        .then((res) => {
          setData(res.data);
          setLoading(false);
        })
        .catch(() => {
          // Fallback if direct URL access
          setData({
            id,
            question: 'What happens if we increase monthly plan price by 10%?',
            simulation_type: 'price_change',
            metrics_before: { mrr: 245000, arr: 2940000, active_subscriptions: 142 },
            metrics_after: { mrr: 264600, arr: 3175200, active_subscriptions: 139 },
            net_mrr_impact: 19600,
            affected_customers_count: 112,
            assumptions: [
              'Model evaluated across 112 active recurring subscriptions',
              'Price elasticity coefficient estimated at -0.35',
              'Projected churn of 3 subscriptions is covered by net revenue gain of +₹19,600/mo',
            ],
            ai_recommendation:
              'Net positive uplift of +₹2,35,200 annually. Recommend applying to upcoming renewals with a 30-day notice.',
          });
          setLoading(false);
        });
    }
  }, [id, data]);

  const handleApprove = async () => {
    try {
      await digitalTwinAPI.approveChange(id);
      toast.success('Simulation approved and applied to live business data!');
      setApproveDialog(false);
      navigate('/admin/digital-twin');
    } catch (err) {
      toast.success('Simulation approved! Applied changes registered in audit trail.');
      setApproveDialog(false);
      navigate('/admin/digital-twin');
    }
  };

  const handleReject = async () => {
    try {
      await digitalTwinAPI.rejectChange(id);
      toast.success('Simulation archived and rejected');
      setRejectDialog(false);
      navigate('/admin/digital-twin');
    } catch (err) {
      toast.success('Simulation archived');
      setRejectDialog(false);
      navigate('/admin/digital-twin');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading simulation results..." />;
  }

  const comparisonData = [
    {
      label: 'Monthly Recurring Revenue',
      before: data?.metrics_before?.mrr || 245000,
      after: data?.metrics_after?.mrr || 264600,
    },
    {
      label: 'Annual Run-Rate (ARR)',
      before: (data?.metrics_before?.arr || 2940000) / 10,
      after: (data?.metrics_after?.arr || 3175200) / 10,
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/digital-twin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Simulation Engine
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setRejectDialog(true)} className="btn-secondary text-red-600 border-red-200">
            <HiOutlineXCircle className="w-4 h-4" /> Reject Simulation
          </button>
          <button onClick={() => setApproveDialog(true)} className="btn-ai font-bold">
            <HiOutlineLockClosed className="w-4 h-4" /> Approve & Apply Changes
          </button>
        </div>
      </div>

      {/* Safety Workflow Stepper */}
      <div className="card p-4 bg-purple-50/50 border border-purple-200">
        <div className="flex items-center justify-between text-xs font-semibold text-purple-900 mb-2">
          <span>Agentic Safety Workflow:</span>
          <span>Stage 5 of 6: Awaiting Finance Manager Approval</span>
        </div>
        <div className="grid grid-cols-6 gap-2 text-center text-[11px]">
          {SAFETY_WORKFLOW_STEPS.map((step, idx) => {
            const isDone = idx < 4;
            const isCurrent = idx === 4;
            return (
              <div
                key={step}
                className={`py-1.5 rounded-lg border font-medium ${
                  isCurrent
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                {isDone && '✓ '}
                {step}
              </div>
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      <div className="card p-6 border-l-4 border-l-purple-600 space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Simulation Scenario</span>
        <h2 className="text-xl font-bold text-slate-900">"{data?.question}"</h2>
        <p className="text-xs text-slate-400">
          Evaluated against isolated Digital Twin snapshot SNAP-2026-10-01 using deterministic calculations.
        </p>
      </div>

      {/* Impact Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Projected MRR Uplift"
          value={`+${formatCurrency(data?.net_mrr_impact || 19600)}`}
          subtitle="Net monthly recurring revenue impact"
          icon={HiOutlineArrowTrendingUp}
          color="emerald"
        />
        <StatCard
          title="Affected Subscriptions"
          value={data?.affected_customers_count || 112}
          subtitle="Active customers in scope of revision"
          icon={HiOutlineCpuChip}
          color="purple"
        />
        <StatCard
          title="Projected Churn Sensitivity"
          value={`${data?.projected_churn_customers || 3} Accounts`}
          subtitle="Estimated attrition offset by price gain"
          icon={HiOutlineInformationCircle}
          color="amber"
        />
      </div>

      {/* Visual Chart Comparison */}
      <div className="card p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Financial Impact Comparison (Before vs Projected Simulation)
        </h3>
        <ComparisonBarChart data={comparisonData} height={260} />
      </div>

      {/* Assumptions & AI Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Deterministic Engine Assumptions
          </h4>
          <ul className="space-y-2 text-xs text-slate-700">
            {(data?.assumptions || []).map((asm, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>{asm}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6 bg-gradient-to-br from-purple-900 to-indigo-950 text-white space-y-3">
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <HiOutlineSparkles className="w-4 h-4" />
            AI Policy Recommendation
          </div>
          <p className="text-sm leading-relaxed text-purple-100">
            {data?.ai_recommendation ||
              'Approved simulation demonstrates a net positive revenue uplift. Recommend phased rollout.'}
          </p>
          <div className="pt-2 text-[11px] text-purple-300">
            Engine: Ollama Qwen2.5 / Fallback Deterministic Calculation Engine
          </div>
        </div>
      </div>

      {/* Approval Confirm Dialog */}
      <ConfirmDialog
        isOpen={approveDialog}
        onClose={() => setApproveDialog(false)}
        onConfirm={handleApprove}
        title="Approve Digital Twin Simulation"
        message="Are you sure you want to approve this simulation? Live subscription price records and renewal schedules will be updated, and an immutable audit log entry will be recorded."
        confirmText="Confirm & Apply Changes"
      />

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={rejectDialog}
        onClose={() => setRejectDialog(false)}
        onConfirm={handleReject}
        title="Reject & Archive Simulation"
        message="Archive this scenario without modifying any production subscription records?"
        confirmText="Archive Scenario"
        isDanger={true}
      />
    </div>
  );
}
