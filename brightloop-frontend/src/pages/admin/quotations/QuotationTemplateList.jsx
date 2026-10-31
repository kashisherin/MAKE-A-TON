import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineBookmarkSquare,
  HiOutlinePlus,
  HiOutlineArrowLeft,
  HiOutlineTrash,
  HiOutlineDocumentDuplicate,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { DataTable, Modal, FormField } from '@/components/common';
import { quotationsAPI, productsAPI, plansAPI } from '@/api/endpoints';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function QuotationTemplateList() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateNotes, setNewTemplateNotes] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await quotationsAPI.listTemplates();
      setTemplates(res.data.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load quotation templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      toast.error('Template name is required');
      return;
    }
    try {
      await quotationsAPI.createTemplate({
        name: newTemplateName.trim(),
        notes: newTemplateNotes.trim(),
      });
      toast.success('Quotation template created');
      setIsModalOpen(false);
      setNewTemplateName('');
      setNewTemplateNotes('');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to create template');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Template Name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <HiOutlineBookmarkSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{val}</div>
            <div className="text-xs text-slate-400">{row.notes || 'No description provided'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'lines_count',
      label: 'Items Prepopulated',
      render: (val, row) => `${row.lines?.length || 0} product lines`,
    },
    {
      key: 'created_at',
      label: 'Created Date',
      render: (val) => formatDate(val || new Date()),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (_, row) => (
        <Link
          to={`/admin/quotations/new?template=${row.id}`}
          className="btn-secondary btn-sm"
        >
          Use Template →
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/quotations"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Quotations
        </Link>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <HiOutlinePlus className="w-4 h-4" /> Create Template
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quotation Templates</h1>
        <p className="text-sm text-slate-500 mt-1">
          Save pre-configured line items and terms to rapidly issue recurring commercial proposals.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={templates}
        loading={loading}
        keyField="id"
        emptyTitle="No templates saved yet"
        emptyMessage="Create a reusable template to streamline quotation generation."
      />

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="New Quotation Template"
          size="md"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Template Name" required>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. Standard SaaS Enterprise Package"
                className="input-field"
                required
              />
            </FormField>
            <FormField label="Standard Notes / Terms">
              <textarea
                value={newTemplateNotes}
                onChange={(e) => setNewTemplateNotes(e.target.value)}
                rows="3"
                placeholder="Default quotation notes..."
                className="input-field resize-none"
              />
            </FormField>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Template
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
