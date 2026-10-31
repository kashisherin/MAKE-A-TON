import React from 'react';

export default function FormField({
  label,
  htmlFor,
  required = false,
  error = '',
  helpText = '',
  children,
  className = '',
}) {
  return (
    <div className={`${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="mt-1.5 text-sm text-slate-500">{helpText}</p>
      )}
    </div>
  );
}
