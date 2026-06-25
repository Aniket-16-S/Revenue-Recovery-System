"use client";

import { useEffect, useState } from "react";
import { Building2, User, Lock, AlertCircle, Loader2 } from "lucide-react";

export default function AuthWrapper({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [usernameState, setUsernameState] = useState("");
  const [passwordState, setPasswordState] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check session in localStorage
    const savedUser = localStorage.getItem("username");
    const savedRole = localStorage.getItem("userRole");
    if (savedUser && savedRole) {
      setIsAuthenticated(true);
      setUserRole(savedRole);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usernameState.trim() || !passwordState) return;

    setLoggingIn(true);
    setError("");

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameState.trim(),
          password: passwordState,
        }),
      });

      if (!res.ok) {
        throw new Error("Invalid Credentials");
      }

      const data = await res.json();
      localStorage.setItem("username", data.username);
      localStorage.setItem("userRole", data.role);
      setIsAuthenticated(true);
      setUserRole(data.role);

      // Dispatch custom event to notify Sidebar component
      window.dispatchEvent(new Event("auth-change"));
    } catch (err) {
      setError("Invalid Credentials");
      // Trigger a browser popup for invalid credentials
      alert("Invalid Credentials");
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="login-loading">
        <Loader2 className="spinning" size={48} color="#22d3ee" />
        <style jsx>{`
          .login-loading {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #030712;
          }
          .spinning {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <Building2 size={32} />
            </div>
            <h1 className="login-title">Revenue Recovery System</h1>
            <p className="login-subtitle">Government of Maharashtra</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label className="input-label">Username</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter your username"
                  className="login-input"
                  value={usernameState}
                  onChange={(e) => setUsernameState(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="login-input"
                  value={passwordState}
                  onChange={(e) => setPasswordState(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loggingIn}>
              {loggingIn ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Loader2 size={16} className="spinning" />
                  Logging in...
                </span>
              ) : (
                "Log In"
              )}
            </button>
          </form>
        </div>

        <style jsx>{`
          .login-page {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: radial-gradient(
              circle at center,
              #0d122b 0%,
              #030712 100%
            );
            padding: var(--space-md);
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 1000;
          }

          .login-card {
            width: 100%;
            max-width: 420px;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--radius-lg);
            padding: var(--space-2xl) var(--space-xl);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .login-header {
            text-align: center;
            margin-bottom: var(--space-xl);
          }

          .login-logo {
            width: 56px;
            height: 56px;
            border-radius: var(--radius-md);
            background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin: 0 auto var(--space-md) auto;
            box-shadow: 0 8px 16px rgba(6, 182, 212, 0.25);
          }

          .login-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 4px 0;
            letter-spacing: -0.01em;
          }

          .login-subtitle {
            font-size: 13px;
            color: var(--text-tertiary);
            font-weight: 500;
            margin: 0;
          }

          .login-form {
            display: flex;
            flex-direction: column;
            gap: var(--space-lg);
          }

          .input-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .input-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
          }

          .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
          }

          .input-icon {
            position: absolute;
            left: 14px;
            color: var(--text-tertiary);
            pointer-events: none;
          }

          .login-input {
            width: 100%;
            padding: 12px 14px 12px 42px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--radius-md);
            color: white;
            font-size: 14px;
            transition: all var(--transition-base);
          }

          .login-input:focus {
            outline: none;
            border-color: var(--accent-cyan);
            background: rgba(255, 255, 255, 0.06);
            box-shadow: 0 0 12px rgba(34, 211, 238, 0.15);
          }

          .login-error {
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            color: var(--accent-red);
            font-size: 13px;
            padding: var(--space-xs) var(--space-sm);
            background: rgba(239, 68, 68, 0.1);
            border-radius: var(--radius-sm);
            border: 1px solid rgba(239, 68, 68, 0.2);
          }

          .login-btn {
            padding: 12px;
            background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
            border: none;
            border-radius: var(--radius-md);
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-base);
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
          }

          .login-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(6, 182, 212, 0.3);
          }

          .login-btn:active:not(:disabled) {
            transform: translateY(0);
          }

          .login-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .spinning {
            animation: spin 1s linear infinite;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return children;
}
