import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

const DEFAULT_RISK_COLORS = {
  Healthy: '#22c55e',
  healthy: '#22c55e',
  Low: '#22c55e',
  low: '#22c55e',
  Medium: '#f59e0b',
  medium: '#f59e0b',
  High: '#ef4444',
  high: '#ef4444',
  Critical: '#dc2626',
  critical: '#dc2626',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const data = entry.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[150px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="text-sm font-medium text-slate-700">{data.risk_level}</span>
      </div>
      <p className="text-lg font-semibold text-slate-900 ml-[18px]">
        {data.count} customers
      </p>
    </div>
  );
};

const CustomBarLabel = ({ x, y, width, height, value }) => {
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      fill="#475569"
      fontSize={13}
      fontWeight={600}
      dominantBaseline="central"
    >
      {value}
    </text>
  );
};

const CustomerRiskChart = ({
  data = [],
  title = 'Customer Risk Distribution',
  height = 240,
}) => {
  const coloredData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        color: d.color || DEFAULT_RISK_COLORS[d.risk_level] || '#94a3b8',
      })),
    [data]
  );

  const maxCount = useMemo(
    () => Math.max(...coloredData.map((d) => d.count || 0), 1),
    [coloredData]
  );

  const total = useMemo(
    () => coloredData.reduce((sum, d) => sum + (d.count || 0), 0),
    [coloredData]
  );

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
        <div
          className="flex items-center justify-center text-slate-400 text-sm"
          style={{ height }}
        >
          No risk data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className="text-sm text-slate-500">
          {total} total customers
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={coloredData}
          layout="vertical"
          margin={{ top: 4, right: 50, left: 8, bottom: 4 }}
        >
          <XAxis
            type="number"
            domain={[0, Math.ceil(maxCount * 1.2)]}
            hide
          />
          <YAxis
            type="category"
            dataKey="risk_level"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar
            dataKey="count"
            radius={[0, 6, 6, 0]}
            barSize={28}
            label={<CustomBarLabel />}
          >
            {coloredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomerRiskChart;
