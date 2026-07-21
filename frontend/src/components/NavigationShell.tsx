"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const pathname = usePathname();

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

  if (!isAuthenticated || isAuthPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", path: "/dashboard", image: "/images/nav_dashboard.jpg" },
    { name: "Records", path: "/records", image: "/images/nav_records.jpg" },
    { name: "Lotteries", path: "/lotteries", image: "/images/nav_lotteries.jpg" },
    { name: "Analysis", path: "/analysis", image: "/images/nav_analysis.jpg" },
    { name: "Lucky Spin", path: "/lucky-spin", image: "/images/nav_spin.jpg" },
  ];

  if (user?.is_admin) {
    navItems.push({ name: "Users", path: "/users", image: "/images/nav_users.jpg" });
  }

  return (
    <div className="app-wrapper" style={appWrapperStyle}>
      <main className="main-area" style={mainAreaStyle}>
        {children}
      </main>
      
      <nav className="floating-nav" style={floatingNavStyle}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} style={getLinkStyle(isActive)}>
              {/* Background Image with Filter (isolated from text) */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url('${item.image}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: isActive ? "none" : "grayscale(90%) brightness(45%)",
                  transition: "all 0.3s",
                  zIndex: 1,
                }}
              />
              {/* Text overlay */}
              <div style={getOverlayStyle(isActive)}>
                <span style={textStyle}>{item.name}</span>
              </div>
            </Link>
          );
        })}
        
        <button onClick={logout} style={logoutBtnStyle}>
           <div style={logoutOverlayStyle}>
              <span>🚪 Sign Out</span>
           </div>
        </button>
      </nav>

      {/* Global CSS for this specific layout */}
      <style>{`
        @media (max-width: 1024px) {
          .floating-nav {
            flex-direction: row !important;
            top: auto !important;
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            justify-content: flex-start !important;
            padding: 0.75rem 1rem !important;
            background: rgba(10, 2, 15, 0.95) !important;
            backdrop-filter: blur(10px) !important;
            border-left: none !important;
            border-top: 1px solid var(--border-light) !important;
            overflow-x: auto !important;
            z-index: 1000 !important;
            /* Hide scrollbar for cleaner look */
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .floating-nav::-webkit-scrollbar {
            display: none; /* Chrome, Safari and Opera */
          }
          
          .floating-nav > a, .floating-nav > button {
             width: 90px !important;
             height: 60px !important;
             flex-shrink: 0 !important;
             margin-top: 0 !important;
          }
          .floating-nav > a span, .floating-nav > button span {
             font-size: 0.6rem !important;
             padding: 0 4px !important;
          }
          .main-area {
            padding: 1.5rem !important;
            padding-bottom: 7rem !important; /* Space for the bottom nav */
          }
        }
        
        /* Apply hover effect only on desktop */
        @media (min-width: 1025px) {
           .floating-nav > a:hover {
              transform: scale(1.05) translateX(-10px) !important;
              border-color: var(--accent-cyan) !important;
              box-shadow: 0 0 15px rgba(6, 182, 212, 0.4) !important;
           }
        }
      `}</style>
    </div>
  );
}

// Styling Objects

const appWrapperStyle: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  width: "100%",
  position: "relative",
};

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  padding: "2.5rem",
  paddingRight: "180px", /* Leave space for the right sidebar on desktop */
  maxWidth: "1400px",
  margin: "0 auto",
  width: "100%",
};

const floatingNavStyle: React.CSSProperties = {
  position: "fixed",
  right: "2rem",
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  zIndex: 100,
};

const getLinkStyle = (isActive: boolean): React.CSSProperties => ({
  position: "relative",
  width: "140px",
  height: "80px",
  borderRadius: "16px",
  overflow: "hidden",
  textDecoration: "none",
  boxShadow: isActive ? "0 0 20px rgba(14, 165, 233, 0.5)" : "0 8px 16px rgba(0,0,0,0.4)",
  border: isActive ? "2px solid var(--accent-cyan)" : "2px solid rgba(255, 255, 255, 0.05)",
  transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
  transform: isActive ? "scale(1.05) translateX(-10px)" : "scale(1) translateX(0)",
  display: "block",
});

const getOverlayStyle = (isActive: boolean): React.CSSProperties => ({
  position: "absolute",
  inset: 0,
  background: isActive 
    ? "linear-gradient(to top, rgba(14, 165, 233, 0.35) 0%, rgba(11, 12, 16, 0.2) 100%)" 
    : "linear-gradient(to top, rgba(11, 12, 16, 0.85) 0%, rgba(11, 12, 16, 0.6) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.5rem",
  transition: "all 0.3s",
  zIndex: 2,
});

const textStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: "0.85rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "1.5px",
  textShadow: "0 2px 4px rgba(0,0,0,0.9)",
  textAlign: "center",
};

const logoutBtnStyle: React.CSSProperties = {
  position: "relative",
  width: "140px",
  height: "40px",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  background: "rgba(239, 68, 68, 0.05)",
  cursor: "pointer",
  marginTop: "1rem",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  transition: "all 0.3s",
};

const logoutOverlayStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#f87171",
  fontSize: "0.75rem",
  fontWeight: 700,
};
