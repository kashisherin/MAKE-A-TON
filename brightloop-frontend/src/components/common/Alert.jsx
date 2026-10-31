import React, { useState } from 'react';

const variantConfig = {
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
    text: 'text-blue-700',
    closeHover: 'hover:bg-blue-100',
    iconSvg: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
  success: {
    bg: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-500',
    title: 'text-emerald-800',
    text: 'text-emerald-700',
    closeHover: 'hover:bg-emerald-100',
    iconSvg: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-800',
    text: 'text-amber-700',
    closeHover: 'hover:bg-amber-100',
    iconSvg: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    text: 'text-red-700',
    closeHover: 'hover:bg-red-100',
    iconSvg: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export default function Alert({
  variant = 'info',
  title = '',
  children,
  dismissible = false,
  onDismiss = null,
  icon = null,
  action = null,
  className = '',
}) {
  const [dismissed, setDismissed] = useState(false);
  const config = variantConfig[variant] || variantConfig.info;

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss && onDismiss();
  };

  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${className}`} role="alert">
      <div className="flex">
        <div className={`flex-shrink-0 ${config.icon}`}>
          {icon || config.iconSvg}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-semibold ${config.title}`}>{title}</h3>
          )}
          {children && (
            <div className={`${title ? 'mt-1' : ''} text-sm ${config.text}`}>
              {children}
            </div>
          )}
          {action && <div className="mt-3">{action}</div>}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={`ml-3 flex-shrink-0 rounded-md p-1 ${config.icon} ${config.closeHover} transition-colors`}
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
