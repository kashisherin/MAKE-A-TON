import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlineArrowLeft,
  HiOutlinePaperAirplane,
  HiOutlineArrowRightCircle,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlinePrinter,
  HiOutlineUser,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, StatusBadge, ConfirmDialog } from '@/components/common';
import { quotationsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [convertOpen, setConvertOpen] = useState(false);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const response = await quotationsAPI.get(id);
      setQuotation(response.data);
    } catch (err) {
      toast.error('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const handleSend = async () => {
    try {
      await quotationsAPI.send(id);
      toast.success('Quotation sent to customer');
      fetchQuotation();
    } catch (err) {
      toast.error('Failed to send quotation');
    }
  };

  const handleAccept = async () => {
    try {
      await quotationsAPI.accept(id);
      toast.success('Quotation marked as accepted by customer');
      fetchQuotation();
    } catch (err) {
      toast.error('Failed to mark accepted');
    }
  };

  const handleReject = async () => {
    try {
      await quotationsAPI.reject(id);
      toast.success('Quotation marked as rejected');
      fetchQuotation();
    } catch (err) {
      toast.error('Failed to mark rejected');
    }
  };

  const handleConvert = async () => {
    try {
      const res = await quotationsAPI.convertToSubscription(id);
      toast.success('Converted to subscription successfully!');
      setConvertOpen(false);
      if (res.data?.subscription_id) {
        navigate(`/admin/subscriptions/${res.data.subscription_id}`);
      } else {
        fetchQuotation();
      }
    } catch (err) {
      toast.error('Failed to convert to subscription');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading quotation details..." />;
  }

  if (!quotation) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Quotation not found.</p>
        <Link to="/admin/quotations" className="btn-primary mt-4">
          Back to Quotations
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/admin/quotations"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Quotations
        </Link>

        <div className="flex items-center gap-2.5">
          <button onClick={() => window.print()} className="btn-secondary btn-sm">
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>

          {quotation.status === 'draft' && (
            <button onClick={handleSend} className="btn-primary btn-sm">
              <HiOutlinePaperAirplane className="w-4 h-4" /> Send to Customer
            </button>
          )}

          {quotation.status === 'sent' && (
            <>
              <button onClick={handleAccept} className="btn-success btn-sm">
                <HiOutlineCheck className="w-4 h-4" /> Mark Accepted
              </button>
              <button onClick={handleReject} className="btn-danger btn-sm">
                <HiOutlineXMark className="w-4 h-4" /> Mark Rejected
              </button>
            </>
          )}

          {quotation.status === 'accepted' && (
            <button onClick={() => setConvertOpen(true)} className="btn-ai btn-sm">
              <HiOutlineArrowRightCircle className="w-4 h-4" /> Convert to Subscription
            </button>
          )}

          {quotation.status === 'converted' && quotation.subscription_id && (
            <Link
              to={`/admin/subscriptions/${quotation.subscription_id}`}
              className="btn-secondary btn-sm text-purple-700 bg-purple-50 border-purple-200"
            >
              View Active Subscription →
            </Link>
          )}
        </div>
      </div>

      {/* Main Quotation Sheet */}
      <div className="card p-8 bg-white border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {quotation.number || `QT-${quotation.id}`}
              </h1>
              <StatusBadge status={quotation.status} size="lg" />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Issue Date: {formatDate(quotation.created_at || new Date())} • Valid Until: <span className="font-semibold text-slate-800">{formatDate(quotation.valid_until)}</span>
            </p>
          </div>

          <div className="sm:text-right">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Value</span>
            <div className="text-3xl font-extrabold text-brand-600">
              {formatCurrency(quotation.total_amount)}
            </div>
          </div>
        </div>

        {/* Customer & Company Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Prepared For:</h4>
            <div className="font-semibold text-slate-900 text-base">
              {quotation.customer?.name || quotation.customer_name || 'Valued Customer'}
            </div>
            {quotation.customer?.company && (
              <div className="text-slate-600">{quotation.customer.company}</div>
            )}
            <div className="text-slate-500 mt-1">
              {quotation.customer?.email || quotation.customer_email || '—'}
            </div>
          </div>

          <div className="sm:text-right">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Issued By:</h4>
            <div className="font-semibold text-slate-900 text-base">Brightloop Platforms Ltd</div>
            <div className="text-slate-500">Subscription Control Tower Enterprise</div>
            <div className="text-slate-500">billing@brightloop.io</div>
          </div>
        </div>

        {/* Lines Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Description / Product</th>
                <th className="px-4 py-3 text-left">Plan Tier</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {quotation.lines && quotation.lines.length > 0 ? (
                quotation.lines.map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {line.product?.name || line.product_name || 'Standard Service Item'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {line.plan?.name || line.plan_name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-700">{line.quantity || 1}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700">{formatCurrency(line.unit_price)}</td>
                    <td className="px-4 py-3.5 text-right text-emerald-600">
                      {line.discount_amount > 0 ? `-${formatCurrency(line.discount_amount)}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                      {formatCurrency(line.line_total || line.quantity * line.unit_price)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-400">
                    No item lines recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pt-4">
          <div className="sm:max-w-md">
            {quotation.notes && (
              <div>
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Terms & Conditions
                </h5>
                <p className="text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {quotation.notes}
                </p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{formatCurrency(quotation.subtotal_amount || quotation.total_amount)}</span>
            </div>
            {quotation.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Total Discount:</span>
                <span>-{formatCurrency(quotation.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Applicable Taxes:</span>
              <span className="font-medium text-slate-800">+{formatCurrency(quotation.tax_amount || 0)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-base">
              <span>Grand Total:</span>
              <span className="text-brand-600">{formatCurrency(quotation.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={convertOpen}
        onClose={() => setConvertOpen(false)}
        onConfirm={handleConvert}
        title="Convert Quotation to Subscription"
        message={`This will convert Quotation ${quotation.number} into an active recurring subscription for ${quotation.customer?.name || 'the customer'} and schedule automated recurring billing.`}
        confirmText="Confirm & Convert"
      />
    </div>
  );
}
