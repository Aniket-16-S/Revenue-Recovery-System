"use client";

import { formatFullCurrency } from "@/lib/api";

/**
 * Custom tooltip for Recharts charts, matching the dark glassmorphic theme.
 */
export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      {label && <div className="chart-tooltip__label">{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="chart-tooltip__row">
          <div
            className="chart-tooltip__dot"
            style={{ background: entry.color || entry.fill }}
          />
          <span className="chart-tooltip__name">{entry.name}</span>
          <span className="chart-tooltip__value">
            {formatter
              ? formatter(entry.value, entry.name)
              : typeof entry.value === "number" && entry.value > 1000
              ? formatFullCurrency(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
