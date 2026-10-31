import React, { useState, useEffect } from 'react';
import {
  HiOutlineWallet,
  HiOutlinePlus,
  HiOutlineArrowDownLeft,
  HiOutlineArrowUpRight,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, Modal, FormField, DataTable } from '@/components/common';
import { flexiBillAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function WalletPage() {
  const [wallet, setWallet] = useState({ balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [topUpModal, setTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [submitting, setSubmitting] = useState(false);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const [wRes, txRes] = await Promise.all([
        flexiBillAPI.getWallet(),
        flexiBillAPI.getTransactions({ page_size: 20 }),
      ]);
      setWallet(wRes.data || { balance: 0 });
      setTransactions(txRes.data.results || txRes.data || []);
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleTopUp = async (e) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid top-up amount');
      return;
    }

    setSubmitting(true);
    try {
      await flexiBillAPI.addFunds({
        amount: amt,
        payment_method: paymentMethod,
      });
      toast.success(`Added ${formatCurrency(amt)} to your prepaid wallet!`);
      setTopUpModal(false);
      fetchWallet();
    } catch (err) {
      toast.error('Failed to add funds');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              val === 'credit'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {val === 'credit' ? (
              <HiOutlineArrowDownLeft className="w-4 h-4" />
            ) : (
              <HiOutlineArrowUpRight className="w-4 h-4" />
            )}
          </div>
          <span className="font-semibold text-slate-800 capitalize text-xs">
            {val === 'credit' ? 'Funds Deposit' : 'Usage Debit'}
          </span>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Transaction Details',
      render: (val) => <span className="text-slate-700 text-xs">{val || 'Prepaid service token deduction'}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (val, row) => (
        <span
          className={`font-bold text-sm ${
            row.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'
          }`}
        >
          {row.type === 'credit' ? '+' : '-'}{formatCurrency(val)}
        </span>
      ),
    },
    {
      key: 'balance_after',
      label: 'Balance After',
      render: (val) => <span className="text-xs text-slate-500 font-medium">{formatCurrency(val)}</span>,
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (val, row) => formatDate(val || row.created_at || new Date()),
    },
  ];

  if (loading) {
    return <LoadingSpinner message="Querying prepaid escrow wallet..." />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Prepaid Escrow Account
            </span>
            <div className="text-4xl sm:text-5xl font-black mt-1 text-white">
              {formatCurrency(wallet.balance)}
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <HiOutlineShieldCheck className="w-4 h-4 text-emerald-400" />
              Locked in secure database escrow • Instant deduction on micro-passes
            </p>
          </div>

          <button
            onClick={() => setTopUpModal(true)}
            className="btn-success btn-lg shadow-md hover:scale-105 transition-transform"
          >
            <HiOutlinePlus className="w-5 h-5 stroke-2" />
            Add Funds to Wallet
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Wallet Transaction History</h2>
            <p className="text-xs text-slate-500">Every single micro-charge and top-up is audited and persisted.</p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={transactions}
          keyField="id"
          emptyTitle="No wallet activity yet"
          emptyMessage="Add funds to your prepaid wallet to start using instant flexible micro-subscriptions."
        />
      </div>

      {/* Top Up Modal */}
      {topUpModal && (
        <Modal
          isOpen={topUpModal}
          onClose={() => setTopUpModal(false)}
          title="Top Up Prepaid Wallet"
          size="md"
        >
          <form onSubmit={handleTopUp} className="space-y-4">
            <div>
              <label className="label">Select Quick Amount</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {['100', '500', '1000', '5000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(amt)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      topUpAmount === amt
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            <FormField label="Or Custom Amount (₹)" required>
              <input
                type="number"
                min="10"
                step="1"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="input-field"
                required
              />
            </FormField>

            <FormField label="Payment Channel" required>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="select-field"
              >
                <option value="upi">Instant UPI (GooglePay / PhonePe / Paytm)</option>
                <option value="card">Credit / Debit Card</option>
                <option value="net_banking">Net Banking</option>
              </select>
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setTopUpModal(false)}
                disabled={submitting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-success"
              >
                {submitting ? 'Processing...' : `Authorize ₹${topUpAmount} Top-Up`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
