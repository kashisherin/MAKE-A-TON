import React from 'react';

const defaultIcon = (
  <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

export default function EmptyState({
  icon = null,
  title = 'No data found',
  message = 'There are no items to display at this time.',
  actionLabel = '',
  onAction = null,
  actionIcon = null,
  compact = false,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} ${className}`}>
      <div className={`mb-4 rounded-full bg-slate-50 ${compact ? 'p-3' : 'p-5'}`}>
        {icon || defaultIcon}
      </div>
      <h3 className={`font-semibold text-slate-700 ${compact ? 'text-sm' : 'text-base'}`}>
        {title}
      </h3>
      {message && (
        <p className={`mt-1 max-w-sm text-slate-500 ${compact ? 'text-xs' : 'text-sm'}`}>
          {message}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {actionIcon && <span className="h-4 w-4">{actionIcon}</span>}
          {actionLabel}
        </button>
      )}
    </div>
  );
}
