import React, { useMemo } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getColor = (value, max) => {
  if (max === 0 || value === 0) return '#f1f5f9';
  const ratio = value / max;
  if (ratio < 0.2) return '#dbeafe';
  if (ratio < 0.4) return '#93c5fd';
  if (ratio < 0.6) return '#60a5fa';
  if (ratio < 0.8) return '#3b82f6';
  return '#1d4ed8';
};

const formatHour = (h) => {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
};

const UsageHeatmap = ({
  data = [],
  title = 'Usage Heatmap',
  height,
}) => {
  const { grid, max } = useMemo(() => {
    let maxVal = 0;
    const normalizedGrid = [];

    for (let day = 0; day < 7; day++) {
      const row = [];
      for (let hour = 0; hour < 24; hour++) {
        const val =
          data && data[day] && data[day][hour] !== undefined
            ? data[day][hour]
            : 0;
        if (val > maxVal) maxVal = val;
        row.push(val);
      }
      normalizedGrid.push(row);
    }

    return { grid: normalizedGrid, max: maxVal };
  }, [data]);

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center text-slate-400 text-sm h-48">
          No usage data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-[600px]">
          {/* Hour labels */}
          <div className="flex ml-12 mb-1">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-[10px] text-slate-400"
              >
                {h % 3 === 0 ? formatHour(h) : ''}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          <div className="space-y-1">
            {grid.map((row, dayIndex) => (
              <div key={dayIndex} className="flex items-center gap-1">
                <span className="w-10 text-xs text-slate-500 text-right pr-2 flex-shrink-0">
                  {DAYS[dayIndex]}
                </span>
                <div className="flex flex-1 gap-0.5">
                  {row.map((value, hourIndex) => (
                    <div
                      key={hourIndex}
                      className="flex-1 aspect-square rounded-sm cursor-pointer transition-transform hover:scale-110 group relative"
                      style={{ backgroundColor: getColor(value, max) }}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {DAYS[dayIndex]} {formatHour(hourIndex)}: {value}
                        </div>
                        <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Color legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-slate-400">Less</span>
            <div className="flex gap-0.5">
              {['#f1f5f9', '#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'].map(
                (color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                )
              )}
            </div>
            <span className="text-xs text-slate-400">More</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageHeatmap;
