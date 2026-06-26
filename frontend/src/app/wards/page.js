"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import {
  MapPin, Building2, Users, IndianRupee,
  AlertTriangle, TrendingUp, ArrowRight,
  BarChart3, X, GitCompareArrows,
} from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";
import ChartTooltip from "@/components/ChartTooltip";
import { fetchWardSummary, formatCurrency, formatFullCurrency } from "@/lib/api";

const CHART_COLORS = [
  "#0b3c5d", "#328cc1", "#1d2731", "#4f46e5",
  "#0891b2", "#0f766e", "#16a34a", "#d97706",
  "#2563eb", "#475569", "#7c3aed", "#b91c1c",
];

export default function WardsPage() {
  const [wardData, setWardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState(null);
  const [compareWards, setCompareWards] = useState([]);
  const [filterDistrict, setFilterDistrict] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchWardSummary();
        setWardData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Wards load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Derive districts dynamically ──────────────────────────────── */
  const districts = useMemo(() => {
    const set = new Set();
    wardData.forEach((w) => set.add(w.district_name || `District ${w.district_id}`));
    return ["ALL", ...Array.from(set).sort()];
  }, [wardData]);

  /* ── Filtered wards ────────────────────────────────────────────── */
  const filteredWards = useMemo(() => {
    if (filterDistrict === "ALL") return wardData;
    return wardData.filter(
      (w) => (w.district_name || `District ${w.district_id}`) === filterDistrict
    );
  }, [wardData, filterDistrict]);

  /* ── Group by district ─────────────────────────────────────────── */
  const groupedByDistrict = useMemo(() => {
    const groups = {};
    filteredWards.forEach((w) => {
      const dName = w.district_name || `District ${w.district_id}`;
      if (!groups[dName]) groups[dName] = [];
      groups[dName].push(w);
    });
    // Sort wards within each group
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => Number(b.total_outstanding) - Number(a.total_outstanding))
    );
    return groups;
  }, [filteredWards]);

  /* ── Toggle compare ────────────────────────────────────────────── */
  function toggleCompare(ward) {
    setCompareWards((prev) => {
      const exists = prev.find((w) => w.ward_id === ward.ward_id);
      if (exists) return prev.filter((w) => w.ward_id !== ward.ward_id);
      if (prev.length >= 4) return prev; // Max 4 comparison
      return [...prev, ward];
    });
  }

  /* ── Comparison radar data ─────────────────────────────────────── */
  const radarData = useMemo(() => {
    if (compareWards.length < 2) return [];

    // Normalize values 0-100 for radar
    const maxOutstanding = Math.max(...compareWards.map((w) => Number(w.total_outstanding))) || 1;
    const maxDefaulters = Math.max(...compareWards.map((w) => Number(w.total_defaulters))) || 1;
    const maxCritical = Math.max(...compareWards.map((w) => Number(w.critical_count))) || 1;
    const maxHigh = Math.max(...compareWards.map((w) => Number(w.high_count))) || 1;
    const maxAvg = Math.max(...compareWards.map((w) => Number(w.avg_outstanding))) || 1;

    const metrics = ["Outstanding", "Defaulters", "Critical", "High Risk", "Avg Outstanding"];
    return metrics.map((metric, idx) => {
      const row = { metric };
      compareWards.forEach((w) => {
        const label = `Ward ${w.ward_number || w.ward_id}`;
        if (idx === 0) row[label] = (Number(w.total_outstanding) / maxOutstanding) * 100;
        if (idx === 1) row[label] = (Number(w.total_defaulters) / maxDefaulters) * 100;
        if (idx === 2) row[label] = (Number(w.critical_count) / maxCritical) * 100;
        if (idx === 3) row[label] = (Number(w.high_count) / maxHigh) * 100;
        if (idx === 4) row[label] = (Number(w.avg_outstanding) / maxAvg) * 100;
      });
      return row;
    });
  }, [compareWards]);

  /* ── Comparison bar data ───────────────────────────────────────── */
  const compareBarData = useMemo(() => {
    return compareWards.map((w) => ({
      name: `Ward ${w.ward_number || w.ward_id}`,
      outstanding: Number(w.total_outstanding || 0),
      defaulters: Number(w.total_defaulters || 0),
      critical: Number(w.critical_count || 0),
    }));
  }, [compareWards]);

  /* ── Loading ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div>
        <div className="page-header"><div className="skeleton skeleton--title" /></div>
        <div className="grid-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card skeleton skeleton--card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-header__title">Ward Analytics</h1>
        <p className="page-header__subtitle">
          Deep-dive into ward-level performance across {districts.length - 1} district{districts.length - 1 !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-md" style={{ flexWrap: "wrap", gap: "var(--space-sm)" }}>
        <div className="tab-bar">
          {districts.map((d) => (
            <button
              key={d}
              className={`tab-bar__item ${filterDistrict === d ? "active" : ""}`}
              onClick={() => setFilterDistrict(d)}
            >
              {d === "ALL" ? "All Districts" : d}
            </button>
          ))}
        </div>

        {compareWards.length > 0 && (
          <div className="flex items-center gap-sm">
            <span className="text-sm text-secondary">
              <GitCompareArrows size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
              {compareWards.length} selected for comparison
            </span>
            <button className="btn btn--ghost btn--sm" onClick={() => setCompareWards([])}>
              <X size={14} /> Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Ward Cards Grid ──────────────────────────────────────── */}
      {Object.entries(groupedByDistrict).map(([district, wards]) => (
        <div key={district} className="section">
          <div className="section__title">
            <Building2 size={16} />
            {district}
            <span className="text-xs text-tertiary" style={{ marginLeft: 8 }}>
              {wards.length} ward{wards.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {wards.map((w, i) => {
              const isSelected = compareWards.some((c) => c.ward_id === w.ward_id);
              return (
                <div
                  key={w.ward_id}
                  className={`glass-card glass-card--interactive ward-card`}
                  style={{
                    borderColor: isSelected ? "var(--accent-cyan)" : undefined,
                    boxShadow: isSelected ? "var(--shadow-glow-cyan)" : undefined,
                  }}
                  onClick={() => toggleCompare(w)}
                >
                  <div className="ward-card__number">{w.ward_number || w.ward_id}</div>
                  <div className="ward-card__name">
                    <MapPin size={14} style={{ marginRight: 4, verticalAlign: "middle", color: CHART_COLORS[i % CHART_COLORS.length] }} />
                    Ward {w.ward_number || w.ward_id}
                  </div>
                  <div className="ward-card__district">
                    {w.ulb_name || district}
                  </div>

                  <div className="ward-card__stats">
                    <div className="ward-card__stat">
                      <div className="ward-card__stat-value" style={{ color: "var(--accent-cyan)" }}>
                        {formatCurrency(w.total_outstanding)}
                      </div>
                      <div>Outstanding</div>
                    </div>
                    <div className="ward-card__stat">
                      <div className="ward-card__stat-value">{w.total_defaulters}</div>
                      <div>Defaulters</div>
                    </div>
                    <div className="ward-card__stat">
                      <div className="ward-card__stat-value" style={{ color: "var(--accent-red)" }}>
                        {w.critical_count}
                      </div>
                      <div>Critical</div>
                    </div>
                    <div className="ward-card__stat">
                      <div className="ward-card__stat-value" style={{ color: "var(--accent-amber)" }}>
                        {formatCurrency(w.avg_outstanding)}
                      </div>
                      <div>Avg</div>
                    </div>
                  </div>

                  {/* Risk bar */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", height: 4, borderRadius: 4, overflow: "hidden", gap: 1 }}>
                      {[
                        { count: Number(w.critical_count || 0), color: "#ef4444" },
                        { count: Number(w.high_count || 0), color: "#f97316" },
                        { count: Number(w.medium_count || 0), color: "#f59e0b" },
                        { count: Number(w.low_count || 0), color: "#10b981" },
                      ].map((seg, si) => {
                        const total = Number(w.total_defaulters || 1);
                        const pct = (seg.count / total) * 100;
                        if (pct <= 0) return null;
                        return (
                          <div
                            key={si}
                            style={{
                              width: `${pct}%`,
                              background: seg.color,
                              borderRadius: 2,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--accent-cyan)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--bg-primary)",
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── Comparison Section ────────────────────────────────────── */}
      {compareWards.length >= 2 && (
        <div className="section mt-xl">
          <div className="section__title">
            <GitCompareArrows size={16} />
            Ward Comparison
          </div>

          <div className="grid-2">
            {/* Radar Chart */}
            <div className="glass-card chart-container">
              <div className="chart-container__title">
                <BarChart3 size={16} />
                Performance Radar
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#cbd5e1" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: "#334155", fontSize: 11 }}
                    />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    {compareWards.map((w, i) => (
                      <Radar
                        key={w.ward_id}
                        name={`Ward ${w.ward_number || w.ward_id}`}
                        dataKey={`Ward ${w.ward_number || w.ward_id}`}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span style={{ color: "#334155", fontSize: 12 }}>{v}</span>}
                    />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${Math.round(v)}%`} />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar comparison */}
            <div className="glass-card chart-container">
              <div className="chart-container__title">
                <BarChart3 size={16} />
                Outstanding Comparison
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareBarData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#334155", fontSize: 11 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#334155", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrency(v)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="outstanding" name="Outstanding" fill="#0b3c5d" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="glass-card data-table-wrapper mt-md">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ward</th>
                  <th>District</th>
                  <th>ULB</th>
                  <th>Defaulters</th>
                  <th>Outstanding</th>
                  <th>Avg Outstanding</th>
                  <th>Critical</th>
                  <th>High</th>
                  <th>Medium</th>
                  <th>Low</th>
                </tr>
              </thead>
              <tbody>
                {compareWards.map((w) => (
                  <tr key={w.ward_id}>
                    <td style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                      Ward {w.ward_number || w.ward_id}
                    </td>
                    <td>{w.district_name}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{w.ulb_name}</td>
                    <td className="mono">{w.total_defaulters}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {formatFullCurrency(w.total_outstanding)}
                    </td>
                    <td className="mono">{formatFullCurrency(w.avg_outstanding)}</td>
                    <td style={{ color: "#ef4444" }}>{w.critical_count}</td>
                    <td style={{ color: "#f97316" }}>{w.high_count}</td>
                    <td style={{ color: "#f59e0b" }}>{w.medium_count}</td>
                    <td style={{ color: "#10b981" }}>{w.low_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {compareWards.length < 2 && compareWards.length > 0 && (
        <div
          className="glass-card mt-xl flex items-center justify-between"
          style={{ padding: "var(--space-lg)", color: "var(--text-secondary)" }}
        >
          <div className="flex items-center gap-sm">
            <GitCompareArrows size={16} />
            Select at least 2 wards to compare. Click ward cards to select.
          </div>
          <ArrowRight size={16} />
        </div>
      )}
    </div>
  );
}
