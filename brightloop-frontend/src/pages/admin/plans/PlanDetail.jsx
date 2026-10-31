import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineRectangleStack,
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineCube,
  HiOutlineClock,
  HiOutlineCurrencyRupee,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, StatusBadge, Modal } from '@/components/common';
import { plansAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';
import PlanForm from './PlanForm';

export default function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const response = await plansAPI.get(id);
      setPlan(response.data);
    } catch (err) {
      toast.error('Failed to load plan details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading plan details..." />;
  }

  if (!plan) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Plan not found.</p>
        <Link to="/admin/plans" className="btn-primary mt-4">
          Back to Plans
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/plans')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Plans
        </button>
        <button onClick={() => setIsEditOpen(true)} className="btn-primary btn-sm">
          <HiOutlinePencilSquare className="w-4 h-4" /> Edit Plan
        </button>
      </div>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-2xl shadow-sm">
              <HiOutlineRectangleStack className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{plan.name}</h1>
                <StatusBadge status={plan.is_active ? 'active' : 'closed'} />
              </div>
              <p className="text-sm text-slate-500 mt-1 capitalize">
                Billing Cycle: <span className="font-semibold text-slate-800">{plan.billing_frequency}</span> • Min Qty: {plan.min_quantity || 1}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end">
            <div className="text-sm text-slate-400">Recurring Price</div>
            <div className="text-3xl font-extrabold text-slate-900">
              {formatCurrency(plan.price)}
              <span className="text-sm font-normal text-slate-400">/{plan.billing_frequency}</span>
            </div>
          </div>
        </div>

        {/* Configuration rules */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-6">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Start Date</h4>
            <p className="text-sm font-medium text-slate-800 mt-1">{plan.start_date ? formatDate(plan.start_date) : 'Immediate'}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">End Date</h4>
            <p className="text-sm font-medium text-slate-800 mt-1">{plan.end_date ? formatDate(plan.end_date) : 'No Expiry'}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Auto-Close</h4>
            <p className="text-sm font-medium text-slate-800 mt-1">
              {plan.auto_close ? `Yes (${plan.auto_close_days || 30} days)` : 'No (Continuous)'}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Renewal Permitted</h4>
            <p className="text-sm font-medium text-slate-800 mt-1">{plan.allow_renewal ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Included products */}
      <div className="card p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <HiOutlineCube className="w-5 h-5 text-indigo-600" />
          Included Catalog Products
        </h3>

        {plan.products && plan.products.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {plan.products.map((p, idx) => (
              <div key={p.id || idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <HiOutlineCube className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 text-sm">{p.name}</h5>
                    <p className="text-xs text-slate-400 capitalize">{p.type || 'Service'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(p.sales_price)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No products currently attached to this plan.</p>
        )}
      </div>

      {isEditOpen && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Subscription Plan"
          size="lg"
        >
          <PlanForm
            plan={plan}
            onSuccess={() => {
              setIsEditOpen(false);
              fetchPlan();
            }}
            onCancel={() => setIsEditOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
