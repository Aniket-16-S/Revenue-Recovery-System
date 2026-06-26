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
          background: #ffffff;
          border-right: 2px solid #cbd5e1;
          display: flex;
          flex-direction: column;
          z-index: 100;
          padding: var(--space-lg) 0;
        }

        .sidebar__brand {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: 0 var(--space-md);
          margin-bottom: var(--space-xl);
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: var(--space-md);
        }

        .sidebar__logo {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          background: var(--accent-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          border: 1px solid #cbd5e1;
        }

        .sidebar__brand-text {
          display: flex;
          flex-direction: column;
        }

        .sidebar__title {
          font-size: 13px;
          font-weight: 700;
          color: var(--accent-cyan);
          letter-spacing: 0.01em;
          text-transform: uppercase;
          line-height: 1.2;
        }

        .sidebar__subtitle {
          font-size: 11px;
          color: var(--accent-orange);
          font-weight: 700;
          text-transform: uppercase;
          line-height: 1.2;
          margin-top: 2px;
        }

        .sidebar__nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 0 var(--space-sm);
        }

        .sidebar__link {
          display: flex;
          align-items: center;
          padding: 11px var(--space-md);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          position: relative;
          transition: all var(--transition-base);
          text-decoration: none;
        }

        .sidebar__link:hover {
          background: #f1f5f9;
          color: var(--accent-cyan);
          transform: translateX(4px);
        }

        :global(.sidebar__link-bg) {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          background: #e0f2fe;
          border-left: 4px solid var(--accent-cyan);
          border-radius: var(--radius-sm);
          z-index: 1;
        }

        .sidebar__link--active {
          color: #0369a1;
        }

        .sidebar__footer {
          padding: var(--space-md) var(--space-md);
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 12px;
          color: var(--text-secondary);
          border-top: 1px solid #cbd5e1;
        }

        .sidebar__footer-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .sidebar__footer-dot--online {
          background: #16a34a;
          box-shadow: 0 0 4px rgba(22, 163, 74, 0.3);
        }

        .sidebar__footer-dot--offline {
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

        .sidebar__logout-btn {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: 8px 12px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: var(--radius-sm);
          color: #b91c1c;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-base);
          width: 100%;
          justify-content: center;
          margin-bottom: 2px;
        }

        .sidebar__logout-btn:hover {
          background: #fecaca;
          color: #991b1b;
          border-color: #f87171;
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
