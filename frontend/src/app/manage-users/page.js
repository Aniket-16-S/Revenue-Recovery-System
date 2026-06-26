"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Trash2,
  Mail,
  Loader2,
  ShieldAlert,
  Check,
  AlertCircle,
  User,
  Lock,
} from "lucide-react";

export default function ManageUsersPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Users listing state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // New user form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Recovery email inputs map (key: username, value: email)
  const [recoveryEmails, setRecoveryEmails] = useState({});
  const [sendingRecovery, setSendingRecovery] = useState({}); // key: username, value: boolean
  const [recoverySuccess, setRecoverySuccess] = useState({}); // key: username, value: string
  const [recoveryError, setRecoveryError] = useState({}); // key: username, value: string

  const [deletingUser, setDeletingUser] = useState({}); // key: username, value: boolean

  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role === "admin") {
      setIsAdmin(true);
      fetchUsers();
    } else {
      setIsAdmin(false);
    }
    setCheckingAuth(false);
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${base}/auth/users`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const username = newUsername.trim();
    const password = newPassword;

    if (!username || !password) {
      setFormError("Both username and password are required");
      return;
    }

    setAddingUser(true);
    try {
      const res = await fetch(`${base}/auth/users/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to add user");
      }

      setFormSuccess(`User '${username}' added/updated successfully!`);
      setNewUsername("");
      setNewPassword("");
      fetchUsers();
    } catch (err) {
      setFormError(err.message || "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!confirm(`Are you sure you want to remove user '${username}'?`)) return;

    setDeletingUser((prev) => ({ ...prev, [username]: true }));
    try {
      const res = await fetch(`${base}/auth/users/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to delete user");
      }

      fetchUsers();
    } catch (err) {
      alert(`Error deleting user: ${err.message}`);
    } finally {
      setDeletingUser((prev) => ({ ...prev, [username]: false }));
    }
  };

  const handleSendRecoveryMail = async (username) => {
    const userMail = (recoveryEmails[username] || "").trim();
    if (!userMail) {
      setRecoveryError((prev) => ({
        ...prev,
        [username]: "Email is required",
      }));
      return;
    }

    // Reset status
    setRecoveryError((prev) => ({ ...prev, [username]: "" }));
    setRecoverySuccess((prev) => ({ ...prev, [username]: "" }));
    setSendingRecovery((prev) => ({ ...prev, [username]: true }));

    try {
      const res = await fetch(`${base}/auth/users/recover-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, user_mail: userMail }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to send recovery email");
      }

      setRecoverySuccess((prev) => ({
        ...prev,
        [username]: "Recovery email sent!",
      }));
      setRecoveryEmails((prev) => ({ ...prev, [username]: "" }));
    } catch (err) {
      const errMsg = err.message || "Failed to send recovery email";
      setRecoveryError((prev) => ({ ...prev, [username]: errMsg }));
      // Browser popup for invalid email exception as required
      alert(`Error recovering user password: ${errMsg}`);
    } finally {
      setSendingRecovery((prev) => ({ ...prev, [username]: false }));
    }
  };

  const handleEmailChange = (username, value) => {
    setRecoveryEmails((prev) => ({ ...prev, [username]: value }));
    setRecoveryError((prev) => ({ ...prev, [username]: "" }));
    setRecoverySuccess((prev) => ({ ...prev, [username]: "" }));
  };

  if (checkingAuth) {
    return (
      <div className="center-loader">
        <Loader2 className="spinning" size={40} color="#0b3c5d" />
        <style jsx>{`
          .center-loader {
            height: calc(100vh - 80px);
            display: flex;
            align-items: center;
            justify-content: center;
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

  if (!isAdmin) {
    return (
      <div className="unauthorized-card glass-card">
        <ShieldAlert size={48} color="var(--accent-red)" />
        <h2>Access Denied</h2>
        <p>This page is restricted to administrator accounts only.</p>
        <style jsx>{`
          .unauthorized-card {
            max-width: 500px;
            margin: var(--space-3xl) auto;
            text-align: center;
            padding: var(--space-2xl);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-md);
          }
          .unauthorized-card h2 {
            margin: 0;
            color: var(--text-primary);
          }
          .unauthorized-card p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-header__title">User Administration Panel</h1>
        <p className="page-header__subtitle">
          Manage system normal users, register new accounts, and dispatch
          recovery emails.
        </p>
      </div>

      <div className="users-layout">
        {/* LEFT: Add User Form */}
        <div className="users-card-wrapper">
          <div className="glass-card" style={{ padding: "var(--space-lg)" }}>
            <h2 className="card-title">
              <UserPlus size={18} style={{ marginRight: 8 }} />
              Create Normal User
            </h2>
            <form onSubmit={handleAddUser} className="user-form">
              <div className="input-group">
                <label className="input-label">Username</label>
                <div className="input-wrapper">
                  <span className="input-prefix">
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., john_doe"
                    value={newUsername}
                    onChange={(e) => {
                      setNewUsername(e.target.value);
                      setFormError("");
                      setFormSuccess("");
                    }}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-wrapper">
                  <span className="input-prefix">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter user password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setFormError("");
                      setFormSuccess("");
                    }}
                    required
                  />
                </div>
              </div>

              {formError && (
                <div className="form-alert form-alert--error">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="form-alert form-alert--success">
                  <Check size={14} />
                  <span>{formSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn--primary"
                disabled={addingUser || !newUsername || !newPassword}
                style={{ width: "100%", marginTop: "var(--space-md)" }}
              >
                {addingUser ? (
                  <>
                    <Loader2 size={16} className="spinning" />
                    Adding User...
                  </>
                ) : (
                  "Create User"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Users List & Management */}
        <div className="users-card-wrapper">
          <div
            className="glass-card"
            style={{
              padding: "var(--space-lg)",
              minHeight: "400px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h2 className="card-title">Registered Accounts</h2>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingUsers ? (
                <div style={{ padding: "var(--space-lg)" }}>
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: 60, marginBottom: 8, borderRadius: 8 }}
                    />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="empty-users">
                  <p>No normal users registered in the system yet.</p>
                </div>
              ) : (
                <div className="user-list">
                  {users.map((username) => (
                    <div key={username} className="user-row">
                      <div className="user-row__header">
                        <span className="user-row__username">{username}</span>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteUser(username)}
                          disabled={deletingUser[username]}
                          title="Remove user"
                        >
                          {deletingUser[username] ? (
                            <Loader2 size={14} className="spinning" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>

                      {/* Recover Password email section */}
                      <div className="recovery-section">
                        <div className="flex gap-sm items-center mt-md" style={{ marginTop: "10px" }}>
                          <div className="input-wrapper" style={{ flex: 1 }}>
                            <span className="input-prefix" style={{ padding: "0 8px" }}>
                              <Mail size={12} />
                            </span>
                            <input
                              type="email"
                              className="input-field"
                              placeholder="Recover email (e.g. user@mail.com)"
                              value={recoveryEmails[username] || ""}
                              onChange={(e) =>
                                handleEmailChange(username, e.target.value)
                              }
                              style={{ fontSize: "12px", padding: "6px 10px" }}
                            />
                          </div>
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => handleSendRecoveryMail(username)}
                            disabled={
                              sendingRecovery[username] ||
                              !recoveryEmails[username]
                            }
                            style={{
                              whiteSpace: "nowrap",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {sendingRecovery[username] ? (
                              <Loader2 size={12} className="spinning" />
                            ) : (
                              <Mail size={12} />
                            )}
                            Send Recovery Mail
                          </button>
                        </div>
                        {recoveryError[username] && (
                          <div className="recovery-alert recovery-alert--error">
                            <AlertCircle size={12} />
                            <span>{recoveryError[username]}</span>
                          </div>
                        )}
                        {recoverySuccess[username] && (
                          <div className="recovery-alert recovery-alert--success">
                            <Check size={12} />
                            <span>{recoverySuccess[username]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .users-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: var(--space-lg);
          align-items: start;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 var(--space-lg) 0;
          display: flex;
          align-items: center;
        }

        .user-form {
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
          font-weight: 500;
          color: var(--text-secondary);
        }

        .form-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          margin-top: 4px;
        }

        .form-alert--error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .form-alert--success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .empty-users {
          padding: var(--space-2xl);
          text-align: center;
          color: var(--text-tertiary);
          font-size: 14px;
        }

        .user-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .user-row {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: var(--radius-md);
          padding: var(--space-md);
          box-shadow: var(--shadow-sm);
        }

        .user-row__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-sm);
        }

        .user-row__username {
          font-weight: 700;
          color: var(--accent-cyan);
          font-size: 15px;
          flex: 1;
        }

        .btn-delete {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: #b91c1c;
          padding: 6px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-base);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-delete:hover:not(:disabled) {
          background: #fecaca;
          color: #991b1b;
          border-color: #f87171;
        }

        .recovery-section {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: var(--radius-sm);
          padding: var(--space-sm);
          margin-top: var(--space-xs);
        }

        .recovery-alert {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          margin-top: 6px;
          font-weight: 600;
        }

        .recovery-alert--error {
          color: var(--accent-red);
        }

        .recovery-alert--success {
          color: #15803d;
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

        @media (max-width: 900px) {
          .users-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
