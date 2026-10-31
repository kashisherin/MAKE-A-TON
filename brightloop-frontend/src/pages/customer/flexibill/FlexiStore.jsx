import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineBolt,
  HiOutlineWallet,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineCheckCircle,
  HiOutlineArrowRight,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, ConfirmDialog } from '@/components/common';
import { flexiBillAPI } from '@/api/endpoints';
import { formatCurrency } from '@/utils/helpers';

const CATEGORIES = [
  { id: 'all', label: 'All Access Models' },
  { id: 'time_based', label: 'Time-Based' },
  { id: 'usage_based', label: 'Usage / Operations' },
  { id: 'feature_based', label: 'Specific Features' },
  { id: 'content_based', label: 'Digital Content' },
  { id: 'hybrid', label: 'Hybrid Upgrades' },
];

export default function FlexiStore() {
  const [products, setProducts] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  const [purchaseDialog, setPurchaseDialog] = useState({ isOpen: false, item: null });
  const [purchasing, setPurchasing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, wRes] = await Promise.all([
        flexiBillAPI.listAccessProducts().catch(() => ({ data: [] })),
        flexiBillAPI.getWallet().catch(() => ({ data: { balance: 250 } })),
      ]);
      setProducts(pRes.data.results || pRes.data || []);
      setWallet(wRes.data || { balance: 250 });
    } catch (err) {
      toast.error('Failed to load store catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePurchasePrompt = (prod) => {
    setPurchaseDialog({ isOpen: true, item: prod });
  };

  const handleConfirmPurchase = async () => {
    const item = purchaseDialog.item;
    if (!item) return;

    if (wallet.balance < item.price) {
      toast.error('Insufficient wallet balance. Please add funds to your wallet.');
      return;
    }

    setPurchasing(true);
    try {
      await flexiBillAPI.purchaseAccess({ access_product_id: item.id });
      toast.success(`Purchased "${item.name}"! Entitlement active.`);
      setPurchaseDialog({ isOpen: false, item: null });
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Purchase failed';
      toast.error(msg);
    } finally {
      setPurchasing(false);
    }
  };

  const filteredProducts =
    category === 'all' ? products : products.filter((p) => p.access_type === category);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Wallet Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-xl">
            <HiOutlineWallet className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs uppercase font-semibold text-slate-300 tracking-wider">Your Prepaid Balance</div>
            <div className="text-3xl font-extrabold text-white mt-0.5">{formatCurrency(wallet.balance)}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/customer/entitlements" className="btn-secondary btn-sm bg-white/10 text-white border-white/20 hover:bg-white/20">
            <HiOutlineShieldCheck className="w-4 h-4" /> My Active Entitlements
          </Link>
          <Link to="/customer/wallet" className="btn-success btn-sm">
            + Top Up Wallet
          </Link>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">FLEXI-BILL Marketplace</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pay only for what you consume. Buy 5-minute passes, per-operation packages, or individual feature tokens.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              category === cat.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <LoadingSpinner message="Loading flexible purchasing options..." />
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center card">
          <p className="text-slate-500">No packages listed under this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredProducts.map((p) => {
            const canAfford = wallet.balance >= p.price;
            return (
              <div
                key={p.id}
                className="card p-6 flex flex-col justify-between hover:border-brand-300 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      {p.access_type?.replace('_', ' ')}
                    </span>
                    <span className="text-2xl font-extrabold text-slate-900">
                      {formatCurrency(p.price)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {p.description || 'Instant digital entitlement with real-time API access token enforcement.'}
                  </p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Access Quota:</span>
                      <span className="font-semibold text-slate-900">
                        {p.access_type === 'time_based'
                          ? `${p.duration_minutes || 60} Minutes`
                          : p.access_type === 'usage_based'
                          ? `${p.usage_limit || 10} Operations`
                          : 'Specific Feature Key'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Deduction:</span>
                      <span className="text-emerald-600 font-medium">Instant Wallet Debit</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handlePurchasePrompt(p)}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      canAfford
                        ? 'bg-brand-600 text-white hover:bg-brand-700'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <HiOutlineBolt className="w-4 h-4" />
                    {canAfford ? 'Purchase Instant Pass' : 'Insufficient Wallet Balance'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={purchaseDialog.isOpen}
        onClose={() => setPurchaseDialog({ isOpen: false, item: null })}
        onConfirm={handleConfirmPurchase}
        title="Confirm Micro-Access Purchase"
        message={`Authorize deduction of ${formatCurrency(purchaseDialog.item?.price)} from your prepaid wallet to activate "${purchaseDialog.item?.name}"?`}
        confirmText="Confirm & Deduct"
      />
    </div>
  );
}
