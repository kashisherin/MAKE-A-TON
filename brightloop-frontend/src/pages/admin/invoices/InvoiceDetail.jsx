import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlineArrowLeft,
  HiOutlinePrinter,
  HiOutlinePaperAirplane,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineBanknotes,
  HiOutlineCreditCard,
  HiOutlineArrowDownTray,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, StatusBadge, Modal, ConfirmDialog } from '@/components/common';
import { invoicesAPI, paymentsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';
import PaymentForm from '../payments/PaymentForm';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const [invRes, payRes] = await Promise.all([
        invoicesAPI.get(id),
        paymentsAPI.list({ invoice_id: id }).catch(() => ({ data: [] })),
      ]);
      setInvoice(invRes.data);
      setPayments(payRes.data.results || payRes.data || []);
    } catch (err) {
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleConfirmInvoice = async () => {
    try {
      await invoicesAPI.confirm(id);
      toast.success('Invoice confirmed');
      fetchInvoice();
    } catch (err) {
      toast.error('Failed to confirm invoice');
    }
  };

  const handleSendInvoice = async () => {
    try {
      await invoicesAPI.send(id);
      toast.success('Invoice sent to customer email');
      fetchInvoice();
    } catch (err) {
      toast.error('Failed to send invoice');
    }
  };

  const handleCancelInvoice = async () => {
    try {
      await invoicesAPI.cancel(id);
      toast.success('Invoice cancelled');
      setCancelDialogOpen(false);
      fetchInvoice();
    } catch (err) {
      toast.error('Failed to cancel invoice');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.success('Generating invoice PDF...');
      const response = await invoicesAPI.downloadPDF(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoice_number || invoice.id}.pdf`;
      link.click();
    } catch (err) {
      // Fallback print dialog
      window.print();
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading invoice and ledger entries..." />;
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Invoice not found.</p>
        <Link to="/admin/invoices" className="btn-primary mt-4">
          Back to Invoices
        </Link>
      </div>
    );
  }

  const outstandingBalance =
    invoice.balance !== undefined
      ? invoice.balance
      : Math.max(0, (parseFloat(invoice.total_amount) || 0) - (parseFloat(invoice.paid_amount) || 0));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/admin/invoices"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>

        <div className="flex items-center gap-2.5">
          <button onClick={() => window.print()} className="btn-secondary btn-sm">
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownloadPDF} className="btn-secondary btn-sm">
            <HiOutlineArrowDownTray className="w-4 h-4" /> Download PDF
          </button>

          {invoice.status === 'draft' && (
            <button onClick={handleConfirmInvoice} className="btn-primary btn-sm">
              <HiOutlineCheckCircle className="w-4 h-4" /> Confirm Invoice
            </button>
          )}

          {invoice.status === 'confirmed' && (
            <button onClick={handleSendInvoice} className="btn-primary btn-sm">
              <HiOutlinePaperAirplane className="w-4 h-4" /> Send to Customer
            </button>
          )}

          {outstandingBalance > 0 && invoice.status !== 'cancelled' && (
            <button onClick={() => setPaymentModalOpen(true)} className="btn-success btn-sm">
              <HiOutlineBanknotes className="w-4 h-4" /> Record Payment
            </button>
          )}

          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button onClick={() => setCancelDialogOpen(true)} className="btn-danger btn-sm">
              <HiOutlineXCircle className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="card p-8 bg-white border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {invoice.invoice_number || `INV-${String(invoice.id).padStart(5, '0')}`}
              </h1>
              <StatusBadge status={invoice.status} size="lg" />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Issue Date: {formatDate(invoice.date || invoice.created_at)} • Due Date: <span className="font-semibold text-slate-800">{formatDate(invoice.due_date)}</span>
            </p>
            {invoice.subscription_number && (
              <p className="text-xs text-brand-600 font-mono mt-0.5">
                Subscription: <Link to={`/admin/subscriptions/${invoice.subscription_id || ''}`} className="underline">{invoice.subscription_number}</Link>
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Amount</span>
            <div className="text-3xl font-extrabold text-slate-900">
              {formatCurrency(invoice.total_amount)}
            </div>
            {outstandingBalance > 0 ? (
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                Balance Due: {formatCurrency(outstandingBalance)}
              </span>
            ) : (
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Paid in Full
              </span>
            )}
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed To:</h4>
            <div className="font-semibold text-slate-900 text-base">
              {invoice.customer?.name || invoice.customer_name || 'Customer'}
            </div>
            {invoice.customer?.company && (
              <div className="text-slate-600">{invoice.customer.company}</div>
            )}
            <div className="text-slate-500 mt-1">
              {invoice.customer?.email || invoice.customer_email || '—'}
            </div>
          </div>

          <div className="sm:text-right">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed From:</h4>
            <div className="font-semibold text-slate-900 text-base">Brightloop Platforms Ltd</div>
            <div className="text-slate-500">Subscription Control Tower Enterprise</div>
            <div className="text-slate-500">finance@brightloop.io</div>
          </div>
        </div>

        {/* Invoice Lines Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Item Description</th>
                <th className="px-4 py-3 text-center">Quantity</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Tax</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {invoice.lines && invoice.lines.length > 0 ? (
                invoice.lines.map((l, idx) => (
                  <tr key={l.id || idx}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {l.product?.name || l.product_name || 'Subscription Billing Cycle'}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{l.quantity || 1}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(l.unit_price)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {l.tax_rate ? `${l.tax_rate}%` : '0%'}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      {l.discount_amount > 0 ? `-${formatCurrency(l.discount_amount)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(l.line_total || l.quantity * l.unit_price)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-400">
                    Recurring package billing line
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end pt-2">
          <div className="w-full sm:w-80 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{formatCurrency(invoice.subtotal_amount || invoice.total_amount)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discounts:</span>
                <span>-{formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxes:</span>
              <span className="font-medium text-slate-800">+{formatCurrency(invoice.tax_amount || 0)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-base">
              <span>Grand Total:</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-xs">
              <span>Paid to Date:</span>
              <span className="text-emerald-700 font-medium">{formatCurrency(invoice.paid_amount || 0)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
              <span className="text-slate-800">Remaining Balance:</span>
              <span className={outstandingBalance > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                {formatCurrency(outstandingBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Payments Recorded for this invoice */}
        <div className="space-y-3 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HiOutlineBanknotes className="w-5 h-5 text-emerald-600" />
              Reconciled Payments
            </h3>
            {outstandingBalance > 0 && (
              <button onClick={() => setPaymentModalOpen(true)} className="btn-secondary btn-sm">
                + Add Payment
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left">Payment Date</th>
                  <th className="px-4 py-2.5 text-left">Method</th>
                  <th className="px-4 py-2.5 text-left">Reference / Transaction ID</th>
                  <th className="px-4 py-2.5 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {payments.length > 0 ? (
                  payments.map((p, idx) => (
                    <tr key={p.id || idx}>
                      <td className="px-4 py-3 text-slate-700">{formatDate(p.payment_date || p.date || p.created_at)}</td>
                      <td className="px-4 py-3 capitalize font-medium text-slate-800">{p.payment_method?.replace('_', ' ') || 'Bank Transfer'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.transaction_id || p.reference || 'REF-AUTO'}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-5 text-center text-slate-400 text-xs">
                      No payments recorded yet for this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Form Modal */}
      {paymentModalOpen && (
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title={`Record Payment for ${invoice.invoice_number || `INV-${invoice.id}`}`}
          size="md"
        >
          <PaymentForm
            preselectedInvoice={invoice}
            onSuccess={() => {
              setPaymentModalOpen(false);
              fetchInvoice();
            }}
            onCancel={() => setPaymentModalOpen(false)}
          />
        </Modal>
      )}

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelInvoice}
        title="Cancel Invoice"
        message={`Are you sure you want to cancel invoice ${invoice.invoice_number}? This action cannot be undone.`}
        confirmText="Cancel Invoice"
        isDanger={true}
      />
    </div>
  );
}
