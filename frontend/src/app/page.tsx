"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCookie } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (getCookie("token")) {
      router.push("/dashboard");
    }
  }, []);

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={logoStyle}>
          <span style={logoEmojiStyle}>🍀</span>
          <span style={logoTextStyle}>Insight Analytics</span>
        </div>
        <div>
          <Link href="/login" className="btn btn-secondary" style={{ padding: "0.6rem 1.2rem", fontSize: "0.9rem" }}>
            Sign In
          </Link>
        </div>
      </header>

      <main style={mainStyle}>
        <section style={heroSectionStyle}>
          <h1 style={heroTitleStyle}>
            Unlock Deeper Insights From Your <span style={highlightStyle}>Lucky Numbers</span>
          </h1>

          <div style={ctaRowStyle}>
            <Link href="/register" className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.05rem" }}>
              Get Started Free 
            </Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: "1rem 2rem", fontSize: "1.05rem" }}>
              Access Dashboard
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section style={featuresSectionStyle}>
          <div className="glass-panel" style={featureCardStyle}>
            <div style={featureIconStyle}>🔢</div>
            <h3 style={featureTitleStyle}>Number Ledger</h3>
            <p style={featureDescStyle}>
              Record, search, and categorize numbers with tags, notes, and custom sources.
            </p>
          </div>

          <div className="glass-panel" style={featureCardStyle}>
            <div style={featureIconStyle}>🏆</div>
            <h3 style={featureTitleStyle}>Lottery Results</h3>
            <p style={featureDescStyle}>
              Keep track of historical winning numbers and prizes for Thai and Lao state lotteries.
            </p>
          </div>

          <div className="glass-panel" style={featureCardStyle}>
            <div style={featureIconStyle}></div>
            <h3 style={featureTitleStyle}>Statistical Models</h3>
            <p style={featureDescStyle}>
              Calculate digit frequency, hot pairs, high/low, and odd/even distribution ratios.
            </p>
          </div>
        </section>
      </main>

      <footer style={footerStyle}>
        <p>&copy; {new Date().getFullYear()} Insight Analytics. All rights reserved.</p>
      </footer>
    </div>
  );
}

// Styling Objects

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  padding: "0 2rem",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "2rem 0",
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
};

const logoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const logoEmojiStyle: React.CSSProperties = {
  fontSize: "1.8rem",
};

const logoTextStyle: React.CSSProperties = {
  fontSize: "1.3rem",
  fontWeight: 800,
  color: "var(--text-primary)",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
  gap: "5rem",
  padding: "4rem 0",
};

const heroSectionStyle: React.CSSProperties = {
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1.5rem",
  maxWidth: "800px",
};

const heroBadgeStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid var(--border-light)",
  borderRadius: "9999px",
  padding: "0.5rem 1.25rem",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--accent-cyan)",
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: "3.2rem",
  fontWeight: 800,
  lineHeight: "1.15",
  letterSpacing: "-1px",
  color: "var(--text-primary)",
};

const highlightStyle: React.CSSProperties = {
  background: "var(--accent-gradient)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const heroSubtitleStyle: React.CSSProperties = {
  fontSize: "1.15rem",
  color: "var(--text-secondary)",
  lineHeight: "1.6",
  maxWidth: "680px",
  marginTop: "0.5rem",
};

const ctaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  marginTop: "1.5rem",
};

const featuresSectionStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "2rem",
  width: "100%",
};

const featureCardStyle: React.CSSProperties = {
  padding: "2.5rem 2rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  alignItems: "flex-start",
  textAlign: "left",
};

const featureIconStyle: React.CSSProperties = {
  fontSize: "2.2rem",
  background: "rgba(255,255,255,0.03)",
  padding: "0.5rem",
  borderRadius: "var(--radius-md)",
};

const featureTitleStyle: React.CSSProperties = {
  fontSize: "1.2rem",
  fontWeight: 700,
  color: "var(--text-primary)",
};

const featureDescStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  color: "var(--text-secondary)",
  lineHeight: "1.5",
};

const footerStyle: React.CSSProperties = {
  borderTop: "1px solid var(--border-light)",
  padding: "2rem 0",
  textAlign: "center",
  color: "var(--text-muted)",
  fontSize: "0.85rem",
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
};
