import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineChevronRight,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineBuildingOffice2,
  HiOutlineMapPin,
  HiOutlineCalendarDays,
  HiOutlineRectangleStack,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineShieldCheck,
  HiOutlinePencilSquare,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { StatCard, Badge, Spinner, EmptyState } from '@/components/common';
import { customersAPI } from '@/api/endpoints';
import { formatCurrency, formatDate, getStatusConfig } from '@/utils/helpers';

const TABS = [
  { key: 'overview', label: 'Overview', icon: HiOutlineRectangleStack },
  { key: 'subscriptions', label: 'Subscriptions', icon: HiOutlineRectangleStack },
  { key: 'invoices', label: 'Invoices', icon: HiOutlineDocumentText },
  { key: 'payments', label: 'Payments', icon: HiOutlineBanknotes },
  { key: 'health', label: 'Health Score', icon: HiOutlineShieldCheck },
];

function HealthScoreGauge({ score }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.max(0, Math.min(100, score || 0));
  const dashOffset = circumference - (normalizedScore / 100) * circumference;

  let color = '#22c55e';
  let label = 'Healthy';
  if (normalizedScore < 40) {
    color = '#ef4444';
    label = 'At Risk';
  } else if (normalizedScore < 70) {
    color = '#f59e0b';
    label = 'Warning';
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="12"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 80 80)"
          className="transition-all duration-1000 ease-out"
        />
        <text x="80" y="72" textAnchor="middle" className="text-3xl font-bold" fill="#0f172a">
          {normalizedScore}
        </text>
        <text x="80" y="96" textAnchor="middle" className="text-sm" fill="#64748b">
          {label}
        </text>
      </svg>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await customersAPI.get(id);
      setCustomer(response.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load customer';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  useEffect(() => {
    if (!id) return;

    if (activeTab === 'subscriptions' && subscriptions.length === 0 && !subsLoading) {
      setSubsLoading(true);
      customersAPI
        .getSubscriptions(id)
        .then((res) => setSubscriptions(res.data?.subscriptions || res.data?.data || res.data || []))
        .catch(() => toast.error('Failed to load subscriptions'))
        .finally(() => setSubsLoading(false));
    }

    if (activeTab === 'invoices' && invoices.length === 0 && !invoicesLoading) {
      setInvoicesLoading(true);
      customersAPI
        .getInvoices(id)
        .then((res) => setInvoices(res.data?.invoices || res.data?.data || res.data || []))
        .catch(() => toast.error('Failed to load invoices'))
        .finally(() => setInvoicesLoading(false));
    }

    if (activeTab === 'payments' && payments.length === 0 && !paymentsLoading) {
      setPaymentsLoading(true);
      customersAPI
        .getPayments(id)
        .then((res) => setPayments(res.data?.payments || res.data?.data || res.data || []))
        .catch(() => toast.error('Failed to load payments'))
        .finally(() => setPaymentsLoading(false));
    }

    if (activeTab === 'health' && !healthData && !healthLoading) {
      setHealthLoading(true);
      customersAPI
        .getHealthScore(id)
        .then((res) => setHealthData(res.data))
        .catch(() => toast.error('Failed to load health score'))
        .finally(() => setHealthLoading(false));
    }
  }, [activeTab, id, subscriptions.length, invoices.length, payments.length, healthData, subsLoading, invoicesLoading, paymentsLoading, healthLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
        <span className="ml-3 text-slate-500">Loading customer details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <HiOutlineExclamationTriangle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-semibold text-slate-700">Failed to Load Customer</h2>
        <p className="text-slate-500">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/customers')}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Back to Customers
          </button>
          <button
            onClick={fetchCustomer}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const customerName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
  const statusConf = getStatusConfig(customer.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb and Back */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={() => navigate('/admin/customers')}
          className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Back
        </button>
        <HiOutlineChevronRight className="w-3 h-3 text-slate-400" />
        <Link to="/admin/customers" className="hover:text-blue-600">
          Customers
        </Link>
        <HiOutlineChevronRight className="w-3 h-3 text-slate-400" />
        <span className="text-slate-900 font-medium">{customerName}</span>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {customerName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{customerName}</h1>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <HiOutlineEnvelope className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${customer.email}`} className="hover:text-blue-600">
                    {customer.email}
                  </a>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <HiOutlinePhone className="w-4 h-4 text-slate-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.company && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <HiOutlineBuildingOffice2 className="w-4 h-4 text-slate-400" />
                    <span>{customer.company}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <HiOutlineMapPin className="w-4 h-4 text-slate-400" />
                    <span>
                      {[customer.address.street, customer.address.city, customer.address.state, customer.address.zip, customer.address.country]
                        .filter(Boolean)
                        .join(', ') || customer.address}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <HiOutlineCalendarDays className="w-4 h-4 text-slate-400" />
                  <span>Customer since {formatDate(customer.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color={statusConf?.color || 'gray'}>
              {statusConf?.label || customer.status || 'Unknown'}
            </Badge>
            <Link
              to={`/admin/customers/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <HiOutlinePencilSquare className="w-4 h-4" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab customer={customer} />}
        {activeTab === 'subscriptions' && <SubscriptionsTab data={subscriptions} loading={subsLoading} />}
        {activeTab === 'invoices' && <InvoicesTab data={invoices} loading={invoicesLoading} />}
        {activeTab === 'payments' && <PaymentsTab data={payments} loading={paymentsLoading} />}
        {activeTab === 'health' && <HealthTab data={healthData} loading={healthLoading} customer={customer} />}
      </div>
    </div>
  );
}

function OverviewTab({ customer }) {
  const stats = customer.stats || {};
  const recentActivity = customer.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions ?? customer.subscriptionsCount ?? 0}
          icon={HiOutlineRectangleStack}
          color="blue"
        />
        <StatCard
          title="Total Invoices"
          value={stats.totalInvoices ?? 0}
          icon={HiOutlineDocumentText}
          color="indigo"
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(stats.totalPaid ?? customer.totalSpent ?? 0)}
          icon={HiOutlineBanknotes}
          color="green"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.outstanding ?? 0)}
          icon={HiOutlineClock}
          color="amber"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={activity.id || index} className="px-6 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                      activity.type === 'payment'
                        ? 'bg-green-500'
                        : activity.type === 'subscription'
                        ? 'bg-blue-500'
                        : activity.type === 'invoice'
                        ? 'bg-indigo-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(activity.createdAt)}</p>
                  </div>
                  {activity.amount && (
                    <span className="text-sm font-medium text-slate-900 flex-shrink-0">
                      {formatCurrency(activity.amount)}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubscriptionsTab({ data, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
        <span className="ml-3 text-slate-500">Loading subscriptions...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={HiOutlineRectangleStack}
        title="No subscriptions"
        description="This customer does not have any subscriptions yet."
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Billing Cycle
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Next Renewal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((sub) => {
              const statusConf = getStatusConfig(sub.status);
              return (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/subscriptions/${sub.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {sub.planName || sub.plan?.name || 'N/A'}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={statusConf?.color || 'gray'} size="sm">
                      {statusConf?.label || sub.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">
                    {sub.billingCycle || sub.interval || '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {formatCurrency(sub.amount || sub.price || 0)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(sub.startDate)}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {sub.nextRenewalDate ? formatDate(sub.nextRenewalDate) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoicesTab({ data, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
        <span className="ml-3 text-slate-500">Loading invoices...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={HiOutlineDocumentText}
        title="No invoices"
        description="No invoices found for this customer."
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Issue Date
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Paid
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((invoice) => {
              const statusConf = getStatusConfig(invoice.status);
              return (
                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/invoices/${invoice.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {invoice.invoiceNumber || invoice.number || `#${invoice.id}`}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={statusConf?.color || 'gray'} size="sm">
                      {statusConf?.label || invoice.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(invoice.issueDate || invoice.createdAt)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(invoice.dueDate)}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {formatCurrency(invoice.amount || invoice.total || 0)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {formatCurrency(invoice.amountPaid || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsTab({ data, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
        <span className="ml-3 text-slate-500">Loading payments...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={HiOutlineBanknotes}
        title="No payments"
        description="No payments recorded for this customer."
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Payment ID
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Method
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((payment) => {
              const statusConf = getStatusConfig(payment.status);
              const StatusIcon =
                payment.status === 'completed' || payment.status === 'succeeded'
                  ? HiOutlineCheckCircle
                  : payment.status === 'pending'
                  ? HiOutlineClock
                  : payment.status === 'failed'
                  ? HiOutlineXCircle
                  : null;
              return (
                <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {payment.transactionId || payment.paymentId || `#${payment.id}`}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {StatusIcon && (
                        <StatusIcon
                          className={`w-4 h-4 ${
                            payment.status === 'completed' || payment.status === 'succeeded'
                              ? 'text-green-500'
                              : payment.status === 'pending'
                              ? 'text-amber-500'
                              : 'text-red-500'
                          }`}
                        />
                      )}
                      <Badge color={statusConf?.color || 'gray'} size="sm">
                        {statusConf?.label || payment.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">
                    {payment.method || payment.paymentMethod || '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(payment.paidAt || payment.createdAt)}</td>
                  <td className="px-6 py-4">
                    {payment.invoiceId ? (
                      <Link
                        to={`/admin/invoices/${payment.invoiceId}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {payment.invoiceNumber || `#${payment.invoiceId}`}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {formatCurrency(payment.amount || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HealthTab({ data, loading, customer }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
        <span className="ml-3 text-slate-500">Loading health score...</span>
      </div>
    );
  }

  const healthScore = data?.score ?? customer?.healthScore ?? 0;
  const riskFactors = data?.riskFactors || [];
  const recommendations = data?.recommendations || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Health Score Gauge */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Health Score</h3>
        <HealthScoreGauge score={healthScore} />
        <p className="text-sm text-slate-500 mt-4 text-center">
          Based on payment history, engagement, and subscription activity
        </p>
      </div>

      {/* Risk Factors */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Risk Factors</h3>
        {riskFactors.length > 0 ? (
          <ul className="space-y-3">
            {riskFactors.map((factor, index) => (
              <li key={index} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    factor.severity === 'high'
                      ? 'bg-red-100 text-red-600'
                      : factor.severity === 'medium'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-yellow-100 text-yellow-600'
                  }`}
                >
                  <HiOutlineExclamationTriangle className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{factor.title || factor.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{factor.description}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <HiOutlineCheckCircle className="w-10 h-10 text-green-400 mb-2" />
            <p className="text-sm text-slate-500">No risk factors identified</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recommendations</h3>
        {recommendations.length > 0 ? (
          <ul className="space-y-3">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{rec.title || rec.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{rec.description}</p>
                  {rec.impact && (
                    <span className="inline-block mt-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      Impact: {rec.impact}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <HiOutlineShieldCheck className="w-10 h-10 text-green-400 mb-2" />
            <p className="text-sm text-slate-500">No recommendations at this time</p>
          </div>
        )}
      </div>
    </div>
  );
}
