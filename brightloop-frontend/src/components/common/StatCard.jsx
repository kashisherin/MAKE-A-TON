import React from 'react';

export default function StatCard({
  icon = null,
  label = '',
  value = '',
  change = null,
  changeLabel = '',
  subtitle = '',
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  loading = false,
  className = '',
  onClick = null,
}) {
  const isPositive = change !== null && change >= 0;
  const isNegative = change !== null && change < 0;

  if (loading) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-slate-100" />
            <div className="h-5 w-16 rounded bg-slate-100" />
          </div>
          <div className="mt-4 h-8 w-24 rounded bg-slate-100" />
          <div className="mt-2 h-4 w-32 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? { onClick, type: 'button', className: `w-full text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-200 cursor-pointer ${className}` }
    : { className: `rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}` };

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-center justify-between">
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgColor}`}>
            <span className={iconColor}>{icon}</span>
          </div>
        )}
        {change !== null && (
          <div
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {isPositive ? (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            ) : (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
              </svg>
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-sm text-slate-500">{label}</p>
        {changeLabel && (
          <span className={`text-xs ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-slate-400'}`}>
            {changeLabel}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      )}
    </Wrapper>
  );
}
