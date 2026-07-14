"use client";

import React, { useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulatedResetUrl, setSimulatedResetUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSimulatedResetUrl("");
    setIsSubmitting(true);

    try {
      const resp = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      
      setMessage(resp.message || "If the email is registered, a password reset link has been sent.");
      
      // In development mode, the backend returns the reset_url for easy simulated testing
      if (resp.data?.reset_url) {
        setSimulatedResetUrl(resp.data.reset_url);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div className="glass-panel" style={cardStyle}>
        <div style={headerStyle}>
          <span style={emojiStyle}>🍀</span>
          <h1 style={titleStyle}>Forgot Password</h1>
          <p style={subtitleStyle}>Enter your email to receive a password reset link</p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {message && <div style={successStyle}>{message}</div>}

        {simulatedResetUrl && (
          <div style={simulationBoxStyle}>
            <span style={{ fontSize: "1.1rem" }}>🛠️ <strong>Dev Simulation Mode:</strong></span>
            <p style={{ margin: "0.5rem 0 0.8rem 0", fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.7)" }}>
              No real email was sent because SMTP is not configured. Click the button below to test:
            </p>
            <a href={simulatedResetUrl} style={simulationButtonStyle}>
              Confirm Password Reset Link
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending Link..." : "Send Reset Link"}
          </button>
        </form>

        <div style={footerStyle}>
          Remember your password?{" "}
          <Link href="/login" style={linkStyle}>
            Sign In
          </Link>
        </div>
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
  fontSize: "3rem",
  display: "block",
  marginBottom: "0.5rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.8rem",
  fontWeight: 800,
  margin: 0,
  background: "linear-gradient(to right, #ffffff, var(--text-secondary))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  color: "var(--text-secondary)",
  marginTop: "0.5rem",
  marginBottom: 0,
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.2rem",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "rgba(255, 255, 255, 0.8)",
  letterSpacing: "0.5px",
};

const errorStyle: React.CSSProperties = {
  background: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  color: "#f87171",
  padding: "0.8rem",
  borderRadius: "8px",
  fontSize: "0.85rem",
  marginBottom: "1.5rem",
  textAlign: "center",
};

const successStyle: React.CSSProperties = {
  background: "rgba(16, 185, 129, 0.1)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  color: "#34d399",
  padding: "0.8rem",
  borderRadius: "8px",
  fontSize: "0.85rem",
  marginBottom: "1.5rem",
  textAlign: "center",
};

const simulationBoxStyle: React.CSSProperties = {
  background: "rgba(102, 126, 234, 0.1)",
  border: "1px dashed rgba(102, 126, 234, 0.3)",
  padding: "1rem",
  borderRadius: "8px",
  marginBottom: "1.5rem",
  color: "#fff",
};

const simulationButtonStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  background: "var(--accent-purple)",
  color: "white",
  padding: "0.6rem 1rem",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "0.85rem",
  boxShadow: "0 0 15px rgba(102, 126, 234, 0.4)",
  transition: "all 0.2s",
};

const footerStyle: React.CSSProperties = {
  marginTop: "2rem",
  textAlign: "center",
  fontSize: "0.9rem",
  color: "var(--text-secondary)",
};

const linkStyle: React.CSSProperties = {
  color: "var(--accent-cyan)",
  textDecoration: "none",
  fontWeight: 600,
};
