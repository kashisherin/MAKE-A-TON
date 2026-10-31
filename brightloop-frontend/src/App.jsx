import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common';

// Layouts
import {
  AdminLayout,
  StaffLayout,
  CustomerLayout,
  AuthLayout,
} from '@/components/layout';

// Auth Pages
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from '@/pages/auth';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import { CustomerList, CustomerDetail } from '@/pages/admin/customers';
import { StaffList } from '@/pages/admin/staff';
import { ProductList, ProductDetail } from '@/pages/admin/products';
import { PlanList, PlanDetail } from '@/pages/admin/plans';
import {
  QuotationList,
  QuotationForm,
  QuotationDetail,
  QuotationTemplateList,
} from '@/pages/admin/quotations';
import {
  SubscriptionList,
  SubscriptionForm,
  SubscriptionDetail,
} from '@/pages/admin/subscriptions';
import {
  InvoiceList,
  InvoiceDetail,
  InvoiceForm,
} from '@/pages/admin/invoices';
import { PaymentList } from '@/pages/admin/payments';
import { TaxList } from '@/pages/admin/taxes';
import { DiscountList } from '@/pages/admin/discounts';
import {
  FlexiBillDashboard,
  AccessProductList,
  AccessProductForm,
} from '@/pages/admin/flexibill';
import {
  PulseDashboard,
  HealthScoreDetail,
  UtilizationReport,
} from '@/pages/admin/pulse';
import {
  DigitalTwinDashboard,
  SimulationResult,
  SnapshotList,
} from '@/pages/admin/digital-twin';
import { AuditDashboard } from '@/pages/admin/audit';
import { SettingsPage } from '@/pages/admin/settings';

// Staff Pages
import {
  StaffDashboard,
  StaffCustomerList,
  StaffSubscriptionList,
  StaffInvoiceList,
  StaffOverdueList,
} from '@/pages/staff';

// Customer Pages
import CustomerDashboard from '@/pages/customer/CustomerDashboard';
import {
  MySubscriptions,
  AvailablePlans,
  SubscriptionDetail as CustomerSubscriptionDetail,
  SavingsRecommendations,
} from '@/pages/customer/subscriptions';
import { MyInvoices, InvoiceView } from '@/pages/customer/invoices';
import { MyPayments } from '@/pages/customer/payments';
import { FlexiStore, EntitlementsList, SmartOptimizer } from '@/pages/customer/flexibill';
import { WalletPage } from '@/pages/customer/wallet';
import AccountSettings from '@/pages/customer/AccountSettings';

import NotFoundPage from '@/pages/NotFoundPage';

// Route Guard component
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Authenticating session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect based on actual role
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'staff') return <Navigate to="/staff/dashboard" replace />;
    return <Navigate to="/customer/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === 'admin' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : user?.role === 'staff' ? (
              <Navigate to="/staff/dashboard" replace />
            ) : (
              <Navigate to="/customer/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* ADMIN PORTAL */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />

        {/* Business */}
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="staff" element={<StaffList />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="plans" element={<PlanList />} />
        <Route path="plans/:id" element={<PlanDetail />} />
        <Route path="quotations" element={<QuotationList />} />
        <Route path="quotations/new" element={<QuotationForm />} />
        <Route path="quotations/templates" element={<QuotationTemplateList />} />
        <Route path="quotations/:id" element={<QuotationDetail />} />
        <Route path="quotations/:id/edit" element={<QuotationForm />} />

        {/* Operations */}
        <Route path="subscriptions" element={<SubscriptionList />} />
        <Route path="subscriptions/new" element={<SubscriptionForm />} />
        <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="subscriptions/:id/edit" element={<SubscriptionForm />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="invoices/new" element={<InvoiceForm />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="payments" element={<PaymentList />} />

        {/* Financial */}
        <Route path="taxes" element={<TaxList />} />
        <Route path="discounts" element={<DiscountList />} />

        {/* Intelligence Innovations */}
        <Route path="flexibill" element={<FlexiBillDashboard />} />
        <Route path="flexi-bill" element={<FlexiBillDashboard />} />
        <Route path="flexibill/products" element={<AccessProductList />} />
        <Route path="flexibill/products/new" element={<AccessProductForm />} />

        <Route path="pulse" element={<PulseDashboard />} />
        <Route path="pulse/customer/:id" element={<HealthScoreDetail />} />
        <Route path="pulse/utilization" element={<UtilizationReport />} />

        <Route path="digital-twin" element={<DigitalTwinDashboard />} />
        <Route path="digital-twin/snapshots" element={<SnapshotList />} />
        <Route path="digital-twin/results/:id" element={<SimulationResult />} />

        {/* System */}
        <Route path="audit" element={<AuditDashboard />} />
        <Route path="audit-trail" element={<AuditDashboard />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* STAFF PORTAL */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/staff/dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="customers" element={<StaffCustomerList />} />
        <Route path="quotations" element={<QuotationList />} />
        <Route path="subscriptions" element={<StaffSubscriptionList />} />
        <Route path="invoices" element={<StaffInvoiceList />} />
        <Route path="payments" element={<PaymentList />} />
        <Route path="overdue" element={<StaffOverdueList />} />
        <Route path="reports" element={<PulseDashboard />} />
      </Route>

      {/* CUSTOMER PORTAL */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />

        {/* Subscriptions */}
        <Route path="subscriptions" element={<MySubscriptions />} />
        <Route path="subscriptions/:id" element={<CustomerSubscriptionDetail />} />
        <Route path="plans" element={<AvailablePlans />} />

        {/* Billing */}
        <Route path="invoices" element={<MyInvoices />} />
        <Route path="invoices/:id" element={<InvoiceView />} />
        <Route path="payments" element={<MyPayments />} />

        {/* Flexi-Bill */}
        <Route path="flexistore" element={<FlexiStore />} />
        <Route path="flexi-bill" element={<FlexiStore />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="entitlements" element={<EntitlementsList />} />
        <Route path="usage-history" element={<EntitlementsList />} />
        <Route path="optimizer" element={<SmartOptimizer />} />

        {/* Intelligence Recommendations */}
        <Route path="savings" element={<SavingsRecommendations />} />
        <Route path="recommendations" element={<SavingsRecommendations />} />

        {/* Account Settings */}
        <Route path="settings" element={<AccountSettings />} />
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
