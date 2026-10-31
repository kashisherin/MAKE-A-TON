import React from 'react';

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
};

const trackClasses = {
  blue: 'bg-blue-100',
  green: 'bg-emerald-100',
  yellow: 'bg-amber-100',
  red: 'bg-red-100',
  purple: 'bg-purple-100',
  indigo: 'bg-indigo-100',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export default function ProgressBar({
  value = 0,
  max = 100,
  label = '',
  showPercent = true,
  color = 'blue',
  size = 'md',
  animated = false,
  className = '',
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const barColor = colorClasses[color] || colorClasses.blue;
  const track = trackClasses[color] || trackClasses.blue;
  const height = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
          {showPercent && (
            <span className="text-sm font-medium text-slate-500">{percent.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full ${track} ${height}`}>
        <div
          className={`${height} rounded-full ${barColor} transition-all duration-500 ease-out ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
