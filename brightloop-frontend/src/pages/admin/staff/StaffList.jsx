import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineEnvelope,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import {
  DataTable,
  Pagination,
  SearchInput,
  Avatar,
  StatusBadge,
  Modal,
} from '@/components/common';
import { usersAPI } from '@/api/endpoints';
import { formatDate } from '@/utils/helpers';
import StaffForm from './StaffForm';

export default function StaffList() {
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        role: 'staff',
        page,
        page_size: pageSize,
        search: search || undefined,
      };
      const response = await usersAPI.list(params);
      const data = response.data;
      if (data.results) {
        setStaffMembers(data.results);
        setTotalCount(data.count || data.results.length);
      } else if (Array.isArray(data)) {
        setStaffMembers(data.filter((u) => u.role === 'staff' || u.role === 'admin'));
        setTotalCount(data.length);
      }
    } catch (err) {
      toast.error('Failed to load internal staff');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleToggleActive = async (member) => {
    try {
      if (member.is_active) {
        await usersAPI.deactivate(member.id);
        toast.success(`Staff account deactivated`);
      } else {
        await usersAPI.activate(member.id);
        toast.success(`Staff account activated`);
      }
      fetchStaff();
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Staff Member',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${row.first_name || ''} ${row.last_name || ''}`} />
          <div>
            <div className="font-semibold text-slate-900">
              {row.first_name} {row.last_name}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <HiOutlineEnvelope className="w-3 h-3" />
              {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (val) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <HiOutlineShieldCheck className="w-3.5 h-3.5" />
          {val === 'admin' ? 'Administrator' : 'Internal Staff'}
        </span>
      ),
    },
    {
      key: 'date_joined',
      label: 'Added Date',
      render: (val) => formatDate(val || new Date()),
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
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleToggleActive(row)}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
              row.is_active
                ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Internal Staff Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Authorize team members with operational billing and subscription follow-up permissions.
          </p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="btn-primary">
          <HiOutlinePlus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={staffMembers}
        loading={loading}
        keyField="id"
        emptyTitle="No staff members found"
        emptyMessage="Add internal staff to assist in managing customer accounts and processing invoices."
        emptyAction={
          <button onClick={() => setIsFormOpen(true)} className="btn-primary btn-sm">
            <HiOutlinePlus className="w-4 h-4" /> Add Staff Member
          </button>
        }
      />

      {!loading && staffMembers.length > 0 && (
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

      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Add Internal Staff Member"
          size="md"
        >
          <StaffForm
            onSuccess={() => {
              setIsFormOpen(false);
              fetchStaff();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
