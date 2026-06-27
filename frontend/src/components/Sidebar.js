"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BrainCircuit,
  Search,
  MapPin,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
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
  const [userRole, setUserRole] = useState("user");
  const [username, setUsername] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, { cache: "no-store" });
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

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 992);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      clearInterval(interval);
      window.removeEventListener("auth-change", handleAuth);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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

        {/* ── Desktop/Laptop Menu items ── */}
        {!isMobile && (
          <>
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
          </>
        )}

        {/* ── Mobile Hamburger Button ── */}
        {isMobile && (
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="navbar__hamburger-btn"
            aria-label="Toggle Navigation Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* ── Mobile Navigation Dropdown (Floating Side Drawer with Backdrop Blur) ── */}
      <AnimatePresence>
        {isMobile && isMenuOpen && (
          <>
            <motion.div
              className="navbar__mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              className="navbar__mobile-menu"
              initial={{ opacity: 0, x: 150 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 150 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              <div className="navbar__mobile-menu-header">
                <span className="navbar__mobile-menu-title">Menu</span>
                <button
                  className="navbar__mobile-close-btn"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close Menu"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="navbar__mobile-nav">
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
                        className={`navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`}
                      >
                        <span className="navbar__mobile-link-icon">
                          <Icon size={16} />
                        </span>
                        <span className="navbar__mobile-link-text">{label}</span>
                      </Link>
                    );
                  });
                })()}
              </nav>

              <div className="navbar__mobile-user-section">
                <div className="navbar__mobile-status" title={isBackendOnline ? "System Online" : "System Offline"}>
                  <div className={`navbar__status-dot ${isBackendOnline ? "navbar__status-dot--online" : "navbar__status-dot--offline"}`} />
                  <span>{isBackendOnline ? "Online" : "Offline"}</span>
                </div>

                {username && (
                  <div className="navbar__mobile-user-info">
                    <span className="navbar__mobile-username">User: {username}</span>
                    <button
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                      className="navbar__mobile-logout-btn"
                      title="Log Out of system"
                    >
                      <LogOut size={13} />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
          overflow: hidden;
        }

        .navbar__link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 7px 12px;
          height: 100%;
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

        /* Mobile Hamburger & Menu styles */
        .navbar__hamburger-btn {
          background: transparent;
          border: none;
          color: var(--accent-cyan);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-xs);
          transition: transform var(--transition-fast);
        }

        .navbar__hamburger-btn:hover {
          transform: scale(1.05);
        }

        :global(.navbar__mobile-backdrop) {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(4px);
          z-index: 998;
        }

        :global(.navbar__mobile-menu) {
          position: fixed;
          top: 96px;
          right: 16px;
          bottom: 16px;
          width: 280px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: var(--radius-lg);
          box-shadow: -5px 5px 25px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          padding: var(--space-md);
          gap: var(--space-md);
          z-index: 999;
          overflow-y: auto;
        }

        .navbar__mobile-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: var(--space-md);
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: var(--space-sm);
        }

        .navbar__mobile-menu-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .navbar__mobile-close-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          transition: all var(--transition-fast);
        }

        .navbar__mobile-close-btn:hover {
          background: #e2e8f0;
          color: var(--text-primary);
        }

        .navbar__mobile-nav {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .navbar__mobile-link {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 16px 20px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: all var(--transition-base);
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          gap: 20px;
        }

        .navbar__mobile-link:hover {
          background: #e2e8f0;
          color: var(--accent-cyan);
          border-color: #cbd5e1;
        }

        .navbar__mobile-link--active {
          color: #0369a1 !important;
          border-color: #bae6fd !important;
          background: rgba(224, 242, 254, 0.5) !important;
        }

        .navbar__mobile-link-icon {
          display: flex;
          align-items: center;
          color: inherit;
        }

        .navbar__mobile-user-section {
          border-top: 1px solid #cbd5e1;
          padding-top: var(--space-md);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          margin-top: auto;
        }

        .navbar__mobile-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 700;
          text-transform: uppercase;
        }

        .navbar__mobile-user-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          padding: var(--space-sm) var(--space-md);
          border: 1px solid #cbd5e1;
          border-radius: var(--radius-sm);
        }

        .navbar__mobile-username {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .navbar__mobile-logout-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: var(--radius-sm);
          color: #b91c1c;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .navbar__mobile-logout-btn:hover {
          background: #fecaca;
          color: #991b1b;
        }

        @media (max-width: 992px) {
          .navbar__container {
            padding: 0 var(--space-md);
          }
          .navbar__title {
            font-size: 15px;
          }
          .navbar__subtitle {
            font-size: 11px;
            margin-top: 2px;
          }
        }

        @media (max-width: 480px) {
          .navbar__title {
            font-size: 12px;
          }
          .navbar__subtitle {
            font-size: 9px;
            margin-top: 1px;
          }
          .navbar__brand-text {
            max-width: 180px;
          }
          .navbar__logo {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </header>
  );
}
