import React from "react";

/**
 * CircleGauge
 **/
export default function CircleGauge({
  value = 0,
  label,
  unit = "",
  color = "#7C3AED",
  size = 160,
  stroke = 14,
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - v / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeOpacity={0.08}
          stroke="#000"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(90)`}>
          <text
            x="0"
            y={-6}
            textAnchor="middle"
            className="font-semibold"
            style={{ fontSize: Math.round(size * 0.15) }}
            fill="#111827"
          >
            {v}
            {unit}
          </text>
          <text
            x="0"
            y={18}
            textAnchor="middle"
            className="text-xs"
            style={{ fontSize: Math.round(size * 0.065), fill: "#6B7280" }}
          >
            {label}
          </text>
        </g>
      </svg>
    </div>
  );
}
