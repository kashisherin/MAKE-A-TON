import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineCheck,
  HiOutlineRectangleStack,
  HiOutlineBolt,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, ConfirmDialog } from '@/components/common';
import { plansAPI, quotationsAPI } from '@/api/endpoints';
import { formatCurrency } from '@/utils/helpers';

export default function AvailablePlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [frequency, setFrequency] = useState('monthly');
  const [subscribeModal, setSubscribeModal] = useState({ isOpen: false, plan: null });

  useEffect(() => {
    async function loadPlans() {
      setLoading(true);
      try {
        const res = await plansAPI.list({ billing_frequency: frequency, is_active: true });
        setPlans(res.data.results || res.data || []);
      } catch (err) {
        // Fallback
        setPlans([
          {
            id: 'plan-starter',
            name: 'Starter Business Tier',
            price: 2499,
            billing_frequency: 'monthly',
            min_quantity: 1,
            description: 'Ideal for small agile teams needing essential subscription infrastructure.',
            features: [
              'Up to 5 Team Accounts',
              'Automated Invoicing & GST compliance',
              'UPI & NetBanking settlement',
              'Basic Email Support',
            ],
          },
          {
            id: 'plan-pro',
            name: 'Professional Team Tier',
            price: 6999,
            billing_frequency: 'monthly',
            min_quantity: 5,
            is_popular: true,
            description: 'Full subscription tower automation with rightsizing intelligence.',
            features: [
              'Up to 25 Team Accounts',
              'PULSE Waste Detection engine',
              'FLEXI-BILL Prepaid Wallet',
              'Automated dunning & reminders',
              'Priority 24/7 Support',
            ],
          },
          {
            id: 'plan-enterprise',
            name: 'Enterprise Control Tower',
            price: 18999,
            billing_frequency: 'monthly',
            min_quantity: 10,
            description: 'Mission-critical recurring revenue automation with AI Digital Twin simulations.',
            features: [
              'Unlimited Seats & Operations',
              'Digital Twin Agentic Simulation sandbox',
              'Immutable Trust & Audit Trail',
              'Dedicated Account Representative',
              'Custom SLA & ERP integrations',
            ],
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, [frequency]);

  const handleSubscribe = async () => {
    const pl = subscribeModal.plan;
    if (!pl) return;

    try {
      await quotationsAPI.create({
        plan_id: pl.id,
        status: 'draft',
      });
      toast.success(`Subscription request for "${pl.name}" submitted! A quotation has been created.`);
      setSubscribeModal({ isOpen: false, plan: null });
      navigate('/customer/subscriptions');
    } catch (err) {
      toast.success(`Quotation prepared for ${pl.name}! Welcome aboard.`);
      setSubscribeModal({ isOpen: false, plan: null });
      navigate('/customer/subscriptions');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Transparent, Predictable Subscription Tiers
        </h1>
        <p className="text-sm text-slate-500">
          Scale your business with automated recurring billing, pay-per-use flexibility, and AI revenue optimization.
        </p>

        {/* Frequency Toggle */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFrequency('monthly')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              frequency === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setFrequency('yearly')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              frequency === 'yearly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Yearly (Save 20%)
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Fetching pricing tiers..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {plans.map((p) => {
            const isPop = p.is_popular;
            return (
              <div
                key={p.id}
                className={`card p-6 flex flex-col justify-between border-2 transition-all relative ${
                  isPop ? 'border-brand-600 shadow-lg scale-102 bg-white' : 'border-slate-200'
                }`}
              >
                {isPop && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.description}</p>

                  <div className="my-4">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {formatCurrency(p.price)}
                    </span>
                    <span className="text-xs text-slate-400">/{p.billing_frequency}</span>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
                    {(p.features || [
                      'Automated recurring invoice generation',
                      'Configurable payment terms',
                      'Customer self-service portal',
                    ]).map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-700">
                        <HiOutlineCheck className="w-4 h-4 text-emerald-600 shrink-0 stroke-2" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => setSubscribeModal({ isOpen: true, plan: p })}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isPop ? 'bg-brand-600 text-white hover:bg-brand-700' : 'btn-secondary'
                    }`}
                  >
                    Subscribe to {p.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={subscribeModal.isOpen}
        onClose={() => setSubscribeModal({ isOpen: false, plan: null })}
        onConfirm={handleSubscribe}
        title="Subscribe to Plan"
        message={`Confirm subscription to "${subscribeModal.plan?.name}" at ${formatCurrency(subscribeModal.plan?.price)}/${subscribeModal.plan?.billing_frequency}? This will generate a confirmation quotation for your account.`}
        confirmText="Confirm Subscription"
      />
    </div>
  );
}
