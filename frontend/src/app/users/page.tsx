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
                  </tr>
                ))}
              </tbody>
            </table>
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
