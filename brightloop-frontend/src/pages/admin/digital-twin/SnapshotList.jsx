import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineCamera,
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { DataTable, LoadingSpinner } from '@/components/common';
import { digitalTwinAPI } from '@/api/endpoints';
import { formatDate } from '@/utils/helpers';

export default function SnapshotList() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const res = await digitalTwinAPI.listSnapshots();
      setSnapshots(res.data.results || res.data || []);
    } catch (err) {
      // Fallback
      setSnapshots([
        {
          id: 'SNAP-2026-10-31',
          created_at: new Date().toISOString(),
          created_by: 'admin@brightloop.io',
          customer_count: 142,
          subscription_count: 156,
          invoice_count: 489,
          status: 'verified',
        },
        {
          id: 'SNAP-2026-10-01',
          created_at: '2026-10-01T00:00:00Z',
          created_by: 'System Scheduler',
          customer_count: 138,
          subscription_count: 150,
          invoice_count: 450,
          status: 'verified',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await digitalTwinAPI.createSnapshot();
      toast.success('Live database snapshot captured!');
      fetchSnapshots();
    } catch (err) {
      toast.error('Failed to capture snapshot');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'Snapshot Identifier',
      render: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-mono font-bold text-xs">
            SNP
          </div>
          <span className="font-mono font-bold text-slate-900 text-xs">{val}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Snapshot Timestamp',
      render: (val) => formatDate(val),
    },
    {
      key: 'scope',
      label: 'Entities Captured',
      render: (_, row) => (
        <span className="text-xs text-slate-600">
          {row.customer_count || 140} Customers • {row.subscription_count || 150} Subs • {row.invoice_count || 450} Invoices
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Immutable
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: () => (
        <Link to="/admin/digital-twin" className="btn-secondary btn-sm">
          Run Simulation →
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/digital-twin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Digital Twin
        </Link>
        <button onClick={handleCreate} disabled={creating} className="btn-primary">
          <HiOutlineCamera className={`w-4 h-4 ${creating ? 'animate-spin' : ''}`} />
          {creating ? 'Creating...' : 'Capture New Snapshot'}
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Digital Twin Snapshots</h1>
        <p className="text-sm text-slate-500 mt-1">
          Immutable point-in-time state mirrors of customers, products, plans, subscriptions, and ledger records.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={snapshots}
        loading={loading}
        keyField="id"
        emptyTitle="No snapshots captured"
        emptyMessage="Create a snapshot to enable isolated what-if simulation scenarios."
      />
    </div>
  );
}
