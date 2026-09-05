"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export function BirthdayCelebrationModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      return;
    }

    const email = (user.email || "").toLowerCase();
    const isTargetUser = email.includes("ning80074") || email.includes("ning");

    if (!isTargetUser) {
      setIsOpen(false);
      return;
    }

    // Check if dismissed in this browser session
    const isDismissed = sessionStorage.getItem("ning_bday_dismissed_2026");
    if (isDismissed === "true") {
      setIsOpen(false);
      return;
    }

    // Date check: September 6 (or September 5-7 window)
    const now = new Date();
    const month = now.getMonth(); // 8 = September (0-indexed)
    const date = now.getDate();

    // Trigger on September 5, 6, or 7
    if (month === 8 && (date === 5 || date === 6 || date === 7)) {
      setIsOpen(true);
    }
  }, [user]);

  const handleThankYou = () => {
    setIsClosing(true);
    sessionStorage.setItem("ning_bday_dismissed_2026", "true");
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        background: "radial-gradient(circle at 50% 40%, rgba(26, 17, 43, 0.96), rgba(5, 5, 10, 0.99))",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        opacity: isClosing ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      {/* Background Floating Festive Confetti & Lights */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "15%",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            right: "15%",
            width: "350px",
            height: "350px",
            background: "radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            right: "25%",
            width: "250px",
            height: "250px",
            background: "radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Main Celebration Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "540px",
          background: "linear-gradient(165deg, rgba(30, 27, 50, 0.95), rgba(15, 13, 26, 0.98))",
          border: "2px solid rgba(255, 215, 0, 0.5)",
          borderRadius: "24px",
          padding: "2.5rem 2rem",
          textAlign: "center",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.3), inset 0 0 30px rgba(255, 215, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.2rem",
          transform: isClosing ? "scale(0.95)" : "scale(1)",
          transition: "transform 0.4s ease",
        }}
      >
        {/* Top Celebration Badge */}
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 900,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: "#ffd700",
            background: "linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(245, 158, 11, 0.25))",
            border: "1px solid rgba(255, 215, 0, 0.6)",
            padding: "0.35rem 1.2rem",
            borderRadius: "30px",
            boxShadow: "0 0 15px rgba(255, 215, 0, 0.3)",
          }}
        >
          Special Celebration
        </div>

        {/* Ning's Photo Frame */}
        <div
          style={{
            position: "relative",
            width: "180px",
            height: "180px",
            margin: "0.5rem 0",
            borderRadius: "50%",
            padding: "5px",
            background: "linear-gradient(135deg, #ffd700, #f43f5e, #a855f7, #0ea5e9)",
            boxShadow: "0 0 40px rgba(255, 215, 0, 0.5), 0 0 20px rgba(244, 63, 94, 0.4)",
          }}
        >
          <img
            src="/ning-birthday.jpg"
            alt="Ning Birthday"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
              background: "#181824",
              border: "3px solid #0f0d1a",
            }}
          />
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "2rem",
              fontWeight: 900,
              background: "linear-gradient(135deg, #fff 20%, #ffd700 60%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.5px",
            }}
          >
            Happy Birthday, Ning!
          </h1>
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "#e9d5ff",
              letterSpacing: "1.5px",
            }}
          >
            6 September 2026
          </div>
        </div>

        {/* Heartfelt Wish Message */}
        <p
          style={{
            margin: 0,
            fontSize: "0.98rem",
            lineHeight: "1.65",
            color: "rgba(255, 255, 255, 0.85)",
            maxWidth: "440px",
            fontWeight: 400,
          }}
        >
          Wishing you boundless happiness, radiant health, immense prosperity, and remarkable success on your special day. May all your dreams and aspirations shine bright this year!
        </p>

        {/* Thank You Action Button */}
        <div style={{ marginTop: "0.8rem", width: "100%", maxWidth: "320px" }}>
          <button
            type="button"
            onClick={handleThankYou}
            style={{
              width: "100%",
              padding: "0.95rem 2rem",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #ffd700, #f59e0b)",
              border: "none",
              color: "#000",
              fontSize: "1.05rem",
              fontWeight: 900,
              letterSpacing: "1px",
              cursor: "pointer",
              boxShadow: "0 0 25px rgba(255, 215, 0, 0.5), 0 5px 15px rgba(0, 0, 0, 0.4)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.boxShadow = "0 0 35px rgba(255, 215, 0, 0.7), 0 8px 20px rgba(0, 0, 0, 0.5)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 0 25px rgba(255, 215, 0, 0.5), 0 5px 15px rgba(0, 0, 0, 0.4)";
            }}
          >
            Thank You
          </button>
        </div>
      </div>
    </div>
  );
}
