"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email,
        password,
        confirm_password: confirmPassword,
        first_name: firstName,
        last_name: lastName,
      });

      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div className="glass-panel" style={cardStyle}>
        <div style={headerStyle}>
          <span style={emojiStyle}>✨</span>
          <h1 style={titleStyle}>Create Account</h1>
          <p style={subtitleStyle}>Join Lucky Insight to analyze numbers</p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>First Name</label>
              <input
                type="text"
                placeholder="Ada"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text"
                placeholder="Lovelace"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

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
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <div style={footerStyle}>
          Already have an account?{" "}
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
  padding: "2rem 1rem",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "480px",
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

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  flex: 1,
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
  border: "1px solid hsla(120, 80%, 65%, 0.3)",
  borderRadius: "var(--radius-md)",
  color: "hsl(120, 80%, 75%)",
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
