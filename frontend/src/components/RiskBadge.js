"use client";

export default function RiskBadge({ level }) {
  const normalised = (level || "").toUpperCase();
  return (
    <span className={`risk-badge risk-badge--${normalised}`}>
      {normalised}
    </span>
  );
}
