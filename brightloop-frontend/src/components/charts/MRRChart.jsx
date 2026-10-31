import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency, formatPercent } from '@/utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[190px]">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-slate-600">
              {entry.dataKey === 'mrr' ? 'MRR' : 'Growth Rate'}
            </span>
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {entry.dataKey === 'mrr'
              ? formatCurrency(entry.value)
              : formatPercent(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CustomLegend = ({ payload }) => {
  if (!payload) return null;
  const labels = { mrr: 'MRR', growth_rate: 'Growth Rate' };

  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          {entry.dataKey === 'mrr' ? (
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
          ) : (
            <span
              className="w-3 h-0.5 rounded"
              style={{ backgroundColor: entry.color, display: 'inline-block' }}
            />
          )}
          <span className="text-xs text-slate-500">
            {labels[entry.dataKey] || entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const MRRChart = ({
  data = [],
  title = 'Monthly Recurring Revenue',
  height = 340,
}) => {
  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
        <div
          className="flex items-center justify-center text-slate-400 text-sm"
          style={{ height }}
        >
          No MRR data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mrrBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            dy={8}
          />
          <YAxis
            yAxisId="left"
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
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickFormatter={(value) => `${value}%`}
            dx={4}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Bar
            yAxisId="left"
            dataKey="mrr"
            name="MRR"
            fill="url(#mrrBarGradient)"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="growth_rate"
            name="Growth Rate"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#8b5cf6' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MRRChart;
