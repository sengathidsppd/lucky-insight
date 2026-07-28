"use client";

import React, { useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(response.message || "If the email is registered, a password reset link has been sent.");
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Failed to process request.");
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
          <p style={subtitleStyle}>Enter your email to receive a reset link</p>
        </div>

        {message && <div style={successStyle}>{message}</div>}
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

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div style={footerStyle}>
          Remembered your password?{" "}
          <Link href="/login" style={linkStyle}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

// Styling Objects (Matches login/page.tsx)
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

const successStyle: React.CSSProperties = {
  background: "rgba(80, 224, 120, 0.1)",
  border: "1px solid hsla(140, 80%, 65%, 0.3)",
  borderRadius: "var(--radius-md)",
  color: "hsl(140, 80%, 75%)",
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
