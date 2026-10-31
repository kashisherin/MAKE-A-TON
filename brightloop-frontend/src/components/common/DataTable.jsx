import React from 'react';
import {
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronUpDown,
} from 'react-icons/hi2';
import LoadingSpinner, { Spinner } from './LoadingSpinner';
import EmptyState from './EmptyState';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  loading = false,
  emptyMessage = 'No records found',
  emptyTitle = 'No data available',
  emptyAction,
  onRowClick,
  sortBy,
  sortOrder = 'asc',
  onSort,
  selectedRows,
  onSelectRow,
  onSelectAll,
  className = '',
}) {
  const isSelectable = !!onSelectRow;
  const allSelected =
    isSelectable &&
    data.length > 0 &&
    data.every((row) => selectedRows?.includes(row[keyField]));
  const someSelected =
    isSelectable &&
    !allSelected &&
    data.some((row) => selectedRows?.includes(row[keyField]));

  const handleHeaderCheckboxChange = (e) => {
    if (onSelectAll) {
      onSelectAll(e.target.checked);
    }
  };

  return (
    <div className={`table-container bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {isSelectable && (
                <th scope="col" className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleHeaderCheckboxChange}
                  />
                </th>
              )}
              {columns.map((col, index) => {
                const isSorted = sortBy === col.key;
                const canSort = col.sortable && onSort;
                return (
                  <th
                    key={col.key || index}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                      canSort ? 'cursor-pointer select-none hover:bg-slate-100 transition-colors' : ''
                    } ${col.headerClassName || ''}`}
                    onClick={() => canSort && onSort(col.key)}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {canSort && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <HiOutlineChevronUp className="w-3.5 h-3.5 text-brand-600 font-bold" />
                            ) : (
                              <HiOutlineChevronDown className="w-3.5 h-3.5 text-brand-600 font-bold" />
                            )
                          ) : (
                            <HiOutlineChevronUpDown className="w-3.5 h-3.5 opacity-50 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (isSelectable ? 1 : 0)}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Spinner size="lg" />
                    <p className="text-sm font-medium text-slate-500">Loading data...</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (isSelectable ? 1 : 0)}
                  className="px-6 py-12 text-center"
                >
                  <EmptyState
                    title={emptyTitle}
                    message={emptyMessage}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowKey = row[keyField] ?? rowIndex;
                const isSelected = selectedRows?.includes(rowKey);
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors duration-100 ${
                      onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'
                    } ${isSelected ? 'bg-brand-50/50' : ''}`}
                  >
                    {isSelectable && (
                      <td
                        className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          checked={isSelected || false}
                          onChange={(e) => onSelectRow(rowKey, e.target.checked)}
                        />
                      </td>
                    )}
                    {columns.map((col, colIndex) => {
                      const val = col.key ? row[col.key] : null;
                      return (
                        <td
                          key={col.key || colIndex}
                          className={`px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap ${
                            col.className || ''
                          }`}
                        >
                          {col.render ? col.render(val, row, rowIndex) : (val ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
