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
        <Loader2 className="spinning" size={48} color="#0b3c5d" />
        <style jsx>{`
          .login-loading {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
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
        {/* Top Official Banner */}
        <header className="gov-header">
          <div className="gov-header__tricolor">
            <div className="gov-header__blue-line" />
            <div className="gov-header__flag-line" />
          </div>
          <div className="gov-header__container">
            <div className="gov-header__brand">
              <div className="gov-header__emblem">
                <Building2 size={24} />
              </div>
              <div className="gov-header__text">
                <span className="gov-header__department">महसूल विभाग, महाराष्ट्र शासन</span>
                <span className="gov-header__agency">Revenue & Forest Department, Govt. of Maharashtra</span>
              </div>
            </div>
            <div className="gov-header__links">
              <span>मराठी</span>
              <span>|</span>
              <span>English</span>
              <span className="gov-header__accessibility-btn">A-</span>
              <span className="gov-header__accessibility-btn">A</span>
              <span className="gov-header__accessibility-btn">A+</span>
            </div>
          </div>
        </header>

        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <h2 className="login-title">Revenue Recovery System</h2>
              <p className="login-subtitle">Government of Maharashtra</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <label className="input-label">Username / युझरनेम</label>
                <div className="input-wrapper">
                  <span className="input-prefix">
                    <User size={16} />
                  </span>
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
                <label className="input-label">Password / पासवर्ड</label>
                <div className="input-wrapper">
                  <span className="input-prefix">
                    <Lock size={16} />
                  </span>
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
                  "Log In / लॉगिन करा"
                )}
              </button>
            </form>
          </div>

          <div className="gov-disclaimer">
            <div className="gov-disclaimer__title">IMPORTANT INSTRUCTIONS / महत्वाच्या सूचना</div>
            <ul className="gov-disclaimer__list">
              <li>This portal is restricted to authorized Revenue Department officers only.</li>
              <li>Unauthorized access, tampering, or attempts to download unauthorized data are strictly prohibited.</li>
              <li>All activities on this platform are monitored and logged for security compliance.</li>
              <li>हे पोर्टल केवळ अधिकृत महसूल विभागाच्या अधिकाऱ्यांसाठी मर्यादित आहे. अनधिकृत प्रवेशास कायद्यानुसार मनाई आहे.</li>
            </ul>
          </div>
        </div>

        <footer className="gov-footer">
          <div className="gov-footer__content">
            <span>© 2026 Revenue & Forest Department, Government of Maharashtra. All Rights Reserved.</span>
            <span>Designed and Hosted by National Informatics Centre (NIC)</span>
          </div>
        </footer>

        <style jsx>{`
          .login-page {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background: #f1f5f9;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 1000;
            overflow-y: auto;
          }

          /* Gov Header */
          .gov-header {
            background: #ffffff;
            border-bottom: 2px solid #cbd5e1;
            width: 100%;
            flex-shrink: 0;
          }
          .gov-header__tricolor {
            display: flex;
            flex-direction: column;
            width: 100%;
          }
          .gov-header__blue-line {
            height: 2px;
            background: #0b3c5d;
            width: 100%;
          }
          .gov-header__flag-line {
            height: 4px;
            background: linear-gradient(
              to right,
              #ff9933 0%,
              rgba(255, 255, 255, 0) 30%,
              rgba(255, 255, 255, 0) 70%,
              #128807 100%
            );
            width: 100%;
          }
          .gov-header__container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .gov-header__brand {
            display: flex;
            align-items: center;
            gap: var(--space-md);
          }
          .gov-header__emblem {
            width: 36px;
            height: 36px;
            border-radius: var(--radius-sm);
            background: var(--accent-cyan);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #cbd5e1;
          }
          .gov-header__text {
            display: flex;
            flex-direction: column;
          }
          .gov-header__department {
            font-size: 15px;
            font-weight: 700;
            color: var(--accent-cyan);
          }
          .gov-header__agency {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-tertiary);
          }
          .gov-header__links {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
          }
          .gov-header__accessibility-btn {
            padding: 2px 6px;
            border: 1px solid #cbd5e1;
            border-radius: 2px;
            background: #f8fafc;
            cursor: pointer;
            margin-left: 2px;
          }

          /* Main Login Container */
          .login-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-lg) var(--space-md);
            gap: var(--space-lg);
            max-width: 480px;
            margin: 0 auto;
            width: 100%;
          }

          .login-card {
            width: 100%;
            background: #ffffff;
            border: 2px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: var(--space-xl);
            box-shadow: var(--shadow-md);
            animation: fadeIn 0.4s ease-out;
            border-top: 4px solid var(--accent-cyan);
          }

          .login-header {
            text-align: center;
            margin-bottom: var(--space-lg);
          }

          .login-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--accent-cyan);
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }

          .login-subtitle {
            font-size: 12px;
            color: var(--accent-orange);
            font-weight: 700;
            margin: 0;
            text-transform: uppercase;
          }

          .login-form {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
          }

          .input-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .input-label {
            font-size: 12px;
            font-weight: 700;
            color: var(--text-secondary);
          }

          /* Prefix Icon Wrapper Spacing */
          .input-wrapper {
            display: flex;
            align-items: stretch;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            background: #ffffff;
            overflow: hidden;
            transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          }

          .input-wrapper:focus-within {
            border-color: var(--accent-purple);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
          }

          .input-prefix {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 12px;
            background: #f1f5f9;
            border-right: 1px solid #cbd5e1;
            color: #64748b;
          }

          .login-input {
            flex: 1;
            border: none;
            padding: 10px 14px;
            font-size: 14px;
            color: #0f172a;
            background: transparent;
            outline: none;
          }

          .login-error {
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            color: var(--accent-red);
            font-size: 13px;
            padding: 8px 12px;
            background: #fee2e2;
            border-radius: var(--radius-sm);
            border: 1px solid #fca5a5;
            font-weight: 600;
          }

          .login-btn {
            padding: 12px;
            background: var(--accent-cyan);
            border: 1px solid #002244;
            border-radius: var(--radius-sm);
            color: #ffffff;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--transition-base);
            box-shadow: var(--shadow-sm);
            text-transform: uppercase;
            margin-top: 4px;
          }

          .login-btn:hover:not(:disabled) {
            background: #1e3a8a;
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
          }

          .login-btn:active:not(:disabled) {
            transform: translateY(0);
          }

          .login-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          /* Disclaimer Box */
          .gov-disclaimer {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: var(--radius-sm);
            padding: var(--space-md);
            width: 100%;
            box-shadow: var(--shadow-sm);
            border-left: 4px solid var(--accent-orange);
          }
          .gov-disclaimer__title {
            font-size: 12px;
            font-weight: 700;
            color: var(--accent-orange);
            margin-bottom: var(--space-xs);
            text-transform: uppercase;
          }
          .gov-disclaimer__list {
            list-style-type: disc;
            padding-left: 20px;
            font-size: 11px;
            color: var(--text-secondary);
            line-height: 1.5;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          /* Gov Footer */
          .gov-footer {
            background: #f8fafc;
            border-top: 1px solid #cbd5e1;
            padding: var(--space-md) var(--space-xl);
            width: 100%;
            text-align: center;
            font-size: 11px;
            color: var(--text-tertiary);
            flex-shrink: 0;
          }
          .gov-footer__content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-weight: 600;
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
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return children;
}
