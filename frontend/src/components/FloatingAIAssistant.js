"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Send, Trash2, Sparkles, Database, Brain, CheckCircle, AlertCircle, Zap, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamAIChat } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

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
          <p className="msg-text">{msg.content}</p>
        ) : (
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

export default function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [sessionId] = useState(() => getSessionId());
  const [agentReady, setAgentReady] = useState(null); // null=checking, true, false
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  /* ── Check agent status and show speech bubble ─────────────────────── */
  useEffect(() => {
    const checkStatus = () => {
      const base = process.env.NEXT_PUBLIC_API_URL;
      fetch(`${base}/ai/status`)
        .then((r) => r.json())
        .then((d) => {
          setAgentReady(d.ready);
          if (d.ready) {
            setShowSpeechBubble(true);
            const timer = setTimeout(() => {
              setShowSpeechBubble(false);
            }, 5000);
            return () => clearTimeout(timer);
          }
        })
        .catch(() => {
          setAgentReady(false);
        });
    };

    checkStatus();
  }, []);

  /* ── Auto-scroll to bottom on new messages ─────────────────────── */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, status, isOpen]);

  /* ── Send message ───────────────────────────────────────────────── */
  const sendMessage = useCallback(
    async (text) => {
      const msg = text || input.trim();
      if (!msg || isLoading || agentReady === false) return;

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
        (s) => setStatus(s),
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: m.content + token } : m
            )
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, isStreaming: false } : m
            )
          );
          setIsLoading(false);
          setStatus("");
          setTimeout(() => inputRef.current?.focus(), 50);
        },
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
    [input, isLoading, sessionId, agentReady]
  );

  /* ── Clear conversation ─────────────────────────────────────────── */
  const clearChat = useCallback(async () => {
    if (isLoading && abortRef.current) abortRef.current.abort();
    setMessages([]);
    setStatus("");
    setIsLoading(false);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      await fetch(`${base}/ai/chat/${sessionId}`, {
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

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setShowSpeechBubble(false);
  };

  /* ── Setup offline message if clicked and offline ───────────────── */
  const chatMessagesToShow = (() => {
    if (agentReady === false) {
      return [{ id: "offline-msg", role: "ai", content: "Sorry, I am currently offline." }];
    }
    return messages;
  })();

  const isEmpty = chatMessagesToShow.length === 0;

  return (
    <div className="ai-float-container">
      {/* ── Dialogue Box Popup (Saves 5s then vanishes) ── */}
      <AnimatePresence>
        {showSpeechBubble && agentReady === true && !isOpen && (
          <motion.div
            className="ai-speech-bubble"
            initial={{ opacity: 0, y: -15, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="bubble-content">Hi, How can I help you?</div>
            <div className="bubble-arrow" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fixed Circular Robot Button ── */}
      <motion.button
        className="ai-float-btn"
        onClick={handleToggle}
        whileHover={{ scale: 1.08, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? <X size={28} /> : <Bot size={28} />}
      </motion.button>

      {/* ── Vertical Chat Window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ai-vertical-window"
            initial={{ opacity: 0, y: 50, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 30, scale: 0.95, x: 15 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {/* Header */}
            <div className="ai-window-header">
              <div className="header-title">
                <Bot size={18} />
                <span>AI Assistant</span>
              </div>
              <div className="header-actions">
                {agentReady === true && messages.length > 0 && (
                  <button className="clear-chat-btn" onClick={clearChat} title="Clear conversation">
                    <Trash2 size={13} />
                    <span>Clear</span>
                  </button>
                )}
                <button className="close-window-btn" onClick={() => setIsOpen(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="ai-window-messages">
              {isEmpty && agentReady === true && (
                <div className="vertical-welcome">
                  <div className="welcome-avatar-orb">
                    <Bot size={28} />
                  </div>
                  <h3 className="welcome-heading">How can I help you?</h3>
                  <p className="welcome-para">
                    I can query the database and answer questions about property tax defaulters, ward analytics, and outstanding dues.
                  </p>
                  <div className="suggestions-list-vertical">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        className="vertical-suggestion-chip"
                        onClick={() => sendMessage(s)}
                        disabled={isLoading}
                      >
                        <Sparkles size={11} className="suggestion-icon" />
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessagesToShow.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {isLoading && <StatusBar status={status} />}
              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="ai-window-input-area">
              <div className="ai-window-input-wrapper">
                <textarea
                  ref={inputRef}
                  className="ai-window-textarea"
                  placeholder={
                    agentReady === false
                      ? "AI agent is offline"
                      : "Ask about the data…"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isLoading || agentReady === false}
                  aria-label="Chat input"
                />
                <button
                  className={`ai-window-send-btn ${isLoading || !input.trim() || agentReady === false ? "disabled" : "active"}`}
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim() || agentReady === false}
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="input-hint">Press Enter to send</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .ai-float-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        :global(.ai-float-btn) {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(11, 60, 93, 0.85);
          backdrop-filter: blur(8px);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 25px rgba(11, 60, 93, 0.35);
          cursor: pointer;
          outline: none;
        }

        :global(.ai-speech-bubble) {
          position: relative;
          margin-bottom: 12px;
          background: white;
          color: var(--text-primary);
          padding: 10px 16px;
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          border: 1px solid var(--glass-border);
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          z-index: 10000;
        }

        .bubble-arrow {
          position: absolute;
          bottom: -6px;
          right: 26px;
          width: 10px;
          height: 10px;
          background: white;
          border-right: 1px solid var(--glass-border);
          border-bottom: 1px solid var(--glass-border);
          transform: rotate(45deg);
        }

        :global(.ai-vertical-window) {
          position: fixed;
          bottom: 98px;
          right: 24px;
          width: 340px;
          max-width: calc(100vw - 48px);
          height: 550px;
          max-height: calc(100vh - 120px);
          background: #edf2f7;
          border: 2px solid var(--accent-cyan);
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9998;
        }

        /* Window Header */
        .ai-window-header {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: #ffffff;
          border-bottom: 2px solid var(--accent-cyan);
          justify-content: space-between;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-weight: 700;
          color: var(--accent-cyan);
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .clear-chat-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: var(--radius-sm);
          color: #b91c1c;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .clear-chat-btn:hover {
          background: #fecaca;
        }

        .close-window-btn {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-window-btn:hover {
          color: var(--text-primary);
        }

        /* Chat Messages area */
        .ai-window-messages {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-md);
          background: #edf2f7;
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          scroll-behavior: smooth;
        }

        /* Welcome Welcome */
        .vertical-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 16px 8px;
          gap: var(--space-sm);
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-border);
          margin-bottom: var(--space-sm);
        }

        .welcome-avatar-orb {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-cyan);
          box-shadow: 0 4px 10px rgba(11, 60, 93, 0.05);
        }

        .welcome-heading {
          font-size: 16px;
          font-weight: 700;
          color: var(--accent-cyan);
        }

        .welcome-para {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: var(--space-xs);
        }

        .suggestions-list-vertical {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .vertical-suggestion-chip {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 8px 10px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.3;
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .vertical-suggestion-chip:hover:not(:disabled) {
          background: #e0f2fe;
          border-color: #0284c7;
          color: #0369a1;
        }

        .vertical-suggestion-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .suggestion-icon {
          flex-shrink: 0;
          color: var(--accent-cyan);
          margin-top: 2px;
        }

        /* Messages bubble styles inside window */
        :global(.ai-vertical-window .msg-row) {
          display: flex;
          align-items: flex-start;
          gap: var(--space-xs);
          animation: msgIn 0.25s ease;
        }

        :global(.ai-vertical-window .msg-row--user) {
          flex-direction: row-reverse;
        }

        :global(.ai-vertical-window .msg-avatar) {
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 9px;
          font-weight: 700;
        }

        :global(.ai-vertical-window .msg-avatar:not(.msg-avatar--user):not(.msg-avatar--error)) {
          background: #cbd5e1;
          border: 1px solid #94a3b8;
          color: #0f172a;
        }

        :global(.ai-vertical-window .msg-avatar--user) {
          background: #e0f2fe;
          border: 1px solid #bbf7d0;
          color: #0369a1;
        }

        :global(.ai-vertical-window .msg-bubble) {
          max-width: 80%;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          line-height: 1.5;
          font-size: 13px;
          box-shadow: var(--shadow-sm);
        }

        :global(.ai-vertical-window .msg-bubble--ai) {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-top-left-radius: 2px;
          color: var(--text-primary);
        }

        :global(.ai-vertical-window .msg-bubble--user) {
          background: #0b3c5d;
          border: 1px solid #002244;
          border-top-right-radius: 2px;
          color: #ffffff;
        }

        :global(.ai-vertical-window .msg-text) {
          font-size: 13px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        :global(.ai-vertical-window .msg-markdown p) {
          margin-bottom: 8px;
        }
        :global(.ai-vertical-window .msg-markdown p:last-child) {
          margin-bottom: 0;
        }
        :global(.ai-vertical-window .msg-markdown ul, .ai-vertical-window .msg-markdown ol) {
          margin-left: 16px;
          margin-bottom: 8px;
        }

        /* Thinking animation */
        :global(.ai-vertical-window .thinking-dots) {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          height: 16px;
        }

        :global(.ai-vertical-window .thinking-dots span) {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent-cyan);
          opacity: 0.6;
          animation: dotBounce 1.2s ease-in-out infinite;
        }

        :global(.ai-vertical-window .status-bar) {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #0369a1;
          padding: 6px 10px;
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          border-radius: var(--radius-sm);
          width: fit-content;
          font-weight: 700;
        }

        /* Input area */
        .ai-window-input-area {
          flex-shrink: 0;
          padding: var(--space-sm) var(--space-md) var(--space-md);
          border-top: 1px solid var(--glass-border);
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ai-window-input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: var(--radius-sm);
          padding: 6px 8px;
          transition: border-color var(--transition-base), box-shadow var(--transition-base);
        }

        .ai-window-input-wrapper:focus-within {
          border-color: var(--accent-purple);
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.12);
        }

        .ai-window-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 13px;
          line-height: 1.4;
          resize: none;
          min-height: 20px;
          max-height: 80px;
          overflow-y: auto;
          padding: 0;
        }

        .ai-window-textarea::placeholder {
          color: var(--text-tertiary);
        }

        .ai-window-send-btn {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
        }

        .ai-window-send-btn.active {
          background: var(--accent-cyan);
          color: white;
        }

        .ai-window-send-btn.active:hover {
          background: #1e3a8a;
        }

        .ai-window-send-btn.disabled {
          background: #f1f5f9;
          color: var(--text-tertiary);
          cursor: not-allowed;
        }

        .input-hint {
          font-size: 10px;
          color: var(--text-tertiary);
          text-align: center;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          :global(.ai-vertical-window) {
            bottom: 90px;
            right: 16px;
            width: 300px;
            max-width: calc(100vw - 32px);
            height: 480px;
            max-height: calc(100vh - 110px);
          }
          .ai-float-container {
            bottom: 16px;
            right: 16px;
          }
          :global(.ai-float-btn) {
            width: 56px;
            height: 56px;
          }
          :global(.ai-speech-bubble) {
            margin-bottom: 8px;
            font-size: 12px;
            padding: 8px 12px;
          }
          .bubble-arrow {
            right: 22px;
          }
        }
      `}</style>
    </div>
  );
}
