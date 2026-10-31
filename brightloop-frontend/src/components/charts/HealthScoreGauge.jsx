import React, { useMemo } from 'react';

const HealthScoreGauge = ({
  score = 0,
  size = 180,
  label = 'Health Score',
  showLabel = true,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));

  const { color, bgColor, textColor, statusText } = useMemo(() => {
    if (clampedScore >= 70) {
      return {
        color: '#22c55e',
        bgColor: '#dcfce7',
        textColor: '#16a34a',
        statusText: 'Healthy',
      };
    }
    if (clampedScore >= 40) {
      return {
        color: '#f59e0b',
        bgColor: '#fef3c7',
        textColor: '#d97706',
        statusText: 'At Risk',
      };
    }
    return {
      color: '#ef4444',
      bgColor: '#fee2e2',
      textColor: '#dc2626',
      statusText: 'Critical',
    };
  }, [clampedScore]);

  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Semi-circle from 180deg to 0deg (bottom arc)
  const startAngle = 180;
  const endAngle = 0;
  const totalAngle = 180;
  const sweepAngle = (clampedScore / 100) * totalAngle;

  const polarToCartesian = (centerX, centerY, r, angleDeg) => {
    const angleRad = ((angleDeg - 180) * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(angleRad),
      y: centerY + r * Math.sin(angleRad),
    };
  };

  const describeArc = (centerX, centerY, r, startDeg, endDeg) => {
    const start = polarToCartesian(centerX, centerY, r, endDeg);
    const end = polarToCartesian(centerX, centerY, r, startDeg);
    const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const bgPath = describeArc(cx, cy, radius, startAngle, startAngle + totalAngle);
  const valuePath =
    sweepAngle > 0
      ? describeArc(cx, cy, radius, startAngle, startAngle + sweepAngle)
      : '';

  // Segment lines (tick marks for green/amber/red segments)
  const segmentAngles = [
    { angle: startAngle + totalAngle * 0.4, label: '40' },
    { angle: startAngle + totalAngle * 0.7, label: '70' },
  ];

  const svgHeight = size * 0.6;

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: svgHeight }} className="relative">
        <svg
          width={size}
          height={svgHeight}
          viewBox={`0 ${size * 0.1} ${size} ${size * 0.5}`}
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={bgPath}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Colored segments on background */}
          <path
            d={describeArc(cx, cy, radius, startAngle, startAngle + totalAngle * 0.4)}
            fill="none"
            stroke="#fee2e2"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
          <path
            d={describeArc(cx, cy, radius, startAngle + totalAngle * 0.4, startAngle + totalAngle * 0.7)}
            fill="none"
            stroke="#fef3c7"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
          <path
            d={describeArc(cx, cy, radius, startAngle + totalAngle * 0.7, startAngle + totalAngle)}
            fill="none"
            stroke="#dcfce7"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />

          {/* Value arc */}
          {valuePath && (
            <path
              d={valuePath}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Tick marks for segments */}
          {segmentAngles.map(({ angle }, i) => {
            const inner = polarToCartesian(cx, cy, radius - strokeWidth / 2 - 2, angle);
            const outer = polarToCartesian(cx, cy, radius + strokeWidth / 2 + 2, angle);
            return (
              <line
                key={i}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#fff"
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {/* Center score */}
        <div
          className="absolute flex flex-col items-center justify-end pb-0"
          style={{
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
          }}
        >
          <span
            className="font-bold leading-none"
            style={{
              fontSize: size * 0.22,
              color: textColor,
            }}
          >
            {clampedScore}
          </span>
          <span
            className="text-xs font-medium mt-1 px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <span className="text-sm text-slate-500 mt-2 text-center">{label}</span>
      )}
    </div>
  );
};

export default HealthScoreGauge;
