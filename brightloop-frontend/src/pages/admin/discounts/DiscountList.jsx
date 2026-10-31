import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineTag,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineTicket,
  HiOutlineClock,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { DataTable, Modal, ConfirmDialog, StatusBadge } from '@/components/common';
import { discountsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';
import DiscountForm from './DiscountForm';

export default function DiscountList() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null });

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await discountsAPI.list();
      setDiscounts(response.data.results || response.data || []);
    } catch (err) {
      toast.error('Failed to load discount rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleCreate = () => {
    setSelectedDiscount(null);
    setIsFormOpen(true);
  };

  const handleEdit = (d) => {
    setSelectedDiscount(d);
    setIsFormOpen(true);
  };

  const handleDeletePrompt = (d) => {
    setDeleteConfirm({ isOpen: true, item: d });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.item) return;
    try {
      await discountsAPI.delete(deleteConfirm.item.id);
      toast.success('Discount rule deleted');
      setDeleteConfirm({ isOpen: false, item: null });
      fetchDiscounts();
    } catch (err) {
      toast.error('Failed to delete discount rule');
    }
  };

  const isExpired = (item) => {
    if (!item.end_date) return false;
    return new Date(item.end_date) < new Date();
  };

  const isExhausted = (item) => {
    if (!item.usage_limit) return false;
    return (item.times_used || 0) >= item.usage_limit;
  };

  const columns = [
    {
      key: 'name',
      label: 'Discount Rule / Code',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <HiOutlineTicket className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{val}</div>
            <div className="text-xs text-slate-400 font-mono">{row.code || 'AUTO_PROMO'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Discount Benefit',
      render: (val, row) => (
        <div className="font-bold text-slate-900">
          {val === 'percentage' ? (
            <span className="text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full text-xs">
              {row.value}% OFF
            </span>
          ) : (
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
              {formatCurrency(row.value)} OFF
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'scope',
      label: 'Applicable Scope',
      render: (_, row) => (
        <span className="text-xs text-slate-600 capitalize">
          {row.apply_to === 'product'
            ? `${row.products?.length || 1} specific product(s)`
            : 'Whole Subscription'}
        </span>
      ),
    },
    {
      key: 'usage',
      label: 'Usage Count',
      render: (_, row) => (
        <div className="text-xs text-slate-700">
          <span className="font-semibold">{row.times_used || 0}</span>
          <span className="text-slate-400"> / {row.usage_limit ? `${row.usage_limit} max` : 'Unlimited'}</span>
        </div>
      ),
    },
    {
      key: 'validity',
      label: 'Validity Window',
      render: (_, row) => {
        const expired = isExpired(row);
        return (
          <div className={`text-xs ${expired ? 'text-red-500' : 'text-slate-600'}`}>
            {row.start_date ? formatDate(row.start_date) : 'Always'}
            {' → '}
            {row.end_date ? formatDate(row.end_date) : 'No Expiry'}
            {expired && <span className="block text-[10px] font-bold text-red-600">EXPIRED</span>}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        if (isExpired(row)) return <StatusBadge status="expired" />;
        if (isExhausted(row)) return <span className="badge-gray">Exhausted</span>;
        return <StatusBadge status={row.is_active !== false ? 'active' : 'closed'} />;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeletePrompt(row)}
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discounts & Promotion Rules</h1>
          <p className="text-sm text-slate-500 mt-1">
            Administer percentage and fixed vouchers with usage caps, product restrictions, and automated expiry.
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <HiOutlinePlus className="w-4 h-4" />
          Create Discount Rule
        </button>
      </div>

      <DataTable
        columns={columns}
        data={discounts}
        loading={loading}
        keyField="id"
        emptyTitle="No discounts configured"
        emptyMessage="Create a discount rule to provide incentives on subscription quotations and billing runs."
        emptyAction={
          <button onClick={handleCreate} className="btn-primary btn-sm">
            <HiOutlinePlus className="w-4 h-4" /> Create Discount Rule
          </button>
        }
      />

      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedDiscount ? 'Edit Discount Rule' : 'Create Discount Rule'}
          size="lg"
        >
          <DiscountForm
            discount={selectedDiscount}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchDiscounts();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, item: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Discount Rule"
        message={`Delete discount "${deleteConfirm.item?.name}"? Future invoices will no longer be eligible for this promotion.`}
        confirmText="Delete Rule"
        isDanger={true}
      />
    </div>
  );
}
