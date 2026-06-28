"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Treemap,
  Legend,
} from "recharts";
import {
  IndianRupee, Users, AlertTriangle, TrendingUp,
  BarChart3, PieChartIcon, Activity, Grid3x3,
  ArrowUpRight, ChevronRight,
} from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";
import ChartTooltip from "@/components/ChartTooltip";
import RiskBadge from "@/components/RiskBadge";
import {
  fetchWardSummary, fetchTopDefaulters,
  formatCurrency, formatFullCurrency,
} from "@/lib/api";

/* ── Chart colour palette ──────────────────────────────────────────── */
const CHART_COLORS = [
  "#0b3c5d", "#328cc1", "#1d2731", "#4f46e5",
  "#0891b2", "#0f766e", "#16a34a", "#d97706",
  "#2563eb", "#475569", "#7c3aed", "#b91c1c",
];

const RISK_COLORS = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#eab308",
  LOW: "#16a34a",
};

/* ================================================================== */
/* Dashboard Page                                                      */
/* ================================================================== */
export default function DashboardPage() {
  const [wardData, setWardData] = useState([]);
  const [topDefaulters, setTopDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [wards, top] = await Promise.all([
          fetchWardSummary(),
          fetchTopDefaulters(10),
        ]);
        setWardData(Array.isArray(wards) ? wards : []);
        setTopDefaulters(Array.isArray(top) ? top : []);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Derived KPIs (fully dynamic) ─────────────────────────────── */
  const totalOutstanding = wardData.reduce((s, w) => s + Number(w.total_outstanding || 0), 0);
  const totalDefaulters = wardData.reduce((s, w) => s + Number(w.total_defaulters || 0), 0);
  const totalCritical = wardData.reduce((s, w) => s + Number(w.critical_count || 0), 0);
  const avgOutstanding = totalDefaulters > 0 ? totalOutstanding / totalDefaulters : 0;

  /* ── Risk distribution (dynamic) ──────────────────────────────── */
  const riskData = [
    { name: "Critical", value: wardData.reduce((s, w) => s + Number(w.critical_count || 0), 0), color: RISK_COLORS.CRITICAL },
    { name: "High",     value: wardData.reduce((s, w) => s + Number(w.high_count || 0), 0),     color: RISK_COLORS.HIGH },
    { name: "Medium",   value: wardData.reduce((s, w) => s + Number(w.medium_count || 0), 0),   color: RISK_COLORS.MEDIUM },
    { name: "Low",      value: wardData.reduce((s, w) => s + Number(w.low_count || 0), 0),      color: RISK_COLORS.LOW },
  ];

  /* ── Outstanding by district (dynamic — works for any district) ── */
  const districtMap = {};
  wardData.forEach((w) => {
    const dName = w.district_name || `District ${w.district_id}`;
    if (!districtMap[dName]) {
      districtMap[dName] = { district: dName, outstanding: 0, defaulters: 0 };
    }
    districtMap[dName].outstanding += Number(w.total_outstanding || 0);
    districtMap[dName].defaulters += Number(w.total_defaulters || 0);
  });
  const districtData = Object.values(districtMap).sort((a, b) => b.outstanding - a.outstanding);

  /* ── Top wards bar chart (dynamic, sorted) ────────────────────── */
  const barData = [...wardData]
    .sort((a, b) => Number(b.total_outstanding) - Number(a.total_outstanding))
    .slice(0, 12)
    .map((w) => ({
      name: `Ward ${w.ward_number || w.ward_id}`,
      outstanding: Number(w.total_outstanding || 0),
      defaulters: Number(w.total_defaulters || 0),
      district: w.district_name || `District ${w.district_id}`,
    }));

  /* ── Treemap data (dynamic) ───────────────────────────────────── */
  const treemapData = wardData.map((w, i) => ({
    name: `W${w.ward_number || w.ward_id}`,
    size: Number(w.total_outstanding || 0),
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  /* ── Loading skeleton ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="skeleton skeleton--title" />
        </div>
        <div className="grid-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card skeleton skeleton--card" />
          ))}
        </div>
        <div className="grid-2 mt-xl">
          <div className="glass-card skeleton skeleton--chart" />
          <div className="glass-card skeleton skeleton--chart" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-header__title">Revenue Recovery Dashboard</h1>
        <p className="page-header__subtitle">
          Real-time overview of property tax defaulters across all districts
        </p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <div className="grid-4">
        <div className="glass-card glass-card--interactive kpi-card kpi-card--cyan">
          <div className="kpi-card__icon kpi-card__icon--cyan">
            <IndianRupee size={20} />
          </div>
          <span className="kpi-card__label">Total Outstanding</span>
          <AnimatedCounter
            value={totalOutstanding}
            className="kpi-card__value"
            formatter={(v) => formatCurrency(v)}
          />
          <span className="kpi-card__sub">
            Across {districtData.length} district{districtData.length !== 1 ? 's' : ''}, {wardData.length} wards
          </span>
        </div>

        <div className="glass-card glass-card--interactive kpi-card kpi-card--violet">
          <div className="kpi-card__icon kpi-card__icon--violet">
            <Users size={20} />
          </div>
          <span className="kpi-card__label">Total Defaulters</span>
          <AnimatedCounter
            value={totalDefaulters}
            className="kpi-card__value"
          />
          <span className="kpi-card__sub">
            Properties with pending dues
          </span>
        </div>

        <div className="glass-card glass-card--interactive kpi-card kpi-card--amber">
          <div className="kpi-card__icon kpi-card__icon--amber">
            <AlertTriangle size={20} />
          </div>
          <span className="kpi-card__label">Critical Cases</span>
          <AnimatedCounter
            value={totalCritical}
            className="kpi-card__value"
          />
          <span className="kpi-card__sub">
            {totalDefaulters > 0
              ? `${((totalCritical / totalDefaulters) * 100).toFixed(1)}% of total`
              : "No data"}
          </span>
        </div>

        <div className="glass-card glass-card--interactive kpi-card kpi-card--emerald">
          <div className="kpi-card__icon kpi-card__icon--emerald">
            <TrendingUp size={20} />
          </div>
          <span className="kpi-card__label">Avg Outstanding</span>
          <AnimatedCounter
            value={avgOutstanding}
            className="kpi-card__value"
            formatter={(v) => formatCurrency(v)}
          />
          <span className="kpi-card__sub">
            Per defaulter property
          </span>
        </div>
      </div>

      {/* ── Charts Row 1 ─────────────────────────────────────────── */}
      <div className="grid-2 mt-xl">
        {/* Bar Chart: Outstanding by Ward */}
        <div className="glass-card chart-container">
          <div className="chart-container__title">
            <BarChart3 size={16} />
            Outstanding by Ward (Top {barData.length})
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
                <Bar
                  dataKey="outstanding"
                  name="Outstanding"
                  fill="#328cc1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Risk Distribution */}
        <div className="glass-card chart-container">
          <div className="chart-container__title">
            <PieChartIcon size={16} />
            Risk Level Distribution
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={800}
                >
                  {riskData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => `${v} defaulters`} />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "#334155", fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>



      {/* ── Top Defaulters Table ──────────────────────────────────── */}
      <div className="section mt-xl">
        <div className="section__title">
          <ArrowUpRight size={16} />
          Top Defaulters
        </div>
        <div className="glass-card data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Property ID</th>
                <th>Owner Name</th>
                <th>Ward</th>
                <th>Outstanding</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {topDefaulters.map((d, i) => (
                <tr key={d.property_id}>
                  <td style={{ color: "var(--text-tertiary)" }}>#{i + 1}</td>
                  <td className="mono" style={{ color: "var(--accent-cyan)" }}>
                    {d.property_id}
                  </td>
                  <td>{d.owner_name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{d.ward_id}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>
                    {formatFullCurrency(d.total_outstanding)}
                  </td>
                  <td>
                    <RiskBadge level={d.risk_level} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── District Summary Cards ────────────────────────────────── */}
      <div className="section mt-xl">
        <div className="section__title">
          <ChevronRight size={16} />
          District Summary
        </div>
        <div className="grid-3">
          {districtData.map((d, i) => (
            <div key={d.district} className="glass-card glass-card--interactive" style={{ padding: "var(--space-lg)" }}>
              <div className="flex items-center gap-sm mb-md">
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
                <span style={{ fontWeight: 600, fontSize: 15 }}>{d.district}</span>
              </div>
              <div className="grid-2" style={{ gap: "var(--space-sm)" }}>
                <div>
                  <div className="text-xs text-tertiary" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Outstanding</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{formatCurrency(d.outstanding)}</div>
                </div>
                <div>
                  <div className="text-xs text-tertiary" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Defaulters</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{d.defaulters}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
