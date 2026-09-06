"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import DrawCountdown from "./DrawCountdown";
import { AvatarCustomizerModal } from "./AvatarCustomizerModal";
import { BirthdayCelebrationModal } from "./BirthdayCelebrationModal";

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout, user, avatar } = useAuth();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
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
        Loading SUSU Lucky...
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
    { name: "Dashboard", path: "/dashboard" },
    { name: "Analysis", path: "/analysis" },
    { name: "Lotteries", path: "/lotteries" },
  ];

  const isFamilyMember =
    user?.email === "suzu@gmail.com" ||
    user?.email === "ning80074@gmail.com";

  if (isFamilyMember) {
    navItems.push({ name: "Family Finance", path: "/finance" });
  }

  if (user?.is_admin) {
    navItems.push({ name: "Users", path: "/users" });
  }

  return (
    <div className="app-wrapper" style={{ minHeight: "100vh", width: "100%", background: "var(--bg-deep)" }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          background: "rgba(10, 2, 15, 0.92)",
          backdropFilter: "blur(25px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div className="nav-header-inner">
          {/* Logo & Brand */}
          <Link
            href={isFamilyMember ? "/finance" : "/dashboard"}
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              transition: "transform 0.2s ease",
            }}
          >
            <img
              src="/app-logo.jpg"
              alt="SUSU Lucky Logo"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                objectFit: "cover",
                border: "2px solid #ffd700",
                boxShadow: "0 0 22px rgba(245, 158, 11, 0.55)",
              }}
            />
            <div>
              <span
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  letterSpacing: "2px",
                  background: "linear-gradient(135deg, #ffffff 30%, #ffd700 80%, #f59e0b 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 10px rgba(245, 158, 11, 0.4))",
                }}
              >
                SUSU LUCKY
              </span>
            </div>
          </Link>

          {/* Navigation Links (Clean & Sleek with Dividers) */}
          <nav className="nav-links-box">
            {navItems.map((item, idx) => {
              const isActive = pathname === item.path;
              return (
                <React.Fragment key={item.path}>
                  {idx > 0 && (
                    <div
                      style={{
                        width: "1px",
                        height: "16px",
                        background: "rgba(255, 215, 0, 0.15)",
                        margin: "0 2px",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Link
                    href={item.path}
                    className="nav-link-item"
                    style={{
                      fontWeight: isActive ? 900 : 600,
                      color: isActive ? "#ffffff" : "var(--text-secondary)",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(245, 158, 11, 0.3))"
                        : "transparent",
                      border: isActive
                        ? "1.5px solid #ffd700"
                        : "1.5px solid transparent",
                      boxShadow: isActive
                        ? "0 0 22px rgba(255, 215, 0, 0.5), inset 0 0 10px rgba(255, 215, 0, 0.25)"
                        : "none",
                    }}
                  >
                    <span>{item.name}</span>
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Right Actions: Notification + User + Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
            <NotificationBell />

            {user && (
              <div
                onClick={() => setIsAvatarModalOpen(true)}
                title="Click to customize profile avatar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "24px",
                  background: user.email === "suzu@gmail.com" 
                    ? "rgba(255, 215, 0, 0.12)" 
                    : "rgba(14, 165, 233, 0.12)",
                  border: user.email === "suzu@gmail.com"
                    ? "1px solid rgba(255, 215, 0, 0.4)"
                    : "1px solid rgba(14, 165, 233, 0.4)",
                  boxShadow: user.email === "suzu@gmail.com"
                    ? "0 0 15px rgba(255, 215, 0, 0.25)"
                    : "0 0 15px rgba(14, 165, 233, 0.25)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ position: "relative", width: "28px", height: "28px" }}>
                  <img
                    src={avatar || "/user-avatar.jpg"}
                    alt="Profile"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: user.email === "suzu@gmail.com" ? "1.5px solid #ffd700" : "1.5px solid var(--accent-cyan)",
                      boxShadow: user.email === "suzu@gmail.com" ? "0 0 10px rgba(255, 215, 0, 0.5)" : "0 0 10px rgba(14, 165, 233, 0.5)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-2px",
                      right: "-2px",
                      width: "9px",
                      height: "9px",
                      borderRadius: "50%",
                      background: "#10b981",
                      border: "1.5px solid #0f0f18",
                    }}
                  />
                </div>
                <span style={{ fontSize: "0.88rem", color: "#fff", fontWeight: 700 }}>
                  {user.first_name || user.email?.split("@")[0]}
                </span>
                {user.email === "suzu@gmail.com" ? (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      color: "#ffd700",
                      background: "linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(245, 158, 11, 0.3))",
                      border: "1px solid #ffd700",
                      padding: "2px 7px",
                      borderRadius: "12px",
                      letterSpacing: "0.5px",
                      boxShadow: "0 0 8px rgba(255, 215, 0, 0.4)",
                    }}
                  >
                    👑 SUPER ADMIN
                  </span>
                ) : user.is_admin ? (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      color: "var(--accent-cyan)",
                      background: "rgba(14, 165, 233, 0.2)",
                      border: "1px solid var(--accent-cyan)",
                      padding: "2px 7px",
                      borderRadius: "12px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    🛡️ OPERATOR ADMIN
                  </span>
                ) : null}
              </div>
            )}


            <button
              onClick={logout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.55rem 1.1rem",
                borderRadius: "10px",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#f87171",
                fontSize: "0.88rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 12px rgba(239, 68, 68, 0.2)",
                transition: "all 0.2s ease",
              }}
            >
              <span>🚪 Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Perfect Center) */}
      <main className="app-main-area">
        <DrawCountdown />
        {children}
      </main>

      {/* Profile Avatar Customizer Modal */}
      <AvatarCustomizerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />

      {/* Full-Screen Birthday Celebration Modal for Ning */}
      <BirthdayCelebrationModal />
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
