import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineCube,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineTag,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import {
  DataTable,
  Pagination,
  SearchInput,
  FilterBar,
  StatusBadge,
  ConfirmDialog,
  Modal,
} from '@/components/common';
import { productsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';
import ProductForm from './ProductForm';

const TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Service', value: 'service' },
  { label: 'Consumable', value: 'consumable' },
  { label: 'Digital', value: 'digital' },
];

const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        type: typeFilter || undefined,
        is_active: statusFilter !== '' ? statusFilter : undefined,
      };
      const response = await productsAPI.list(params);
      const data = response.data;
      if (data.results) {
        setProducts(data.results);
        setTotalCount(data.count || data.results.length);
      } else if (Array.isArray(data)) {
        setProducts(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreate = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product, e) => {
    e?.stopPropagation();
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleDeletePrompt = (product, e) => {
    e?.stopPropagation();
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!productToDelete) return;
    try {
      await productsAPI.deactivate(productToDelete.id);
      toast.success(`Product "${productToDelete.name}" deactivated`);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      toast.error('Failed to deactivate product');
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedProduct(null);
    fetchProducts();
  };

  const columns = [
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
            <HiOutlineCube className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{row.name}</div>
            {row.code && <div className="text-xs text-slate-400">SKU: {row.code}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (val) => (
        <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {val || 'Service'}
        </span>
      ),
    },
    {
      key: 'sales_price',
      label: 'Sales Price',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-slate-900">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'cost_price',
      label: 'Cost Price',
      render: (val) => (
        <span className="text-slate-600">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'variants_count',
      label: 'Variants',
      render: (val, row) => {
        const count = row.variants?.length ?? val ?? 0;
        return (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium bg-slate-50 px-2 py-1 rounded">
            <HiOutlineTag className="w-3.5 h-3.5 text-slate-400" />
            {count} {count === 1 ? 'variant' : 'variants'}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <StatusBadge status={val !== false ? 'active' : 'closed'} />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/admin/products/${row.id}`)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Details"
          >
            <HiOutlineEye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => handleEdit(row, e)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Product"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
          </button>
          {row.is_active !== false && (
            <button
              onClick={(e) => handleDeletePrompt(row, e)}
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Deactivate Product"
            >
              <HiOutlineTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Services</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your subscription catalog, standalone products, and pricing variants.
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <HiOutlinePlus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search products or SKU..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            className="select-field text-sm py-2"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className="select-field text-sm py-2"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        keyField="id"
        emptyTitle="No products found"
        emptyMessage="Try adjusting your search criteria or add your first product."
        emptyAction={
          <button onClick={handleCreate} className="btn-primary btn-sm">
            <HiOutlinePlus className="w-4 h-4" /> Add Product
          </button>
        }
        onRowClick={(row) => navigate(`/admin/products/${row.id}`)}
      />

      {/* Pagination */}
      {!loading && products.length > 0 && (
        <Pagination
          currentPage={page}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* Product Form Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedProduct ? 'Edit Product' : 'Create New Product'}
          size="lg"
        >
          <ProductForm
            product={selectedProduct}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>
      )}

      {/* Confirm Deactivate Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate "${productToDelete?.name}"? Deactivated products cannot be added to new subscription plans.`}
        confirmText="Deactivate"
        isDanger={true}
      />
    </div>
  );
}
