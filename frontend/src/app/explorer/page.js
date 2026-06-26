"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Search, Filter, Download, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, X, BarChart3, PieChart as PieChartIcon,
  Users,
} from "lucide-react";
import RiskBadge from "@/components/RiskBadge";
import ChartTooltip from "@/components/ChartTooltip";
import { fetchDefaulters, fetchWardSummary, formatFullCurrency, formatCurrency } from "@/lib/api";

const RISK_LEVELS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const PROPERTY_TYPES = ["ALL", "Residential", "Commercial", "Industrial"];
const PAGE_SIZE = 15;

const RISK_COLORS = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#eab308",
  LOW: "#16a34a",
};

export default function ExplorerPage() {
  /* ── Data state ────────────────────────────────────────────────── */
  const [allData, setAllData] = useState([]);
  const [wardSummary, setWardSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Filter state ──────────────────────────────────────────────── */
  const [searchName, setSearchName] = useState("");
  const [filterWard, setFilterWard] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("ALL");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  /* ── Sort & pagination ─────────────────────────────────────────── */
  const [sortKey, setSortKey] = useState("total_outstanding");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const [defaulters, wards] = await Promise.all([
          fetchDefaulters(),
          fetchWardSummary(),
        ]);
        setAllData(defaulters || []);
        setWardSummary(Array.isArray(wards) ? wards : []);
      } catch (err) {
        console.error("Explorer load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Derive unique districts dynamically ───────────────────────── */
  const districts = useMemo(() => {
    const set = new Set();
    wardSummary.forEach((w) => set.add(w.district_name || `District ${w.district_id}`));
    return ["ALL", ...Array.from(set).sort()];
  }, [wardSummary]);

  /* ── Derive unique ward IDs ────────────────────────────────────── */
  const wardIds = useMemo(() => {
    const set = new Set();
    allData.forEach((d) => set.add(d.ward_id));
    return Array.from(set).sort((a, b) => a - b);
  }, [allData]);

  /* ── Build ward_id → district_name mapping ─────────────────────── */
  const wardToDistrict = useMemo(() => {
    const map = {};
    wardSummary.forEach((w) => {
      map[w.ward_id] = w.district_name || `District ${w.district_id}`;
    });
    return map;
  }, [wardSummary]);

  /* ── Filtered data ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let result = [...allData];

    if (searchName) {
      const q = searchName.toLowerCase();
      result = result.filter((d) => d.owner_name.toLowerCase().includes(q));
    }
    if (filterWard) {
      result = result.filter((d) => d.ward_id === Number(filterWard));
    }
    if (filterDistrict !== "ALL") {
      result = result.filter(
        (d) => (wardToDistrict[d.ward_id] || "") === filterDistrict
      );
    }
    if (filterRisk !== "ALL") {
      result = result.filter(
        (d) => (d.risk_level || "").toUpperCase() === filterRisk
      );
    }
    if (filterType !== "ALL") {
      result = result.filter((d) => d.property_type === filterType);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [allData, searchName, filterWard, filterDistrict, filterRisk, filterType, sortKey, sortDir, wardToDistrict]);

  /* ── Pagination ────────────────────────────────────────────────── */
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [searchName, filterWard, filterDistrict, filterRisk, filterType]);

  /* ── Sort handler ──────────────────────────────────────────────── */
  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  /* ── Clear filters ─────────────────────────────────────────────── */
  function clearFilters() {
    setSearchName("");
    setFilterWard("");
    setFilterDistrict("ALL");
    setFilterRisk("ALL");
    setFilterType("ALL");
  }

  const hasFilters =
    searchName || filterWard || filterDistrict !== "ALL" || filterRisk !== "ALL" || filterType !== "ALL";

  /* ── Summary viz data (from filtered results) ──────────────────── */
  const riskDistribution = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filtered.forEach((d) => {
      const r = (d.risk_level || "").toUpperCase();
      if (counts[r] !== undefined) counts[r]++;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: RISK_COLORS[name],
    }));
  }, [filtered]);

  const typeDistribution = useMemo(() => {
    const map = {};
    filtered.forEach((d) => {
      const t = d.property_type || "Unknown";
      if (!map[t]) map[t] = { name: t, outstanding: 0, count: 0 };
      map[t].outstanding += Number(d.total_outstanding || 0);
      map[t].count++;
    });
    return Object.values(map).sort((a, b) => b.outstanding - a.outstanding);
  }, [filtered]);

  /* ── CSV Export ─────────────────────────────────────────────────── */
  function exportCSV() {
    const headers = [
      "Property ID", "Owner Name", "Ward ID", "Property Type",
      "Annual Tax", "Arrears", "Penalty", "Interest",
      "Years Pending", "Total Outstanding", "Risk Level",
    ];
    const rows = filtered.map((d) => [
      d.property_id, d.owner_name, d.ward_id, d.property_type,
      d.annual_tax, d.arrears, d.penalty, d.interest,
      d.years_pending, d.total_outstanding, d.risk_level,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "defaulters_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Render ────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="skeleton skeleton--title" />
        </div>
        <div className="glass-card skeleton" style={{ height: 80, marginBottom: 24 }} />
        <div className="glass-card skeleton skeleton--chart" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-header__title">Data Explorer</h1>
        <p className="page-header__subtitle">
          Search, filter, and analyze defaulter data across all wards and districts
        </p>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div className="glass-card filter-bar">
        <div className="filter-group" style={{ minWidth: 220 }}>
          <label className="filter-group__label">Search Owner</label>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-tertiary)",
              }}
            />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 34 }}
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-group__label">Ward</label>
          <select
            className="select"
            value={filterWard}
            onChange={(e) => setFilterWard(e.target.value)}
          >
            <option value="">All Wards</option>
            {wardIds.map((id) => (
              <option key={id} value={id}>Ward {id}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-group__label">District</label>
          <select
            className="select"
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
          >
            {districts.map((d) => (
              <option key={d} value={d}>{d === "ALL" ? "All Districts" : d}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-group__label">Risk Level</label>
          <select
            className="select"
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
          >
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>{r === "ALL" ? "All Levels" : r}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-group__label">Property Type</label>
          <select
            className="select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{t === "ALL" ? "All Types" : t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "flex-end" }}>
          {hasFilters && (
            <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
              <X size={14} /> Clear
            </button>
          )}
          <button className="btn btn--secondary btn--sm" onClick={exportCSV}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ── Results info ─────────────────────────────────────────── */}
      <div
        className="flex justify-between items-center mt-md"
        style={{ fontSize: 13, color: "var(--text-secondary)" }}
      >
        <span>
          <Users size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          {hasFilters && ` (filtered from ${allData.length})`}
        </span>
        <span>
          Total: <strong style={{ color: "var(--text-primary)" }}>
            {formatFullCurrency(filtered.reduce((s, d) => s + Number(d.total_outstanding || 0), 0))}
          </strong>
        </span>
      </div>

      {/* ── Data Table ───────────────────────────────────────────── */}
      <div className="glass-card data-table-wrapper mt-md">
        <table className="data-table">
          <thead>
            <tr>
              {[
                { key: "property_id", label: "ID" },
                { key: "owner_name", label: "Owner Name" },
                { key: "ward_id", label: "Ward" },
                { key: "property_type", label: "Type" },
                { key: "annual_tax", label: "Annual Tax" },
                { key: "arrears", label: "Arrears" },
                { key: "penalty", label: "Penalty" },
                { key: "years_pending", label: "Years" },
                { key: "total_outstanding", label: "Outstanding" },
                { key: "risk_level", label: "Risk" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={sortKey === key ? "sorted" : ""}
                >
                  <span className="flex items-center gap-sm">
                    {label}
                    <SortIcon col={key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  No results found
                </td>
              </tr>
            ) : (
              paged.map((d) => (
                <tr key={d.property_id}>
                  <td className="mono" style={{ color: "var(--accent-cyan)" }}>{d.property_id}</td>
                  <td>{d.owner_name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{d.ward_id}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{d.property_type}</td>
                  <td className="mono">{formatFullCurrency(d.annual_tax)}</td>
                  <td className="mono">{formatFullCurrency(d.arrears)}</td>
                  <td className="mono">{formatFullCurrency(d.penalty)}</td>
                  <td style={{ textAlign: "center" }}>{d.years_pending}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>
                    {formatFullCurrency(d.total_outstanding)}
                  </td>
                  <td><RiskBadge level={d.risk_level} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination__btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                className={`pagination__btn ${page === pageNum ? "active" : ""}`}
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            className="pagination__btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Summary Visualizations ────────────────────────────────── */}
      <div className="section mt-xl">
        <div className="section__title">
          <BarChart3 size={16} />
          Filtered Data Summary
        </div>
        <div className="grid-2">
          {/* Outstanding by Property Type */}
          <div className="glass-card chart-container">
            <div className="chart-container__title">
              <BarChart3 size={16} />
              Outstanding by Property Type
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeDistribution} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
                  <defs>
                    <linearGradient id="typeBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0b3c5d" />
                      <stop offset="100%" stopColor="#328cc1" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="outstanding" name="Outstanding" fill="url(#typeBarGrad)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Distribution (filtered) */}
          <div className="glass-card chart-container">
            <div className="chart-container__title">
              <PieChartIcon size={16} />
              Risk Distribution (Filtered)
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskDistribution
                      .filter((d) => d.value > 0)
                      .map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v} defaulters`} />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ color: "#334155", fontSize: 12 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
