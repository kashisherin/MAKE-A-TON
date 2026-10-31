// Role constants
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
};

// Subscription statuses
export const SUBSCRIPTION_STATUSES = {
  DRAFT: 'draft',
  QUOTATION: 'quotation',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
};

// Invoice statuses
export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  SENT: 'sent',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

// Quotation statuses
export const QUOTATION_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CONVERTED: 'converted',
};

// Billing frequencies
export const BILLING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'other', label: 'Other' },
];

// Discount types
export const DISCOUNT_TYPES = [
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'percentage', label: 'Percentage' },
];

// Access types for FlexiBill
export const ACCESS_TYPES = [
  { value: 'time_based', label: 'Time-Based Access' },
  { value: 'usage_based', label: 'Usage-Based Access' },
  { value: 'feature_based', label: 'Feature-Based Access' },
  { value: 'content_based', label: 'Content-Based Access' },
  { value: 'hybrid', label: 'Hybrid Subscription' },
];

// Health score ranges
export const HEALTH_SCORE_RANGES = {
  HEALTHY: { min: 70, max: 100, label: 'Healthy', color: '#22c55e' },
  MEDIUM_RISK: { min: 40, max: 69, label: 'Medium Risk', color: '#f59e0b' },
  HIGH_RISK: { min: 0, max: 39, label: 'High Risk', color: '#ef4444' },
};

// Product types
export const PRODUCT_TYPES = [
  { value: 'service', label: 'Service' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'digital', label: 'Digital Product' },
];

// Wallet transaction types
export const WALLET_TRANSACTION_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  REFUND: 'refund',
};

// Entitlement statuses
export const ENTITLEMENT_STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  EXHAUSTED: 'exhausted',
  REVOKED: 'revoked',
};

// Simulation types
export const SIMULATION_TYPES = [
  { value: 'price_change', label: 'Price Change Impact' },
  { value: 'discount_removal', label: 'Discount Removal Impact' },
  { value: 'churn_prediction', label: 'Churn Prediction' },
  { value: 'revenue_forecast', label: 'Revenue Forecast' },
  { value: 'upgrade_opportunity', label: 'Upgrade Opportunities' },
];

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
