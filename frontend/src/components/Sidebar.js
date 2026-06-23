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
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notices", label: "AI Notices", icon: BrainCircuit },
  { href: "/explorer", label: "Data Explorer", icon: Search },
  { href: "/wards", label: "Ward Analytics", icon: MapPin },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isBackendOnline, setIsBackendOnline] = useState(true);

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

    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
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
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="sidebar__footer">
        <div className={`sidebar__footer-dot ${isBackendOnline ? "sidebar__footer-dot--online" : "sidebar__footer-dot--offline"}`} />
        <span>{isBackendOnline ? "System Online" : "Backend Offline"}</span>
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

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
