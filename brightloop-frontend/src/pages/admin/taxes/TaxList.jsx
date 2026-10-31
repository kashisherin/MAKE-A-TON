import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineReceiptPercent,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { DataTable, Modal, ConfirmDialog } from '@/components/common';
import { taxesAPI } from '@/api/endpoints';
import TaxForm from './TaxForm';

export default function TaxList() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, tax: null });

  const fetchTaxes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await taxesAPI.list();
      setTaxes(response.data.results || response.data || []);
    } catch (err) {
      toast.error('Failed to load tax rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const handleCreate = () => {
    setSelectedTax(null);
    setIsFormOpen(true);
  };

  const handleEdit = (tax) => {
    setSelectedTax(tax);
    setIsFormOpen(true);
  };

  const handleDeletePrompt = (tax) => {
    setDeleteConfirm({ isOpen: true, tax });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.tax) return;
    try {
      await taxesAPI.delete(deleteConfirm.tax.id);
      toast.success('Tax rule deleted');
      setDeleteConfirm({ isOpen: false, tax: null });
      fetchTaxes();
    } catch (err) {
      toast.error('Failed to delete tax rule');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Tax Name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <HiOutlineReceiptPercent className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{val}</div>
            <div className="text-xs text-slate-400">{row.description || 'Statutory calculation rule'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'rate',
      label: 'Tax Rate (%)',
      render: (val) => (
        <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100">
          {val}%
        </span>
      ),
    },
    {
      key: 'tax_type',
      label: 'Tax Type',
      render: (val) => (
        <span className="capitalize text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
          {val || 'Exclusive'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            val !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {val !== false ? 'Active' : 'Disabled'}
        </span>
      ),
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tax Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure GST, VAT, and inclusive/exclusive sales tax rules applied to automated invoices.
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <HiOutlinePlus className="w-4 h-4" />
          Add Tax Rule
        </button>
      </div>

      <DataTable
        columns={columns}
        data={taxes}
        loading={loading}
        keyField="id"
        emptyTitle="No tax rules configured"
        emptyMessage="Add tax rules such as GST 18%, VAT 5%, or sales tax."
        emptyAction={
          <button onClick={handleCreate} className="btn-primary btn-sm">
            <HiOutlinePlus className="w-4 h-4" /> Add Tax Rule
          </button>
        }
      />

      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedTax ? 'Edit Tax Rule' : 'Create Tax Rule'}
          size="md"
        >
          <TaxForm
            tax={selectedTax}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchTaxes();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, tax: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Tax Rule"
        message={`Are you sure you want to delete tax rule "${deleteConfirm.tax?.name}"? Existing invoices will maintain their historical recorded calculation.`}
        confirmText="Delete Rule"
        isDanger={true}
      />
    </div>
  );
}
