import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineBolt,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineClock,
  HiOutlineArrowLeft,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { DataTable, Modal, ConfirmDialog, StatusBadge } from '@/components/common';
import { flexiBillAPI } from '@/api/endpoints';
import { formatCurrency } from '@/utils/helpers';
import AccessProductForm from './AccessProductForm';

export default function AccessProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await flexiBillAPI.listAccessProducts();
      setProducts(response.data.results || response.data || []);
    } catch (err) {
      toast.error('Failed to load access products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleEdit = (p) => {
    setSelectedProduct(p);
    setIsModalOpen(true);
  };

  const columns = [
    {
      key: 'name',
      label: 'Access Package',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <HiOutlineBolt className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{val}</div>
            <div className="text-xs text-slate-400 capitalize">{row.access_type?.replace('_', ' ')}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'access_type',
      label: 'Model',
      render: (val) => (
        <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
          {val?.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Price (₹)',
      render: (val) => <span className="font-bold text-slate-900">{formatCurrency(val)}</span>,
    },
    {
      key: 'quota',
      label: 'Entitlement Quota',
      render: (_, row) => (
        <div className="text-xs text-slate-700">
          {row.access_type === 'time_based' && (
            <span>{row.duration_minutes ? `${row.duration_minutes} Minutes` : `${row.duration_hours || 1} Hours`}</span>
          )}
          {row.access_type === 'usage_based' && (
            <span>{row.usage_limit || 10} Units / Actions</span>
          )}
          {row.access_type === 'feature_based' && (
            <span>Feature Key: {row.feature_key || 'PREMIUM_TOOLS'}</span>
          )}
          {row.access_type === 'content_based' && (
            <span>{row.view_limit || 1} Views ({row.access_hours || 24}h pass)</span>
          )}
          {row.access_type === 'hybrid' && (
            <span>Base + ₹{row.overage_rate || 5}/op</span>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => <StatusBadge status={val !== false ? 'active' : 'closed'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (_, row) => (
        <button
          onClick={() => handleEdit(row)}
          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <HiOutlinePencilSquare className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/flexibill"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to FLEXI-BILL
        </Link>
        <button
          onClick={() => {
            setSelectedProduct(null);
            setIsModalOpen(true);
          }}
          className="btn-primary"
        >
          <HiOutlinePlus className="w-4 h-4" /> Create Micro-Product
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configured Access Products</h1>
        <p className="text-sm text-slate-500 mt-1">
          Catalog of micro-subscriptions and pay-per-use offers presented to customers.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        keyField="id"
        emptyTitle="No micro-products configured"
        emptyMessage="Create your first flexible access product to empower pay-per-use billing."
      />

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedProduct ? 'Edit Access Product' : 'Create Flexible Access Product'}
          size="lg"
        >
          <AccessProductForm
            product={selectedProduct}
            onSuccess={() => {
              setIsModalOpen(false);
              fetchProducts();
            }}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
