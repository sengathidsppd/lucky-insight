"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface UserResponse {
  id: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export default function UsersPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUserId, setResetTargetUserId] = useState<string | null>(null);
  const [resetTargetUserEmail, setResetTargetUserEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const resp = await apiRequest("/users");
      setUsers(resp.data);
    } catch (err: any) {
      setError(err.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || !user?.is_admin) {
        router.push("/dashboard");
      } else {
        fetchUsers();
      }
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (userId === user?.id) {
      alert("You cannot change your own admin status.");
      return;
    }

    const confirmMsg = currentStatus 
      ? "Are you sure you want to revoke Admin privileges for this user?"
      : "Are you sure you want to grant Admin privileges to this user?";
    
    if (!confirm(confirmMsg)) return;

    try {
      await apiRequest(`/users/${userId}/admin`, {
        method: "PATCH",
        body: JSON.stringify({ is_admin: !currentStatus }),
      });
      // Refresh list
      fetchUsers();
    } catch (err: any) {
      alert("Failed to update admin status: " + err.message);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUserId || !newPassword) return;

    setIsResetting(true);
    try {
      await apiRequest(`/users/${resetTargetUserId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ new_password: newPassword }),
      });
      alert(`Successfully reset password for ${resetTargetUserEmail}`);
      setIsResetModalOpen(false);
      setNewPassword("");
    } catch (err: any) {
      alert("Failed to reset password: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (isAuthLoading || (isAuthenticated && !user?.is_admin && !error)) {
    return (
      <div style={containerStyle}>
        <div style={loadingContainerStyle}>
          <div style={spinnerStyle} />
          <span>Verifying authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>User Management</h1>
          <p style={subtitleStyle}>Manage accounts and administrative privileges.</p>
        </div>
      </div>

      {/* Main Table Area */}
      {isLoading ? (
        <div style={loadingContainerStyle}>
          <div style={spinnerStyle} />
          <span>Fetching users...</span>
        </div>
      ) : error ? (
        <div style={errorStyle}>{error}</div>
      ) : (
        <div className="glass-panel" style={panelStyle}>
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Joined</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Admin Privileges</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={trStyle}>
                    <td style={tdStyle}>
                      <div style={emailWrapperStyle}>
                        <div style={avatarStyle}>{u.email[0].toUpperCase()}</div>
                        <span style={emailTextStyle}>{u.email}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      {u.is_active ? (
                        <span style={badgeActiveStyle}>Active</span>
                      ) : (
                        <span style={badgeInactiveStyle}>Inactive</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={toggleWrapperStyle}>
                        <label style={switchStyle}>
                          <input 
                            type="checkbox" 
                            checked={u.is_admin} 
                            disabled={u.id === user?.id}
                            onChange={() => toggleAdmin(u.id, u.is_admin)}
                            style={{ display: "none" }}
                          />
                          <span style={u.is_admin ? sliderActiveStyle : sliderStyle}>
                            <span style={u.is_admin ? sliderCircleActiveStyle : sliderCircleStyle}></span>
                          </span>
                        </label>
                        <span style={u.is_admin ? adminTextStyle : normalTextStyle}>
                          {u.is_admin ? "Admin" : "User"}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => {
                          setResetTargetUserId(u.id);
                          setResetTargetUserEmail(u.email);
                          setNewPassword("");
                          setIsResetModalOpen(true);
                        }}
                        style={{
                          padding: "0.4rem 0.8rem",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "6px",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--accent-purple)";
                          e.currentTarget.style.color = "#fff";
                          e.currentTarget.style.background = "rgba(102, 126, 234, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.currentTarget.style.color = "var(--text-secondary)";
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      >
                        🔑 Reset PW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(9, 13, 22, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "2rem",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-light)",
              boxShadow: "var(--shadow-glow)",
              borderRadius: "12px",
              position: "relative",
            }}
          >
            <h3
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                fontFamily: "Space Grotesk, sans-serif",
                color: "#fff",
              }}
            >
              🔑 Force Reset Password
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              กำลังเปลี่ยนรหัสผ่านสำหรับ: <br />
              <strong style={{ color: "var(--accent-cyan)" }}>{resetTargetUserEmail}</strong>
            </p>

            <form onSubmit={handleResetPasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>รหัสผ่านใหม่ (New Password)</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="ขั้นต่ำ 6 ตัวอักษร"
                    required
                    style={{
                      flex: 1,
                      padding: "0.6rem 0.8rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.95rem",
                    }}
                  />
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{
                      padding: "0.6rem 0.8rem",
                      background: "rgba(102, 126, 234, 0.1)",
                      border: "1px solid var(--border-light)",
                      borderRadius: "6px",
                      color: "var(--accent-purple)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                    }}
                  >
                    🎲 สุ่มรหัส
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(false);
                    setNewPassword("");
                  }}
                  disabled={isResetting}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || newPassword.length < 6}
                  className="btn btn-primary"
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    background: "var(--gradient-cyan-purple)",
                    border: "none",
                    color: "#fff",
                    cursor: newPassword.length >= 6 ? "pointer" : "not-allowed",
                    opacity: newPassword.length >= 6 ? 1 : 0.5,
                  }}
                >
                  {isResetting ? "Updating..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "1rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: 800,
  fontFamily: "Space Grotesk, sans-serif",
  background: "linear-gradient(135deg, #fff, var(--text-secondary))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  color: "var(--text-secondary)",
};

const panelStyle: React.CSSProperties = {
  padding: "1.5rem",
  background: "var(--bg-panel)",
  border: "1px solid var(--border-light)",
  boxShadow: "var(--shadow-glow)",
};

const tableContainerStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
};

const thStyle: React.CSSProperties = {
  padding: "1rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  color: "var(--text-secondary)",
  fontWeight: 600,
  fontSize: "0.9rem",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  transition: "background 0.2s",
};

const tdStyle: React.CSSProperties = {
  padding: "1rem",
  color: "var(--text-primary)",
  verticalAlign: "middle",
};

const emailWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const avatarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  background: "var(--accent-gradient)",
  color: "#050409",
  fontWeight: "700",
  fontSize: "0.9rem",
  borderRadius: "50%",
};

const emailTextStyle: React.CSSProperties = {
  fontWeight: 600,
};

const badgeActiveStyle: React.CSSProperties = {
  background: "rgba(6, 182, 212, 0.15)",
  color: "var(--accent-cyan)",
  border: "1px solid var(--accent-cyan)",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 700,
  textTransform: "uppercase",
};

const badgeInactiveStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  color: "var(--text-muted)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 700,
  textTransform: "uppercase",
};

// Toggle Switch Styles
const toggleWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const switchStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
  width: "48px",
  height: "24px",
  cursor: "pointer",
};

const sliderStyle: React.CSSProperties = {
  position: "absolute",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(255, 255, 255, 0.1)",
  borderRadius: "24px",
  transition: "0.4s",
  border: "1px solid rgba(255, 255, 255, 0.2)",
};

const sliderActiveStyle: React.CSSProperties = {
  ...sliderStyle,
  background: "var(--accent-gradient)",
  border: "none",
  boxShadow: "0 0 10px rgba(217, 70, 239, 0.5)",
};

const sliderCircleStyle: React.CSSProperties = {
  position: "absolute",
  content: '""',
  height: "18px",
  width: "18px",
  left: "3px",
  bottom: "2px",
  background: "#fff",
  borderRadius: "50%",
  transition: "0.4s",
};

const sliderCircleActiveStyle: React.CSSProperties = {
  ...sliderCircleStyle,
  transform: "translateX(24px)",
};

const adminTextStyle: React.CSSProperties = {
  color: "var(--accent-cyan)",
  fontWeight: 700,
  fontSize: "0.9rem",
  textShadow: "0 0 8px rgba(6, 182, 212, 0.4)",
};

const normalTextStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontWeight: 500,
  fontSize: "0.9rem",
};

const loadingContainerStyle: React.CSSProperties = {
  display: "flex",
  height: "20vh",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-secondary)",
  gap: "0.75rem",
};

const spinnerStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  border: "3px solid rgba(255, 255, 255, 0.1)",
  borderTopColor: "var(--accent-cyan)",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const errorStyle: React.CSSProperties = {
  color: "hsl(0, 80%, 75%)",
  padding: "2rem",
  textAlign: "center",
};
