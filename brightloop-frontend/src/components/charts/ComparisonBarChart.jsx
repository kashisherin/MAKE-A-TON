import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/utils/helpers';

const CustomTooltip = ({ active, payload, label, valueFormatter }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[170px]">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-slate-600 capitalize">{entry.name}</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {valueFormatter ? valueFormatter(entry.value) : entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="border-t border-slate-100 mt-2 pt-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">Change</span>
            <span
              className={`text-sm font-semibold ${
                payload[1].value >= payload[0].value ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {payload[1].value >= payload[0].value ? '+' : ''}
              {(
                ((payload[1].value - payload[0].value) / (payload[0].value || 1)) *
                100
              ).toFixed(1)}
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomLegend = ({ payload }) => {
  if (!payload) return null;

  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-slate-500 capitalize">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const ComparisonBarChart = ({
  data = [],
  title = 'Comparison',
  height = 320,
  beforeColor = '#94a3b8',
  afterColor = '#3b82f6',
  beforeLabel = 'Before',
  afterLabel = 'After',
  valueFormatter,
}) => {
  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
        <div
          className="flex items-center justify-center text-slate-400 text-sm"
          style={{ height }}
        >
          No comparison data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickFormatter={valueFormatter || ((v) => v.toLocaleString())}
            dx={-4}
          />
          <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
          <Legend content={<CustomLegend />} />
          <Bar
            dataKey="before"
            name={beforeLabel}
            fill={beforeColor}
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
          <Bar
            dataKey="after"
            name={afterLabel}
            fill={afterColor}
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComparisonBarChart;
