"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BrainCircuit, Send, FileText, Clock,
  Download, Copy, Check, Sparkles, Loader2,
  AlertCircle, ChevronRight,
} from "lucide-react";
import {
  generateNoticeStream,
  fetchNoticesList,
  fetchNoticeContent,
  fetchDefaulterById,
  formatFullCurrency,
} from "@/lib/api";

const NOTICE_TYPES = ["Reminder", "Payment Due", "Final Demand"];

export default function NoticesPage() {
  /* ── State ─────────────────────────────────────────────────────── */
  const [propertyId, setPropertyId] = useState("");
  const [noticeType, setNoticeType] = useState("Reminder");
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [defaulterInfo, setDefaulterInfo] = useState(null);

  // History
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [selectedContent, setSelectedContent] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);

  const streamRef = useRef(null);
  const outputRef = useRef(null);

  /* ── Load notice history ───────────────────────────────────────── */
  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const list = await fetchNoticesList();
      setNotices(list || []);
    } catch (err) {
      console.error("Failed to load notice history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  /* ── Lookup defaulter info ─────────────────────────────────────── */
  async function lookupDefaulter() {
    if (!propertyId) return;
    try {
      const info = await fetchDefaulterById(Number(propertyId));
      setDefaulterInfo(info);
      if (!info) setError("Property not found");
      else setError("");
    } catch {
      setDefaulterInfo(null);
    }
  }

  /* ── Generate notice (SSE streaming) ───────────────────────────── */
  const handleGenerate = useCallback(() => {
    if (!propertyId || streaming) return;
    setError("");
    setStreamedText("");
    setStreaming(true);

    const controller = generateNoticeStream(
      Number(propertyId),
      noticeType,
      // onToken
      (token) => {
        setStreamedText((prev) => prev + token);
        // Auto-scroll
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      },
      // onDone
      () => {
        setStreaming(false);
        loadHistory(); // Refresh history
      },
      // onError
      (err) => {
        setStreaming(false);
        setError(err.message || "Failed to generate notice");
      }
    );

    streamRef.current = controller;
  }, [propertyId, noticeType, streaming]);

  /* ── View a saved notice ───────────────────────────────────────── */
  async function viewNotice(notice) {
    setSelectedNotice(notice);
    try {
      const data = await fetchNoticeContent(notice.property_id);
      setSelectedContent(data?.content || "");
    } catch {
      setSelectedContent("Failed to load notice content.");
    }
  }

  /* ── Copy to clipboard ─────────────────────────────────────────── */
  function handleCopy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── Download as PDF ───────────────────────────────────────────── */
  function handleDownloadPdf(propId) {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const url = `${base}/notices/${propId}/pdf`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reminder_Notice_${propId}.pdf`;
    a.click();
  }

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-header__title">AI Notice Generator</h1>
        <p className="page-header__subtitle">
          Generate AI-powered property tax notices with real-time streaming
        </p>
      </div>

      <div className="notices-layout">
        {/* ═══════════════════════════════════════════════════════ */}
        {/* LEFT: Notice Generator                                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="notices-generator">
          {/* Property ID Input */}
          <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
            <label className="filter-group__label" style={{ marginBottom: 8, display: "block" }}>
              Property ID
            </label>
            <div className="flex gap-sm">
              <input
                type="number"
                className="input"
                placeholder="Enter property ID (e.g., 18)"
                value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value);
                  setError("");
                  setDefaulterInfo(null);
                }}
                onBlur={lookupDefaulter}
                onKeyDown={(e) => e.key === "Enter" && lookupDefaulter()}
              />
              <button
                className="btn btn--secondary btn--sm"
                onClick={lookupDefaulter}
                style={{ whiteSpace: "nowrap" }}
              >
                Lookup
              </button>
            </div>

            {/* Defaulter Info Preview */}
            {defaulterInfo && (
              <div
                className="mt-md"
                style={{
                  padding: "var(--space-sm) var(--space-md)",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 600 }}>{defaulterInfo.owner_name}</span>
                  <span className="risk-badge risk-badge--{defaulterInfo.risk_level}">
                    <RiskBadgeInline level={defaulterInfo.risk_level} />
                  </span>
                </div>
                <div className="text-xs text-secondary mt-md" style={{ marginTop: 4 }}>
                  Ward {defaulterInfo.ward_id} · Outstanding: {formatFullCurrency(defaulterInfo.total_outstanding)}
                </div>
              </div>
            )}
          </div>

          {/* Notice Type Selector */}
          <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
            <label className="filter-group__label" style={{ marginBottom: 8, display: "block" }}>
              Notice Type
            </label>
            <div className="notice-type-group">
              {NOTICE_TYPES.map((type) => (
                <button
                  key={type}
                  className={`notice-type-btn ${noticeType === type ? "active" : ""}`}
                  onClick={() => setNoticeType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            className="btn btn--primary"
            onClick={handleGenerate}
            disabled={!propertyId || streaming}
            style={{ width: "100%" }}
          >
            {streaming ? (
              <>
                <Loader2 size={16} className="spinning" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Notice
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-sm" style={{ color: "var(--accent-red)", fontSize: 13 }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Streaming Output */}
          <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
            <div className="flex justify-between items-center mb-md">
              <div className="chart-container__title" style={{ margin: 0 }}>
                <BrainCircuit size={16} />
                Generated Notice
              </div>
              {streamedText && !streaming && (
                <div className="flex gap-sm">
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => handleCopy(streamedText)}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => handleDownloadPdf(propertyId)}
                  >
                    <Download size={14} />
                    Download PDF
                  </button>
                </div>
              )}
            </div>

            <div className="streaming-area" ref={outputRef}>
              {!streamedText && !streaming && (
                <div className="empty-state" style={{ padding: "var(--space-xl)" }}>
                  <Sparkles size={32} style={{ opacity: 0.3 }} />
                  <p className="empty-state__title">Ready to Generate</p>
                  <p className="empty-state__text">
                    Enter a property ID and click Generate to create an AI-powered notice
                  </p>
                </div>
              )}
              {streamedText && (
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamedText}
                  </ReactMarkdown>
                </div>
              )}
              {streaming && <span className="streaming-cursor" />}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* RIGHT: Notice History                                    */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="notices-history">
          <div className="glass-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                padding: "var(--space-md) var(--space-lg)",
                borderBottom: "1px solid var(--glass-border)",
              }}
            >
              <div className="chart-container__title" style={{ margin: 0 }}>
                <Clock size={16} />
                Notice History
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingHistory ? (
                <div style={{ padding: "var(--space-lg)" }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 8 }} />
                  ))}
                </div>
              ) : notices.length === 0 ? (
                <div className="empty-state">
                  <FileText />
                  <p className="empty-state__title">No notices yet</p>
                  <p className="empty-state__text">Generated notices will appear here</p>
                </div>
              ) : (
                notices.map((n) => (
                  <div
                    key={n.property_id}
                    className={`notice-card ${selectedNotice?.property_id === n.property_id ? "notice-card--selected" : ""}`}
                    onClick={() => viewNotice(n)}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      background:
                        selectedNotice?.property_id === n.property_id
                          ? "rgba(34,211,238,0.06)"
                          : undefined,
                    }}
                  >
                    <div className="notice-card__header">
                      <span className="notice-card__id">
                        Property #{n.property_id}
                      </span>
                      <span className="notice-card__date">
                        {new Date(n.modified_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="notice-card__preview">{n.preview}</p>
                  </div>
                ))
              )}
            </div>

            {/* Selected notice content */}
            {selectedNotice && selectedContent && (
              <div
                style={{
                  borderTop: "1px solid var(--glass-border)",
                  padding: "var(--space-md) var(--space-lg)",
                  maxHeight: 300,
                  overflowY: "auto",
                }}
              >
                <div className="flex justify-between items-center mb-md">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    Property #{selectedNotice.property_id}
                  </span>
                  <div className="flex gap-sm">
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleCopy(selectedContent)}
                      title="Copy Markdown"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleDownloadPdf(selectedNotice.property_id)}
                      title="Download PDF"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
                <div className="markdown-content" style={{ fontSize: 13 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedContent}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .notices-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: var(--space-lg);
          align-items: start;
        }

        .notices-generator {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .notices-history {
          position: sticky;
          top: var(--space-lg);
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .notices-layout {
            grid-template-columns: 1fr;
          }

          .notices-history {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Inline Risk Badge (avoids import loop) ─────────────────────── */
function RiskBadgeInline({ level }) {
  const n = (level || "").toUpperCase();
  return <span className={`risk-badge risk-badge--${n}`}>{n}</span>;
}
