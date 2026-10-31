import React from 'react';
import { getStatusConfig } from '@/utils/helpers';

const badgeColorMap = {
  'badge-green': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'badge-blue': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  'badge-yellow': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  'badge-red': 'bg-red-50 text-red-700 ring-red-600/20',
  'badge-gray': 'bg-slate-50 text-slate-600 ring-slate-500/20',
  'badge-purple': 'bg-purple-50 text-purple-700 ring-purple-600/20',
};

const dotColorMap = {
  'badge-green': 'bg-emerald-500',
  'badge-blue': 'bg-blue-500',
  'badge-yellow': 'bg-amber-500',
  'badge-red': 'bg-red-500',
  'badge-gray': 'bg-slate-400',
  'badge-purple': 'bg-purple-500',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export default function StatusBadge({
  status,
  size = 'md',
  showDot = false,
  pulse = false,
  className = '',
}) {
  const config = getStatusConfig(status);
  const colorClasses = badgeColorMap[config.className] || badgeColorMap['badge-gray'];
  const dotColor = dotColorMap[config.className] || dotColorMap['badge-gray'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${colorClasses} ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`} />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColor}`} />
        </span>
      )}
      {config.label}
    </span>
  );
}
