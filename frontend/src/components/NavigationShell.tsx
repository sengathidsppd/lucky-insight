"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const pathname = usePathname();

  // Hide nav on login, register, and index landing pages
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/";

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-deep)",
        color: "var(--text-primary)",
        fontSize: "1.2rem",
        fontWeight: 500,
        gap: "0.75rem"
      }}>
        <div style={{
          width: "24px",
          height: "24px",
          border: "3px solid rgba(255,255,255,0.1)",
          borderTopColor: "var(--accent-cyan)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        Loading Lucky Insight...
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If not authenticated or on auth pages, don't show the dashboard sidebar layout
  if (!isAuthenticated || isAuthPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Number Records", path: "/records", icon: "🔢" },
    { name: "Lottery History", path: "/lotteries", icon: "🏆" },
    { name: "Stat Analysis", path: "/analysis", icon: "🔮" },
    { name: "Lucky Spin", path: "/lucky-spin", icon: "🎰" },
  ];

  return (
    <div className="app-container">
      {/* Sidebar Nav */}
      <aside className="app-sidebar">
        <div className="logo-container" style={logoContainerStyle}>
          <span style={logoEmojiStyle}>🍀</span>
          <h2 style={logoTextStyle}>Lucky Insight</h2>
        </div>

        {user && (
          <div className="user-profile" style={userProfileStyle}>
            <div style={avatarStyle}>
              {user.email[0].toUpperCase()}
            </div>
            <div style={userInfoStyle}>
              <div style={userNameStyle}>{user.first_name || "User"}</div>
              <div style={userEmailStyle}>{user.email}</div>
              {user.is_admin && <span style={adminBadgeStyle}>ADMIN</span>}
            </div>
          </div>
        )}

        <nav className="app-nav" style={navStyle}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} style={isActive ? activeLinkStyle : linkStyle}>
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <button onClick={logout} className="logout-btn" style={logoutButtonStyle}>
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

// Styling Objects

const sidebarStyle: React.CSSProperties = {
  background: "var(--bg-dark)",
  borderRight: "1px solid var(--border-light)",
  display: "flex",
  flexDirection: "column",
  padding: "2rem 1.5rem",
  width: "280px",
  minHeight: "100vh",
};

const logoContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  marginBottom: "2.5rem",
  paddingLeft: "0.5rem",
};

const logoEmojiStyle: React.CSSProperties = {
  fontSize: "1.8rem",
  textShadow: "0 0 12px hsla(184, 100%, 48%, 0.5)",
};

const logoTextStyle: React.CSSProperties = {
  fontSize: "1.4rem",
  fontWeight: 800,
  letterSpacing: "-0.5px",
  background: "linear-gradient(135deg, #fff, var(--text-secondary))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const userProfileStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-md)",
  padding: "0.75rem",
  marginBottom: "2rem",
};

const avatarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  background: "var(--accent-gradient)",
  color: "#050409",
  fontWeight: "700",
  fontSize: "1.1rem",
  borderRadius: "50%",
  boxShadow: "var(--shadow-glow)",
};

const userInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const userNameStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: "600",
  color: "var(--text-primary)",
};

const userEmailStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "var(--text-muted)",
  textOverflow: "ellipsis",
  overflow: "hidden",
  whiteSpace: "nowrap",
};

const adminBadgeStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  background: "rgba(184, 100%, 48%, 0.15)",
  border: "1px solid var(--accent-cyan)",
  color: "var(--accent-cyan)",
  fontSize: "0.65rem",
  fontWeight: 700,
  padding: "1px 6px",
  borderRadius: "4px",
  marginTop: "4px",
};

const navStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  flex: 1,
};

const linkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  color: "var(--text-secondary)",
  fontSize: "0.95rem",
  fontWeight: 500,
  padding: "0.85rem 1rem",
  borderRadius: "var(--radius-md)",
  textDecoration: "none",
  transition: "var(--transition-smooth)",
};

const activeLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: "var(--text-primary)",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid var(--border-light)",
  boxShadow: "inset 0 0 12px rgba(255,255,255,0.02)",
};

const logoutButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  background: "transparent",
  border: "none",
  color: "hsl(0, 80%, 65%)",
  cursor: "pointer",
  fontSize: "0.95rem",
  fontWeight: 600,
  padding: "0.85rem 1rem",
  borderRadius: "var(--radius-md)",
  textAlign: "left",
  transition: "var(--transition-smooth)",
};
