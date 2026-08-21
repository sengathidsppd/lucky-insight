"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import DrawCountdown from "./DrawCountdown";

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/";

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-deep)",
          color: "var(--text-primary)",
          fontSize: "1.2rem",
          fontWeight: 500,
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: "var(--accent-cyan)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        Loading Lucky Insight...
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated || isAuthPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Analysis", path: "/analysis", icon: "🎯" },
    { name: "Lotteries", path: "/lotteries", icon: "📜" },
  ];

  if (user?.is_admin) {
    navItems.push({ name: "Users", path: "/users", icon: "👥" });
  }

  return (
    <div className="app-wrapper" style={{ minHeight: "100vh", width: "100%", background: "var(--bg-deep)" }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          background: "rgba(10, 2, 15, 0.88)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0.75rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          {/* Logo & Brand */}
          <Link
            href="/dashboard"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, var(--accent-cyan), #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                boxShadow: "0 0 15px rgba(6, 182, 212, 0.4)",
              }}
            >
              ✨
            </div>
            <div>
              <span
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 900,
                  letterSpacing: "1.5px",
                  background: "linear-gradient(135deg, #ffffff, var(--accent-cyan))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                LUCKY INSIGHT
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(255, 255, 255, 0.03)",
              padding: "0.3rem 0.5rem",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 1.1rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? "#ffffff" : "var(--text-secondary)",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.25))"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(6, 182, 212, 0.6)"
                      : "1px solid transparent",
                    boxShadow: isActive
                      ? "0 0 12px rgba(6, 182, 212, 0.3)"
                      : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span style={{ fontSize: "0.95rem" }}>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Notification + User + Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <NotificationBell />

            {user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.35rem 0.8rem",
                  borderRadius: "20px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #d946ef, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {(user.first_name || user.email || "U")[0].toUpperCase()}
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  {user.first_name || user.email?.split("@")[0]}
                </span>
              </div>
            )}

            <button
              onClick={logout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                background: "rgba(239, 68, 68, 0.08)",
                color: "#f87171",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span>🚪 Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Perfect Center) */}
      <main
        className="main-area"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "2rem",
          width: "100%",
        }}
      >
        <DrawCountdown />
        {children}
      </main>
    </div>
  );
}

function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    apiRequest("/notifications")
      .then((resp) => {
        setUnread(resp.unread_count || 0);
        setNotifs(resp.data || []);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
          position: "relative",
        }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              background: "var(--accent-cyan)",
              color: "#000",
              fontSize: "0.65rem",
              fontWeight: 800,
              padding: "2px 6px",
              borderRadius: "10px",
            }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            width: "320px",
            background: "rgba(10, 2, 15, 0.95)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px",
            backdropFilter: "blur(12px)",
            padding: "1rem",
            zIndex: 1000,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff", marginBottom: "0.75rem" }}>
            Notifications ({unread} unread)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "250px", overflowY: "auto" }}>
            {notifs.map((n) => (
              <div
                key={n.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  padding: "0.6rem",
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-cyan)" }}>{n.title}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
