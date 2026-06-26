"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BrainCircuit,
  Search,
  MapPin,
  Building2,
  Bot,
  Users,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notices", label: "AI Notices", icon: BrainCircuit },
  { href: "/explorer", label: "Data Explorer", icon: Search },
  { href: "/wards", label: "Ward Analytics", icon: MapPin },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [userRole, setUserRole] = useState("user");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/health", { cache: "no-store" });
        if (res.ok) {
          setIsBackendOnline(true);
        } else {
          setIsBackendOnline(false);
        }
      } catch (err) {
        setIsBackendOnline(false);
      }
    };

    const handleAuth = () => {
      setUserRole(localStorage.getItem("userRole") || "user");
      setUsername(localStorage.getItem("username") || "");
    };

    checkBackend();
    handleAuth();

    const interval = setInterval(checkBackend, 60_000); // once per minute
    window.addEventListener("auth-change", handleAuth);

    return () => {
      clearInterval(interval);
      window.removeEventListener("auth-change", handleAuth);
    };
  }, []);

  return (
    <header className="navbar">
      {/* Top Tricolor line */}
      <div className="navbar__tricolor">
        <div className="navbar__blue-line" />
        <div className="navbar__flag-line" />
      </div>

      <div className="navbar__container">
        {/* ── Brand Section ── */}
        <div className="navbar__brand">
          <div className="navbar__logo">
            <Building2 size={20} />
          </div>
          <div className="navbar__brand-text">
            <span className="navbar__title">महसूल विभाग, महाराष्ट्र शासन</span>
            <span className="navbar__subtitle">Revenue Recovery System</span>
          </div>
        </div>

        {/* ── Navigation Links ── */}
        <nav className="navbar__nav">
          {(() => {
            const displayItems = [...NAV_ITEMS];
            if (userRole === "admin") {
              displayItems.push({ href: "/manage-users", label: "Manage Users", icon: Users });
            }
            return displayItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`navbar__link ${isActive ? "navbar__link--active" : ""}`}
                  style={{ position: "relative" }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-navbar-bg"
                      className="navbar__link-bg"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="navbar__link-icon">
                    <Icon size={16} />
                  </span>
                  <span className="navbar__link-text">{label}</span>
                </Link>
              );
            });
          })()}
        </nav>

        {/* ── Health & User Session ── */}
        <div className="navbar__user-section">
          <div className="navbar__status" title={isBackendOnline ? "System Online" : "System Offline"}>
            <div className={`navbar__status-dot ${isBackendOnline ? "navbar__status-dot--online" : "navbar__status-dot--offline"}`} />
            <span>{isBackendOnline ? "Online" : "Offline"}</span>
          </div>

          {username && (
            <div className="navbar__user-info">
              <span className="navbar__username">{username}</span>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="navbar__logout-btn"
                title="Log Out of system"
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--header-height);
          background: #ffffff;
          border-bottom: 2px solid #cbd5e1;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: var(--shadow-sm);
        }

        .navbar__tricolor {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .navbar__blue-line {
          height: 2px;
          background: #0b3c5d;
          width: 100%;
        }

        .navbar__flag-line {
          height: 6px;
          background: linear-gradient(
            to right,
            #ff9933 0%,
            rgba(255, 255, 255, 0) 30%,
            rgba(200, 200, 255, 0.9) 50%,
            rgba(255, 255, 255, 0) 70%,
            #128807 100%
          );
          width: 100%;
        }

        .navbar__container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
          padding: 0 var(--space-xl);
          width: 100%;
          gap: var(--space-md);
        }

        .navbar__brand {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex: 1;
          justify-content: flex-start;
        }

        .navbar__logo {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-sm);
          background: var(--accent-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: 1px solid #cbd5e1;
        }

        .navbar__brand-text {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .navbar__title {
          font-size: 18px;
          font-weight: 700;
          color: var(--accent-cyan);
          letter-spacing: 0.01em;
          text-transform: uppercase;
          line-height: 1.2;
        }

        .navbar__subtitle {
          font-size: 13px;
          color: var(--accent-orange);
          font-weight: 700;
          text-transform: uppercase;
          line-height: 1.2;
          margin-top: 5px;
        }

        .navbar__nav {
          display: flex;
          gap: 30px;
          align-items: center;
          justify-content: center;
          height: 100%;
          flex: 1;
        }

        .navbar__link {
          display: flex;
          align-items: center;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          position: relative;
          transition: all var(--transition-base);
          height: 38px;
          // background: #f8fafc;
          // border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .navbar__link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 7px 12px;
          height: 100%;
          // border-right: 1px solid #e2e8f0;
          transition: all var(--transition-base);
          position: relative;
          z-index: 2;
        }

        .navbar__link-text {
          padding: 0 14px;
          position: relative;
          z-index: 2;
        }

        .navbar__link:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
          color: var(--accent-cyan);
        }

        .navbar__link:hover .navbar__link-icon {
          background: #cbd5e1;
          border-right-color: #cbd5e1;
        }

        /* Span and SVG z-index is set to 2 to display on top of absolutely positioned navbar__link-bg */
        .navbar__link :global(span),
        .navbar__link :global(svg) {
          position: relative;
          z-index: 2;
        }

        :global(.navbar__link-bg) {
          position: absolute;
          inset: 0;
          background: rgba(14, 165, 233, 0.12);
          border-bottom: 2px solid var(--accent-cyan);
          border-radius: var(--radius-sm);
          z-index: 1;
          pointer-events: none;
        }

        .navbar__link--active {
          color: #0369a1 !important;
          border-color: #bae6fd !important;
          background: rgba(224, 242, 254, 0.5) !important;
        }

        .navbar__link--active .navbar__link-icon {
          background: rgba(186, 230, 253, 0.4);
          border-right-color: #bae6fd;
        }

        .navbar__user-section {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          flex: 1;
          justify-content: flex-end;
        }

        .navbar__status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-tertiary);
          font-weight: 600;
          text-transform: uppercase;
        }

        .navbar__status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .navbar__status-dot--online {
          background: #16a34a;
          box-shadow: 0 0 4px rgba(22, 163, 74, 0.3);
        }

        .navbar__status-dot--offline {
          background: #dc2626;
          box-shadow: 0 0 4px rgba(220, 38, 38, 0.3);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.2);
          }
        }

        .navbar__user-info {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          border-left: 1px solid #cbd5e1;
          padding-left: var(--space-md);
        }

        .navbar__username {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .navbar__logout-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: var(--radius-sm);
          color: #b91c1c;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .navbar__logout-btn:hover {
          background: #fecaca;
          color: #991b1b;
          border-color: #f87171;
        }

        @media (max-width: 1024px) {
          .navbar__container {
            padding: 0 var(--space-md);
          }
          .navbar__title {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .navbar {
            height: auto;
            min-height: 80px;
            padding-bottom: 6px;
          }
          .navbar__container {
            flex-direction: column;
            padding: var(--space-sm);
            gap: var(--space-sm);
            align-items: stretch;
          }
          .navbar__brand {
            justify-content: flex-start;
          }
          .navbar__nav {
            justify-content: center;
            overflow-x: auto;
            padding-bottom: 4px;
          }
          .navbar__user-section {
            justify-content: flex-end;
          }
        }
      `}</style>
    </header>
  );
}
