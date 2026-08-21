"use client";

import React, { useState, useEffect } from "react";

export function getNextLaoDrawDate(now: Date = new Date()): Date {
  const current = new Date(now);
  const day = current.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  
  const target = new Date(current);
  target.setHours(20, 30, 0, 0);

  // Monday to Friday before 20:30 -> target is today 20:30
  if (day >= 1 && day <= 5 && current.getTime() < target.getTime()) {
    return target;
  }

  // Find next draw day (next weekday Mon-Fri)
  let daysToAdd = 1;
  let nextDay = (day + daysToAdd) % 7;
  while (nextDay < 1 || nextDay > 5) {
    daysToAdd++;
    nextDay = (day + daysToAdd) % 7;
  }

  target.setDate(target.getDate() + daysToAdd);
  return target;
}

export function getNextThaiDrawDate(now: Date = new Date()): Date {
  const current = new Date(now);
  const year = current.getFullYear();
  const month = current.getMonth();
  const date = current.getDate();

  // Draw 1: 1st of month at 15:30
  const draw1 = new Date(year, month, 1, 15, 30, 0, 0);
  // Draw 2: 16th of month at 15:30
  const draw2 = new Date(year, month, 16, 15, 30, 0, 0);

  if (current.getTime() < draw1.getTime()) return draw1;
  if (current.getTime() < draw2.getTime()) return draw2;

  // Next month 1st
  return new Date(year, month + 1, 1, 15, 30, 0, 0);
}

export default function DrawCountdown() {
  const [selectedGame, setSelectedGame] = useState<"LAO" | "THAI">("LAO");
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isLive: boolean }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const target = selectedGame === "LAO" ? getNextLaoDrawDate(now) : getNextThaiDrawDate(now);
      const diff = target.getTime() - now.getTime();

      // If diff is between 0 and -30 minutes (draw in progress)
      if (diff <= 0 && diff > -30 * 60 * 1000) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true });
        return;
      }

      if (diff <= 0) {
        // Recalculate
        const newTarget = selectedGame === "LAO" ? getNextLaoDrawDate(new Date()) : getNextThaiDrawDate(new Date());
        const newDiff = Math.max(0, newTarget.getTime() - now.getTime());
        const seconds = Math.floor((newDiff / 1000) % 60);
        const minutes = Math.floor((newDiff / 1000 / 60) % 60);
        const hours = Math.floor((newDiff / (1000 * 60 * 60)) % 24);
        const days = Math.floor(newDiff / (1000 * 60 * 60 * 24));
        setTimeLeft({ days, hours, minutes, seconds, isLive: false });
        return;
      }

      const seconds = Math.floor((diff / 1000) % 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      setTimeLeft({ days, hours, minutes, seconds, isLive: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedGame]);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)",
        border: "1px solid rgba(255, 215, 0, 0.25)",
        borderRadius: "14px",
        padding: "0.75rem 1.25rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: timeLeft.isLive ? "#ef4444" : "#ffd700",
            boxShadow: timeLeft.isLive ? "0 0 10px #ef4444" : "0 0 12px rgba(255, 215, 0, 0.8)",
            animation: "pulse 1.5s infinite",
          }}
        />
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            ⏱️ Next Draw Countdown
            <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
              ({selectedGame === "LAO" ? "Mon - Fri at 8:30 PM" : "1st & 16th at 3:30 PM"})
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Game selector pills */}
        <div style={{ display: "flex", background: "rgba(255,215,0,0.05)", padding: "3px", borderRadius: "8px", border: "1px solid rgba(255,215,0,0.15)" }}>
          <button
            type="button"
            onClick={() => setSelectedGame("LAO")}
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: "6px",
              border: "none",
              background: selectedGame === "LAO" ? "linear-gradient(135deg, #ffd700, #f59e0b)" : "transparent",
              color: selectedGame === "LAO" ? "#000" : "var(--text-secondary)",
              fontWeight: selectedGame === "LAO" ? 800 : 500,
              fontSize: "0.75rem",
              cursor: "pointer",
              boxShadow: selectedGame === "LAO" ? "0 0 10px rgba(255, 215, 0, 0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            🇱🇦 Lao
          </button>
          <button
            type="button"
            onClick={() => setSelectedGame("THAI")}
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: "6px",
              border: "none",
              background: selectedGame === "THAI" ? "linear-gradient(135deg, #ffd700, #f59e0b)" : "transparent",
              color: selectedGame === "THAI" ? "#000" : "var(--text-secondary)",
              fontWeight: selectedGame === "THAI" ? 800 : 500,
              fontSize: "0.75rem",
              cursor: "pointer",
              boxShadow: selectedGame === "THAI" ? "0 0 10px rgba(255, 215, 0, 0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            🇹🇭 Thai
          </button>
        </div>

        {/* Timer Display */}
        {timeLeft.isLive ? (
          <div style={{ padding: "0.3rem 0.8rem", background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.5)", borderRadius: "6px", color: "#f87171", fontWeight: 800, fontSize: "0.85rem", animation: "pulse 1s infinite" }}>
            🔥 DRAW IN PROGRESS!
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "monospace" }}>
            {timeLeft.days > 0 && (
              <>
                <div style={timeBoxStyle}>
                  <span style={timeNumStyle}>{String(timeLeft.days).padStart(2, "0")}</span>
                  <span style={timeLabelStyle}>d</span>
                </div>
                <span style={colonStyle}>:</span>
              </>
            )}
            <div style={timeBoxStyle}>
              <span style={timeNumStyle}>{String(timeLeft.hours).padStart(2, "0")}</span>
              <span style={timeLabelStyle}>h</span>
            </div>
            <span style={colonStyle}>:</span>
            <div style={timeBoxStyle}>
              <span style={timeNumStyle}>{String(timeLeft.minutes).padStart(2, "0")}</span>
              <span style={timeLabelStyle}>m</span>
            </div>
            <span style={colonStyle}>:</span>
            <div style={timeBoxStyle}>
              <span style={{ ...timeNumStyle, color: "var(--accent-cyan)" }}>{String(timeLeft.seconds).padStart(2, "0")}</span>
              <span style={timeLabelStyle}>s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const timeBoxStyle: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "6px",
  padding: "0.25rem 0.5rem",
  display: "flex",
  alignItems: "baseline",
  gap: "2px",
};

const timeNumStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 800,
  color: "#fff",
};

const timeLabelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  color: "var(--text-secondary)",
  fontWeight: 600,
};

const colonStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "rgba(255, 255, 255, 0.3)",
};
