"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Reset token is missing in the URL.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const resp = await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });

      setMessage(resp.message || "Your password has been reset successfully.");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired or is invalid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <span style={emojiStyle}>🍀</span>
        <h1 style={titleStyle}>Reset Password</h1>
        <p style={subtitleStyle}>Create a secure new password for your account</p>
      </div>

      {!token && (
        <div style={errorStyle}>
          ❌ Error: Invalid password reset link. No security token was found in the URL.
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={successStyle}>{message} Redirecting to login...</div>}

      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting || !token}
            minLength={8}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Confirm New Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isSubmitting || !token}
            minLength={8}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "1rem" }}
          disabled={isSubmitting || !token}
        >
          {isSubmitting ? "Resetting Password..." : "Update Password"}
        </button>
      </form>

      <div style={footerStyle}>
        Back to{" "}
        <Link href="/login" style={linkStyle}>
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={containerStyle}>
      <Suspense fallback={
        <div className="glass-panel" style={{ ...cardStyle, textAlign: "center", padding: "4rem" }}>
          <span style={{ fontSize: "2rem" }}>🍀</span>
          <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Verifying token security...</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
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
  background: "rgba(6, 11, 40, 0.6)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "16px",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
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
