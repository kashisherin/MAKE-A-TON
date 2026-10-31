import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/utils/helpers';

const DEFAULT_COLORS = {
  Paid: '#22c55e',
  Partial: '#f59e0b',
  Overdue: '#ef4444',
  Pending: '#94a3b8',
  Failed: '#dc2626',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[150px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: entry.payload.color || entry.payload.fill }}
        />
        <span className="text-sm font-medium text-slate-700">{entry.name}</span>
      </div>
      <p className="text-lg font-semibold text-slate-900 ml-[18px]">
        {formatCurrency(entry.value)}
      </p>
    </div>
  );
};

const PaymentStatusChart = ({
  data = [],
  title = 'Payment Status',
  height = 280,
}) => {
  const total = useMemo(
    () => data.reduce((sum, d) => sum + (d.value || 0), 0),
    [data]
  );

  const coloredData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        color: d.color || DEFAULT_COLORS[d.name] || '#94a3b8',
      })),
    [data]
  );

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
        <div
          className="flex items-center justify-center text-slate-400 text-sm"
          style={{ height }}
        >
          No payment data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0" style={{ width: height, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={coloredData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="85%"
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                cornerRadius={4}
              >
                {coloredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Total</span>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {coloredData.map((entry, index) => {
            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
            return (
              <div key={index} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">{entry.name}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(entry.value)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: entry.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 w-12 text-right flex-shrink-0">
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PaymentStatusChart;
