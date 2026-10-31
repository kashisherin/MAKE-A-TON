import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlineEye, HiOutlinePaperAirplane } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { DataTable, SearchInput, StatusBadge } from '@/components/common';
import { invoicesAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function StaffInvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadInvoices() {
      setLoading(true);
      try {
        const res = await invoicesAPI.list({ search: search || undefined });
        setInvoices(res.data.results || res.data || []);
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, [search]);

  const columns = [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      render: (val, row) => (
        <span className="font-mono font-semibold text-slate-900 text-xs">
          {val || `INV-${row.id}`}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (val, row) => row.customer_name || val?.name || 'Customer',
    },
    {
      key: 'total_amount',
      label: 'Total',
      render: (val) => <span className="font-bold text-slate-900">{formatCurrency(val)}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      render: (val, row) => formatDate(val || row.created_at),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'actions',
      label: 'Action',
      className: 'text-right',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/admin/invoices/${row.id}`)}
          className="btn-secondary btn-sm"
        >
          <HiOutlineEye className="w-4 h-4" /> View
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoices & Billing Workspace</h1>
        <p className="text-sm text-slate-500 mt-1">Review invoices and send billing statements to customers.</p>
      </div>

      <div className="w-80">
        <SearchInput
          placeholder="Search by invoice # or customer..."
          value={search}
          onChange={setSearch}
        />
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        keyField="id"
        emptyTitle="No invoices listed"
      />
    </div>
  );
}
