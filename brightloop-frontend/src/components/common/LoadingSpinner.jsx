import React from 'react';

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4',
};

function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizeClasses[size] || sizeClasses.md} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function InlineSpinner({ size = 'sm', label = '' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size={size} />
      {label && <span className="text-sm text-slate-500">{label}</span>}
    </span>
  );
}

export default function LoadingSpinner({
  size = 'lg',
  message = 'Loading...',
  fullPage = true,
  overlay = false,
}) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Spinner size={size} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`rounded-full bg-blue-500 ${size === 'xl' ? 'h-3 w-3' : 'h-2 w-2'} animate-pulse`} />
        </div>
      </div>
      {message && (
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">{message}</p>
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  if (fullPage) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

LoadingSpinner.Inline = InlineSpinner;
