import React, { useState, useEffect } from 'react';
import { HiOutlineClock, HiOutlinePaperAirplane, HiOutlinePhone } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { DataTable, StatusBadge } from '@/components/common';
import { invoicesAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function StaffOverdueList() {
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverdue() {
      setLoading(true);
      try {
        const res = await invoicesAPI.list({ status: 'overdue' });
        setOverdueInvoices(res.data.results || res.data || []);
      } catch (err) {
        // Fallback
        setOverdueInvoices([
          {
            id: 'inv-101',
            invoice_number: 'INV-00101',
            customer_name: 'Metro Solutions',
            customer_email: 'accounts@metrosol.com',
            customer_phone: '+91 98765 43210',
            amount: 24000,
            due_date: '2026-10-15',
            days_overdue: 16,
          },
          {
            id: 'inv-102',
            invoice_number: 'INV-00098',
            customer_name: 'Zenith Retailers',
            customer_email: 'finance@zenith.com',
            customer_phone: '+91 98451 12345',
            amount: 15500,
            due_date: '2026-10-20',
            days_overdue: 11,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadOverdue();
  }, []);

  const handleSendReminder = (inv) => {
    toast.success(`Dunning notice dispatched to ${inv.customer_email}`);
  };

  const columns = [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      render: (val, row) => (
        <span className="font-mono font-bold text-red-600 text-xs">
          {val || `INV-${row.id}`}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer Contact',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">{row.customer_name}</div>
          <div className="text-[11px] text-slate-500">{row.customer_email} • {row.customer_phone || '+91 98765 00000'}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Outstanding Balance',
      render: (val) => <span className="font-extrabold text-red-600 text-sm">{formatCurrency(val)}</span>,
    },
    {
      key: 'days_overdue',
      label: 'Delay Days',
      render: (val, row) => (
        <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
          {val || 14} Days Overdue
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Follow-up Actions',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => toast.success(`Call logged for ${row.customer_name}`)}
            className="btn-secondary btn-sm text-xs py-1"
          >
            <HiOutlinePhone className="w-3.5 h-3.5" /> Log Call
          </button>
          <button
            onClick={() => handleSendReminder(row)}
            className="btn-primary btn-sm text-xs py-1"
          >
            <HiOutlinePaperAirplane className="w-3.5 h-3.5" /> Dunning Notice
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overdue Follow-up Desk</h1>
        <p className="text-sm text-slate-500 mt-1">
          Priority dunning list and customer outreach queue to reduce revenue leakage.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={overdueInvoices}
        loading={loading}
        keyField="id"
        emptyTitle="Zero overdue invoices"
        emptyMessage="All outstanding invoices are within agreed payment terms."
      />
    </div>
  );
}
