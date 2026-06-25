"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Send, Trash2, Sparkles, Database, Brain, CheckCircle, AlertCircle, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamAIChat } from "@/lib/api";
import "./ai-assistant.css";

/* ── Generate a stable session UUID per browser tab ────────────────── */
function getSessionId() {
  if (typeof window === "undefined") return "ssr";
  let sid = sessionStorage.getItem("ai_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("ai_session_id", sid);
  }
  return sid;
}

/* ── Suggested starter queries ─────────────────────────────────────── */
const SUGGESTIONS = [
  "How many total defaulters are there across all districts?",
  "Which district has the highest outstanding amount?",
  "Show me defaulters in Pune with outstanding less than 1 lakh",
  "What is the average outstanding amount per defaulter?",
  "How many critical cases are there in each ward?",
  "Which wards have the most defaulters?",
];

/* ── Thinking / status icon mapping ───────────────────────────────── */
function StatusIcon({ text }) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("database") || t.includes("query")) return <Database size={12} />;
  if (t.includes("analyz")) return <Brain size={12} />;
  if (t.includes("compos")) return <Sparkles size={12} />;
  return <Zap size={12} />;
}

/* ── Typing dots animation ─────────────────────────────────────────── */
function ThinkingDots() {
  return (
    <span className="thinking-dots" aria-label="AI thinking">
      <span />
      <span />
      <span />
    </span>
  );
}

/* ── Single message bubble ─────────────────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const isError = msg.isError;

  return (
    <div className={`msg-row ${isUser ? "msg-row--user" : "msg-row--ai"}`}>
      {!isUser && (
        <div className={`msg-avatar ${isError ? "msg-avatar--error" : ""}`}>
          {isError ? <AlertCircle size={16} /> : <Bot size={16} />}
        </div>
      )}

      <div
        className={`msg-bubble ${isUser ? "msg-bubble--user" : "msg-bubble--ai"} ${isError ? "msg-bubble--error" : ""
          } ${msg.isStreaming ? "msg-bubble--streaming" : ""}`}
      >
        {msg.isStreaming && !msg.content ? (
          <ThinkingDots />
        ) : isUser ? (
          /* User text — plain, no markdown */
          <p className="msg-text">{msg.content}</p>
        ) : (
          /* AI reply — render markdown */
          <div className="msg-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
        {msg.isStreaming && msg.content && (
          <span className="cursor-blink">▋</span>
        )}
      </div>

      {isUser && (
        <div className="msg-avatar msg-avatar--user">
          <span>You</span>
        </div>
      )}
    </div>
  );
}

/* ── Status bar shown while AI is working ─────────────────────────── */
function StatusBar({ status }) {
  if (!status) return null;
  return (
    <div className="status-bar">
      <div className="status-bar__dot" />
      <StatusIcon text={status} />
      <span>{status}</span>
    </div>
  );
}

/* ================================================================== */
/* AI Assistant Page                                                   */
/* ================================================================== */
export default function AIAssistantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [sessionId] = useState(() => getSessionId());
  const [agentReady, setAgentReady] = useState(null); // null=checking, true, false
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  /* ── Check agent status on mount ─────────────────────────────────── */
  useEffect(() => {
    fetch("http://127.0.0.1:8000/ai/status")
      .then((r) => r.json())
      .then((d) => setAgentReady(d.ready))
      .catch(() => setAgentReady(false));
  }, []);

  /* ── Auto-scroll to bottom on new messages ─────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  /* ── Send message ───────────────────────────────────────────────── */
  const sendMessage = useCallback(
    async (text) => {
      const msg = text || input.trim();
      if (!msg || isLoading) return;

      setInput("");
      setIsLoading(true);
      setStatus("Thinking…");

      // Add user message
      const userMsg = { id: Date.now(), role: "user", content: msg };
      setMessages((prev) => [...prev, userMsg]);

      // Add streaming AI placeholder
      const aiId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        { id: aiId, role: "ai", content: "", isStreaming: true },
      ]);

      abortRef.current = streamAIChat(
        sessionId,
        msg,
        // onStatus
        (s) => setStatus(s),
        // onToken
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: m.content + token } : m
            )
          );
        },
        // onDone
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, isStreaming: false } : m
            )
          );
          setIsLoading(false);
          setStatus("");
          inputRef.current?.focus();
        },
        // onError
        (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? {
                  ...m,
                  content: err?.message || "Something went wrong. Please try again.",
                  isStreaming: false,
                  isError: true,
                }
                : m
            )
          );
          setIsLoading(false);
          setStatus("");
        }
      );
    },
    [input, isLoading, sessionId]
  );

  /* ── Clear conversation ─────────────────────────────────────────── */
  const clearChat = useCallback(async () => {
    if (isLoading && abortRef.current) abortRef.current.abort();
    setMessages([]);
    setStatus("");
    setIsLoading(false);
    try {
      await fetch(`http://127.0.0.1:8000/ai/chat/${sessionId}`, {
        method: "DELETE",
      });
    } catch (_) { }
  }, [isLoading, sessionId]);

  /* ── Handle Enter key ───────────────────────────────────────────── */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ── Empty state ────────────────────────────────────────────────── */
  const isEmpty = messages.length === 0;

  return (
    <div className="ai-page">
      {/* Page Header */}
      <div className="page-header ai-page-header">
        <div className="ai-header-left">
          <div className="ai-header-icon">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="page-header__title">AI Assistant</h1>
            <p className="page-header__subtitle">
              Ask questions about defaulter's data (English Only)
            </p>
          </div>
        </div>
        <div className="ai-header-right">
          {agentReady === null && (
            <span className="agent-badge agent-badge--checking">
              <span className="agent-badge__dot agent-badge__dot--pulse" />
              Checking…
            </span>
          )}
          {agentReady === true && (
            <span className="agent-badge agent-badge--online">
              <CheckCircle size={12} />
              Agent Online
            </span>
          )}
          {agentReady === false && (
            <span className="agent-badge agent-badge--offline">
              <AlertCircle size={12} />
              Agent Offline
            </span>
          )}
          {messages.length > 0 && (
            <button
              className="clear-btn"
              onClick={clearChat}
              title="Clear conversation"
            >
              <Trash2 size={15} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="chat-window glass-card">
        <div className="chat-messages">
          {/* Welcome state */}
          {isEmpty && (
            <div className="welcome-state">
              <div className="welcome-orb">
                <Bot size={36} />
              </div>
              <h2 className="welcome-title">How can I help you ?</h2>
              <p className="welcome-sub">
                I can query the revenue database and answer questions about
                property tax defaulters, ward analytics, and outstanding dues.
              </p>
              <div className="suggestions-grid">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="suggestion-chip"
                    onClick={() => sendMessage(s)}
                    disabled={isLoading}
                  >
                    <Sparkles size={12} className="suggestion-chip__icon" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Status bar */}
          {isLoading && <StatusBar status={status} />}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder={
                agentReady === false
                  ? "AI agent is offline, check backend"
                  : "Ask anything about the data…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading || agentReady === false}
              aria-label="Chat input"
            />
            <button
              className={`send-btn ${isLoading || !input.trim() ? "send-btn--disabled" : "send-btn--active"}`}
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim() || agentReady === false}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="chat-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

    </div>
  );
}
