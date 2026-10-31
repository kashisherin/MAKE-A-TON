import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Format a currency value in INR
 */
export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a date string
 */
export function formatDate(dateStr, fmt = 'dd MMM yyyy') {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return '—';
    return format(date, fmt);
  } catch {
    return '—';
  }
}

/**
 * Format a datetime string
 */
export function formatDateTime(dateStr) {
  return formatDate(dateStr, 'dd MMM yyyy, hh:mm a');
}

/**
 * Relative time (e.g. "2 hours ago")
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return '—';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '—';
  }
}

/**
 * Format a percentage
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatCompactNumber(num) {
  if (num === null || num === undefined) return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Get initials from a name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate a deterministic color from a string
 */
export function stringToColor(str) {
  if (!str) return '#6366f1';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#06b6d4', '#6366f1', '#f43f5e', '#84cc16', '#14b8a6',
  ];
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Status badge class mapping
 */
export const statusConfig = {
  // Subscription statuses
  draft: { label: 'Draft', className: 'badge-gray', color: '#64748b' },
  quotation: { label: 'Quotation', className: 'badge-blue', color: '#3b82f6' },
  confirmed: { label: 'Confirmed', className: 'badge-blue', color: '#2563eb' },
  active: { label: 'Active', className: 'badge-green', color: '#22c55e' },
  paused: { label: 'Paused', className: 'badge-yellow', color: '#f59e0b' },
  closed: { label: 'Closed', className: 'badge-gray', color: '#94a3b8' },
  cancelled: { label: 'Cancelled', className: 'badge-red', color: '#ef4444' },
  expired: { label: 'Expired', className: 'badge-red', color: '#ef4444' },
  // Invoice statuses
  paid: { label: 'Paid', className: 'badge-green', color: '#22c55e' },
  partially_paid: { label: 'Partially Paid', className: 'badge-yellow', color: '#f59e0b' },
  overdue: { label: 'Overdue', className: 'badge-red', color: '#ef4444' },
  sent: { label: 'Sent', className: 'badge-blue', color: '#3b82f6' },
  // Quotation statuses
  pending: { label: 'Pending', className: 'badge-yellow', color: '#f59e0b' },
  accepted: { label: 'Accepted', className: 'badge-green', color: '#22c55e' },
  rejected: { label: 'Rejected', className: 'badge-red', color: '#ef4444' },
  converted: { label: 'Converted', className: 'badge-purple', color: '#8b5cf6' },
  // Health
  healthy: { label: 'Healthy', className: 'badge-green', color: '#22c55e' },
  medium_risk: { label: 'Medium Risk', className: 'badge-yellow', color: '#f59e0b' },
  high_risk: { label: 'High Risk', className: 'badge-red', color: '#ef4444' },
};

export function getStatusConfig(status) {
  if (!status) return { label: 'Unknown', className: 'badge-gray', color: '#94a3b8' };
  return statusConfig[status.toLowerCase()] || { label: status, className: 'badge-gray', color: '#94a3b8' };
}

/**
 * Validate email
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate password requirements
 */
export function validatePassword(password) {
  const errors = [];
  if (password.length < 9) errors.push('Must be longer than 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Must contain a special character');
  return { isValid: errors.length === 0, errors };
}

/**
 * Download a blob as file
 */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Build query params from an object
 */
export function buildQueryParams(params) {
  const filtered = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== null && val !== undefined && val !== '' && val !== 'all') {
      filtered[key] = val;
    }
  });
  return filtered;
}
