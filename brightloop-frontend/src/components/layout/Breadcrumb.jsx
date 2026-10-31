import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineChevronRight, HiOutlineHome } from 'react-icons/hi2';

const routeLabels = {
  admin: 'Admin',
  staff: 'Staff',
  customer: 'Customer',
  dashboard: 'Dashboard',
  customers: 'Customers',
  products: 'Products',
  plans: 'Plans',
  quotations: 'Quotations',
  subscriptions: 'Subscriptions',
  invoices: 'Invoices',
  payments: 'Payments',
  taxes: 'Taxes',
  discounts: 'Discounts',
  settings: 'Settings',
  'flexi-bill': 'FLEXI-BILL',
  pulse: 'PULSE',
  'digital-twin': 'Digital Twin AI',
  'audit-trail': 'Audit Trail',
  overdue: 'Overdue',
  reports: 'Reports',
  wallet: 'My Wallet',
  'usage-history': 'Usage History',
  recommendations: 'Savings & Recommendations',
  create: 'Create',
  edit: 'Edit',
  view: 'View',
};

function formatSegment(segment) {
  if (routeLabels[segment]) return routeLabels[segment];
  // If it looks like a UUID or ID, show shortened version
  if (/^[0-9a-f-]{20,}$/i.test(segment)) return `#${segment.slice(0, 8)}`;
  // Capitalize words
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Breadcrumb() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) return null;

  const crumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = formatSegment(segment);
    const isLast = index === pathSegments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        to={`/${pathSegments[0]}/dashboard`}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <HiOutlineHome className="w-4 h-4" />
      </Link>
      {crumbs.slice(1).map((crumb) => (
        <React.Fragment key={crumb.path}>
          <HiOutlineChevronRight className="w-3.5 h-3.5 text-slate-300" />
          {crumb.isLast ? (
            <span className="font-medium text-slate-800">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
