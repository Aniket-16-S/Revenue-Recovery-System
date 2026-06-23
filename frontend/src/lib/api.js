/**
 * src/lib/api.js
 * ---------------
 * Centralised API client for the Revenue Recovery System backend.
 * All functions hit the FastAPI endpoints defined in API_CONTRACT.md.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/* ------------------------------------------------------------------ */
/* Health                                                               */
/* ------------------------------------------------------------------ */
export async function fetchHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error("API health check failed");
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Ward Summary                                                         */
/* ------------------------------------------------------------------ */
export async function fetchWardSummary(wardNumber) {
  const url = wardNumber
    ? `${BASE}/defaulters/summary/ward?ward_number=${wardNumber}`
    : `${BASE}/defaulters/summary/ward`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch ward summary");
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Top Defaulters                                                       */
/* ------------------------------------------------------------------ */
export async function fetchTopDefaulters(limit = 5) {
  const res = await fetch(`${BASE}/defaulters/top?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch top defaulters");
  return res.json();
}

/* ------------------------------------------------------------------ */
/* All Defaulters (optionally by ward)                                  */
/* ------------------------------------------------------------------ */
export async function fetchDefaulters(wardId) {
  const url = wardId
    ? `${BASE}/defaulters?ward_id=${wardId}`
    : `${BASE}/defaulters`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch defaulters");
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Single Defaulter                                                     */
/* ------------------------------------------------------------------ */
export async function fetchDefaulterById(propertyId) {
  const res = await fetch(`${BASE}/defaulters/${propertyId}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch defaulter");
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Notices — list saved                                                  */
/* ------------------------------------------------------------------ */
export async function fetchNoticesList() {
  const res = await fetch(`${BASE}/notices/list`);
  if (!res.ok) throw new Error("Failed to fetch notices list");
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Notices — read content                                               */
/* ------------------------------------------------------------------ */
export async function fetchNoticeContent(propertyId) {
  const res = await fetch(`${BASE}/notices/${propertyId}/content`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch notice content");
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Notices — generate (SSE streaming)                                   */
/* ------------------------------------------------------------------ */
export function generateNoticeStream(propertyId, noticeType, onToken, onDone, onError) {
  const controller = new AbortController();

  fetch(`${BASE}/notices/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ property_id: propertyId, notice_type: noticeType }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate notice");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            // "data: token" → extract after "data: " (6 chars)
            // "data:"       → empty token, means newline was sent
            const token = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
            // Empty token from SSE = the LLM emitted a newline character
            onToken(token === "" ? "\n" : token);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith("data:")) {
        const token = buffer.startsWith("data: ") ? buffer.slice(6) : buffer.slice(5);
        onToken(token === "" ? "\n" : token);
      }

      if (onDone) onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError" && onError) {
        onError(err);
      }
    });

  return controller;
}

/* ------------------------------------------------------------------ */
/* Utility: format Indian currency (lakhs / crores)                     */
/* ------------------------------------------------------------------ */
export function formatCurrency(amount) {
  if (amount == null) return "₹0";
  const num = Number(amount);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString("en-IN")}`;
}

export function formatFullCurrency(amount) {
  if (amount == null) return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
