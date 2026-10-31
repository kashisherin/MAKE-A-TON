import React from 'react';
import { formatCurrency } from '@/utils/helpers';

export default function CurrencyDisplay({
  amount,
  currency = 'INR',
  size = 'md',
  className = '',
  showSign = false,
}) {
  const formatted = formatCurrency(amount, currency);
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const isPositive = num > 0;
  const isNegative = num < 0;

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
    xl: 'text-2xl font-bold',
  };

  let colorClass = 'text-slate-900';
  if (showSign && isPositive) colorClass = 'text-emerald-600';
  if (showSign && isNegative) colorClass = 'text-red-600';

  return (
    <span className={`tabular-nums ${sizeClasses[size] || sizeClasses.md} ${colorClass} ${className}`}>
      {showSign && isPositive && '+'}
      {formatted}
    </span>
  );
}
