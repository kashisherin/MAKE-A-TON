import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const SparkLine = ({
  data = [],
  color = '#3b82f6',
  height = 40,
  width,
  strokeWidth = 2,
  showDot = false,
}) => {
  const chartData = useMemo(
    () =>
      data.map((value, index) => ({
        index,
        value: typeof value === 'number' ? value : 0,
      })),
    [data]
  );

  if (!chartData.length) {
    return (
      <div style={{ height, width: width || '100%' }} className="bg-slate-50 rounded" />
    );
  }

  return (
    <div style={{ height, width: width || '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="value"
            stroke={`url(#spark-${color.replace('#', '')})`}
            strokeWidth={strokeWidth}
            dot={showDot ? { r: 2, fill: color, strokeWidth: 0 } : false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparkLine;
