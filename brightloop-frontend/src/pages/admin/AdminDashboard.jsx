import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineRectangleStack,
  HiOutlineUsers,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineArrowTrendingUp,
  HiOutlineChartBarSquare,
  HiOutlineCalendarDays,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineChevronRight,
  HiOutlineFunnel,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { StatCard, Badge, Spinner, EmptyState } from '@/components/common';
import { RevenueChart, SubscriptionGrowthChart, PaymentStatusChart, CustomerRiskChart } from '@/components/charts';
import { analyticsAPI } from '@/api/endpoints';
import { formatCurrency, formatDate, getStatusConfig } from '@/utils/helpers';

const DATE_RANGES = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last 30 Days', value: 'last_30' },
  { label: 'Last 90 Days', value: 'last_90' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Custom', value: 'custom' },
];

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('last_30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { range: dateRange };
      if (dateRange === 'custom' && customStart && customEnd) {
        params.start_date = customStart;
        params.end_date = customEnd;
      }
      const response = await analyticsAPI.getDashboard(params);
      setDashboardData(response.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load dashboard data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
        <span className="ml-3 text-slate-500 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <HiOutlineExclamationTriangle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-semibold text-slate-700">Failed to Load Dashboard</h2>
        <p className="text-slate-500">{error}</p>
        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const revenueData = dashboardData?.revenueTrends || [];
  const subscriptionGrowthData = dashboardData?.subscriptionGrowth || [];
  const paymentStatusData = dashboardData?.paymentStatus || [];
  const customerRiskData = dashboardData?.customerRisk || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const upcomingRenewals = dashboardData?.upcomingRenewals || [];
  const overdueInvoices = dashboardData?.overdueInvoices || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your subscription business</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <HiOutlineFunnel className="w-4 h-4 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {DATE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions ?? 0}
          icon={HiOutlineRectangleStack}
          trend={stats.subscriptionsTrend}
          trendLabel="vs last period"
          color="blue"
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers ?? 0}
          icon={HiOutlineUsers}
          trend={stats.customersTrend}
          trendLabel="vs last period"
          color="indigo"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue ?? 0)}
          icon={HiOutlineBanknotes}
          trend={stats.revenueTrend}
          trendLabel="vs last period"
          color="green"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.outstandingPayments ?? 0)}
          icon={HiOutlineClock}
          trend={stats.outstandingTrend}
          trendLabel="vs last period"
          color="amber"
        />
        <StatCard
          title="MRR"
          value={formatCurrency(stats.mrr ?? 0)}
          icon={HiOutlineArrowTrendingUp}
          trend={stats.mrrTrend}
          trendLabel="vs last period"
          color="purple"
        />
        <StatCard
          title="ARR"
          value={formatCurrency(stats.arr ?? 0)}
          icon={HiOutlineChartBarSquare}
          trend={stats.arrTrend}
          trendLabel="vs last period"
          color="teal"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trends</h3>
          {revenueData.length > 0 ? (
            <RevenueChart data={revenueData} />
          ) : (
            <EmptyState
              title="No revenue data"
              description="Revenue trend data will appear here once transactions are recorded."
              compact
            />
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Subscription Growth</h3>
          {subscriptionGrowthData.length > 0 ? (
            <SubscriptionGrowthChart data={subscriptionGrowthData} />
          ) : (
            <EmptyState
              title="No growth data"
              description="Subscription growth data will appear here as subscriptions are created."
              compact
            />
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Status</h3>
          {paymentStatusData.length > 0 ? (
            <PaymentStatusChart data={paymentStatusData} />
          ) : (
            <EmptyState
              title="No payment data"
              description="Payment status breakdown will appear here."
              compact
            />
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Customer Risk Distribution</h3>
          {customerRiskData.length > 0 ? (
            <CustomerRiskChart data={customerRiskData} />
          ) : (
            <EmptyState
              title="No risk data"
              description="Customer risk distribution will appear here."
              compact
            />
          )}
        </div>
      </div>

      {/* Bottom Row: Activity, Renewals, Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
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
                          : activity.type === 'cancellation'
                          ? 'bg-red-500'
                          : activity.type === 'renewal'
                          ? 'bg-purple-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{activity.description}</p>
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
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Upcoming Renewals</h3>
            <Link
              to="/admin/subscriptions?filter=renewing"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              View all <HiOutlineChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            {upcomingRenewals.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Renewal Date
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {upcomingRenewals.map((renewal, index) => (
                    <tr key={renewal.id || index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <Link
                          to={`/admin/customers/${renewal.customerId}`}
                          className="text-slate-800 hover:text-blue-600 font-medium"
                        >
                          {renewal.customerName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{renewal.planName}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5">
                          <HiOutlineCalendarDays className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{formatDate(renewal.renewalDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(renewal.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                No upcoming renewals in the next 7 days
              </div>
            )}
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Overdue Invoices</h3>
            <Link
              to="/admin/invoices?status=overdue"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              View all <HiOutlineChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            {overdueInvoices.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Days Overdue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {overdueInvoices.map((invoice, index) => (
                    <tr key={invoice.id || index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <Link
                          to={`/admin/customers/${invoice.customerId}`}
                          className="text-slate-800 hover:text-blue-600 font-medium"
                        >
                          {invoice.customerName}
                        </Link>
                        <p className="text-xs text-slate-400 mt-0.5">#{invoice.invoiceNumber}</p>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            invoice.daysOverdue > 30
                              ? 'bg-red-100 text-red-700'
                              : invoice.daysOverdue > 14
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {invoice.daysOverdue} days
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                <HiOutlineExclamationTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No overdue invoices — great job!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
