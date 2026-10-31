import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineCube,
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTag,
  HiOutlineRectangleStack,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { LoadingSpinner, StatusBadge, Modal } from '@/components/common';
import { productsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';
import ProductForm from './ProductForm';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await productsAPI.get(id);
      setProduct(response.data);
    } catch (err) {
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading product information..." />;
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Product not found.</p>
        <Link to="/admin/products" className="btn-primary mt-4">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/products')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Products
        </button>
        <button onClick={() => setIsEditOpen(true)} className="btn-primary btn-sm">
          <HiOutlinePencilSquare className="w-4 h-4" /> Edit Product
        </button>
      </div>

      {/* Main Info Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-2xl shadow-sm">
              <HiOutlineCube className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
                <StatusBadge status={product.is_active ? 'active' : 'closed'} />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                SKU: <span className="font-mono text-slate-700">{product.code || 'N/A'}</span> • Type: <span className="capitalize text-slate-700">{product.type}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end">
            <div className="text-sm text-slate-400">Sales Price</div>
            <div className="text-3xl font-extrabold text-slate-900">
              {formatCurrency(product.sales_price)}
            </div>
            {product.cost_price > 0 && (
              <div className="text-xs text-slate-500 mt-1">
                Cost: {formatCurrency(product.cost_price)} (Margin: {formatCurrency(product.sales_price - product.cost_price)})
              </div>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Type</h4>
            <p className="text-sm font-medium text-slate-800 capitalize mt-1">{product.type || 'Service'}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Created Date</h4>
            <p className="text-sm font-medium text-slate-800 mt-1">{formatDate(product.created_at || new Date())}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Variants</h4>
            <p className="text-sm font-medium text-slate-800 mt-1">{product.variants?.length || 0} configured</p>
          </div>
        </div>

        {product.notes && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description & Notes</h4>
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-lg">
              {product.notes}
            </p>
          </div>
        )}
      </div>

      {/* Variants Section */}
      <div className="card p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <HiOutlineTag className="w-5 h-5 text-brand-600" />
          Product Variants & Pricing
        </h3>

        {product.variants && product.variants.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {product.variants.map((variant, index) => {
              const basePrice = parseFloat(product.sales_price) || 0;
              const adjustment = parseFloat(variant.price_adjustment) || 0;
              const finalPrice = basePrice + adjustment;
              return (
                <div key={variant.id || index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <h5 className="font-semibold text-slate-900 text-sm">{variant.name}</h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Base {formatCurrency(basePrice)} {adjustment >= 0 ? `+ ${formatCurrency(adjustment)}` : `- ${formatCurrency(Math.abs(adjustment))}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(finalPrice)}
                    </span>
                    <span className="block text-[11px] text-slate-400 font-medium">Final Price</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No variants configured for this product.</p>
        )}
      </div>

      {isEditOpen && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Product"
          size="lg"
        >
          <ProductForm
            product={product}
            onSuccess={() => {
              setIsEditOpen(false);
              fetchProduct();
            }}
            onCancel={() => setIsEditOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
