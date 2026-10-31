import React from 'react';
import { getInitials, stringToColor } from '@/utils/helpers';

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export default function Avatar({
  name = '',
  src = null,
  size = 'md',
  className = '',
}) {
  const initials = getInitials(name);
  const bgColor = stringToColor(name);
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white ${className}`}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {initials}
    </div>
  );
}
