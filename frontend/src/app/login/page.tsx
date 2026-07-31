"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl, setApiBaseUrl } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState("");

  useEffect(() => {
    setCurrentApiUrl(getApiBaseUrl());
  }, []);

  const handleSaveApiUrl = () => {
    setApiBaseUrl(currentApiUrl);
    setError("");
    alert(`API Base URL updated to: ${currentApiUrl}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
      if (err.message && err.message.includes("Cannot connect")) {
        setShowApiConfig(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div className="glass-panel" style={cardStyle}>
        <div style={headerStyle}>
          <span style={emojiStyle}>🍀</span>
          <h1 style={titleStyle}>Lucky Insight</h1>
          <p style={subtitleStyle}>Sign in to access your dashboard</p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={fieldStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={labelStyle}>Password</label>
              <Link href="/forgot-password" style={{ ...linkStyle, fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setShowApiConfig(!showApiConfig)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "0.75rem",
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            {showApiConfig ? "Hide API Settings" : "⚙️ Backend API Settings"}
          </button>
        </div>

        {showApiConfig && (
          <div style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Backend API URL:
            </label>
            <input
              type="text"
              value={currentApiUrl}
              onChange={(e) => setCurrentApiUrl(e.target.value)}
              placeholder="https://your-api-domain.com/api/v1"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
            />
            <button
              type="button"
              onClick={handleSaveApiUrl}
              className="btn"
              style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.6rem",
                alignSelf: "flex-end",
                background: "var(--accent-cyan)",
                color: "#000",
                fontWeight: 600,
                border: "none"
              }}
            >
              Save API URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// Styling Objects

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "1rem",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  padding: "2.5rem",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "2rem",
};

const emojiStyle: React.CSSProperties = {
  fontSize: "2.5rem",
  textShadow: "0 0 16px hsla(184, 100%, 48%, 0.5)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.8rem",
  fontWeight: 800,
  marginTop: "0.5rem",
  background: "linear-gradient(135deg, #fff, var(--text-secondary))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  color: "var(--text-secondary)",
  marginTop: "0.25rem",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 500,
  color: "var(--text-secondary)",
};

const errorStyle: React.CSSProperties = {
  background: "rgba(224, 80, 80, 0.1)",
  border: "1px solid hsla(0, 80%, 65%, 0.3)",
  borderRadius: "var(--radius-md)",
  color: "hsl(0, 80%, 75%)",
  fontSize: "0.85rem",
  padding: "0.75rem",
  marginBottom: "1rem",
  textAlign: "center",
};

const footerStyle: React.CSSProperties = {
  marginTop: "2rem",
  textAlign: "center",
  fontSize: "0.9rem",
  color: "var(--text-secondary)",
};

const linkStyle: React.CSSProperties = {
  color: "var(--accent-cyan)",
  fontWeight: 600,
  textDecoration: "none",
};
