import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = {
  new_subscriptions: { stroke: '#22c55e', label: 'New Subscriptions' },
  churned: { stroke: '#ef4444', label: 'Churned' },
  net_growth: { stroke: '#3b82f6', label: 'Net Growth' },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {payload.map((entry, index) => {
        const meta = COLORS[entry.dataKey] || {};
        return (
          <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-slate-600">
                {meta.label || entry.name}
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {entry.value?.toLocaleString() ?? 0}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CustomLegend = ({ payload }) => {
  if (!payload) return null;

  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload.map((entry, index) => {
        const meta = COLORS[entry.dataKey] || {};
        return (
          <div key={index} className="flex items-center gap-2">
            <span
              className="w-3 h-0.5 rounded"
              style={{ backgroundColor: entry.color, display: 'inline-block' }}
            />
            <span className="text-xs text-slate-500">{meta.label || entry.value}</span>
          </div>
        );
      })}
    </div>
  );
};

const SubscriptionGrowthChart = ({
  data = [],
  title = 'Subscription Growth',
  height = 320,
}) => {
  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
        <div
          className="flex items-center justify-center text-slate-400 text-sm"
          style={{ height }}
        >
          No subscription data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            dx={-4}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Line
            type="monotone"
            dataKey="new_subscriptions"
            name="New Subscriptions"
            stroke={COLORS.new_subscriptions.stroke}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: COLORS.new_subscriptions.stroke }}
          />
          <Line
            type="monotone"
            dataKey="churned"
            name="Churned"
            stroke={COLORS.churned.stroke}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: COLORS.churned.stroke }}
          />
          <Line
            type="monotone"
            dataKey="net_growth"
            name="Net Growth"
            stroke={COLORS.net_growth.stroke}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: COLORS.net_growth.stroke }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SubscriptionGrowthChart;
