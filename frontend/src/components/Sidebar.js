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
    <aside className="sidebar">
      {/* ── Brand ──────────────────────────────────────────────── */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Building2 size={28} />
        </div>
        <div className="sidebar__brand-text">
          <span className="sidebar__title">Revenue Recovery</span>
          <span className="sidebar__subtitle">Govt. of Maharashtra</span>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="sidebar__nav">
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
                className={`sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
                style={{ position: "relative" }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-bg"
                    className="sidebar__link-bg"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <Icon size={18} style={{ zIndex: 2, marginRight: "10px" }} />
                <span style={{ zIndex: 2 }}>{label}</span>
              </Link>
            );
          });
        })()}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="sidebar__footer" style={{ flexDirection: "column", gap: "14px", alignItems: "stretch" }}>
        {username && (
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="sidebar__logout-btn"
          >
            <LogOut size={16} />
            <span>Log Out ({username})</span>
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <div className={`sidebar__footer-dot ${isBackendOnline ? "sidebar__footer-dot--online" : "sidebar__footer-dot--offline"}`} />
          <span>{isBackendOnline ? "System Online" : "Backend Offline"}</span>
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: rgba(6, 9, 26, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          padding: var(--space-xl) 0;
        }

        .sidebar__brand {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: 0 var(--space-lg);
          margin-bottom: var(--space-3xl);
        }

        .sidebar__logo {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .sidebar__brand-text {
          display: flex;
          flex-direction: column;
        }

        .sidebar__title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .sidebar__subtitle {
          font-size: 11px;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .sidebar__nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 0 var(--space-md);
        }

        .sidebar__link {
          display: flex;
          align-items: center;
          padding: 13px var(--space-md);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          position: relative;
          transition: all var(--transition-base);
          text-decoration: none;
        }

        .sidebar__link:hover {
          background: var(--surface-hover);
          color: var(--text-primary);
          transform: translateX(6px);
        }

        :global(.sidebar__link-bg) {
          position: absolute;
          top: -8px;
          bottom: -6px;
          left: -8px;
          right: 42px;
          background: rgba(34, 211, 238, 0.1);
          backdrop-filter: blur(0.6px);
          -webkit-backdrop-filter: blur(4px);
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 0 10px rgba(34, 211, 238, 0.05);
          z-index: 1;
        }

        .sidebar__link--active {
          color: var(--accent-cyan);
        }

        .sidebar__link--active:hover {
          /* background is handled by Framer Motion background div */
        }

        .sidebar__footer {
          padding: var(--space-md) var(--space-lg);
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .sidebar__footer-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .sidebar__footer-dot--online {
          background: var(--accent-emerald);
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }

        .sidebar__footer-dot--offline {
          background: var(--accent-red);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.25);
          }
        }

        .sidebar__logout-btn {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: 10px 14px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: var(--radius-md);
          color: #fca5a5;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
          width: 100%;
          justify-content: center;
          margin-bottom: 2px;
        }

        .sidebar__logout-btn:hover {
          background: rgba(239, 68, 68, 0.18);
          color: white;
          border-color: rgba(239, 68, 68, 0.35);
          transform: translateY(-1px);
        }
        
        .sidebar__logout-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
