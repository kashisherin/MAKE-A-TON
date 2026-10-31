import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-slate-600 capitalize">
              {entry.name === 'revenue' ? 'Revenue' : entry.name === 'target' ? 'Target' : entry.name}
            </span>
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const RevenueChart = ({
  data = [],
  title = 'Revenue Over Time',
  height = 320,
  showTarget = true,
}) => {
  const hasTarget = useMemo(
    () => showTarget && data.some((d) => d.target !== undefined && d.target !== null),
    [data, showTarget]
  );

  const yDomain = useMemo(() => {
    if (!data.length) return [0, 1000];
    const allValues = data.flatMap((d) => {
      const vals = [d.revenue || 0];
      if (hasTarget) vals.push(d.target || 0);
      return vals;
    });
    const max = Math.max(...allValues);
    return [0, Math.ceil(max * 1.15)];
  }, [data, hasTarget]);

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
        <div
          className="flex items-center justify-center text-slate-400 text-sm"
          style={{ height }}
        >
          No revenue data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01} />
            </linearGradient>
          </defs>
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
            domain={yDomain}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
              return `$${value}`;
            }}
            dx={-4}
          />
          <Tooltip content={<CustomTooltip />} />
          {hasTarget && (
            <Area
              type="monotone"
              dataKey="target"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="url(#targetGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#8b5cf6' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
