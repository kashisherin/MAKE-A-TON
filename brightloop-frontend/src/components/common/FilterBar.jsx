import React from 'react';

export default function FilterBar({
  filters = [],
  values = {},
  onChange,
  onReset = null,
  className = '',
}) {
  const hasActiveFilters = Object.values(values).some(
    (v) => v && v !== '' && v !== 'all'
  );

  const handleFilterChange = (name, value) => {
    onChange && onChange({ ...values, [name]: value });
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {filters.map((filter) => (
        <div key={filter.name} className="flex flex-col">
          {filter.label && (
            <label className="mb-1 text-xs font-medium text-slate-500">
              {filter.label}
            </label>
          )}
          <select
            value={values[filter.name] || 'all'}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">{filter.placeholder || `All ${filter.label || ''}`}</option>
            {(filter.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {hasActiveFilters && onReset && (
        <button
          onClick={onReset}
          className="mt-auto inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear filters
        </button>
      )}
    </div>
  );
}
