"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

// 8 Curated Luxury SVG Presets (Data URIs for instant rendering)
export const PRESET_AVATARS = [
  {
    id: "default",
    name: "Classic VIP",
    src: "/user-avatar.jpg",
  },
  {
    id: "gold_crown",
    name: "Golden Crown",
    src: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#09090b"/>
          </radialGradient>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="50%" stop-color="#eab308"/>
            <stop offset="100%" stop-color="#ca8a04"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg)" stroke="#eab308" stroke-width="2"/>
        <path d="M25 65 L75 65 L70 40 L58 52 L50 30 L42 52 L30 40 Z" fill="url(#gold)" stroke="#fef08a" stroke-width="1.5"/>
        <circle cx="25" cy="65" r="3" fill="#fef08a"/>
        <circle cx="75" cy="65" r="3" fill="#fef08a"/>
        <circle cx="50" cy="30" r="3" fill="#fef08a"/>
        <circle cx="30" cy="40" r="2.5" fill="#fef08a"/>
        <circle cx="70" cy="40" r="2.5" fill="#fef08a"/>
        <rect x="28" y="68" width="44" height="4" rx="2" fill="url(#gold)"/>
      </svg>
    `),
  },
  {
    id: "cyber_diamond",
    name: "Cyber Diamond",
    src: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#020617"/>
          </radialGradient>
          <linearGradient id="cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#0ea5e9"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg)" stroke="#0ea5e9" stroke-width="2"/>
        <polygon points="50,22 76,42 50,78 24,42" fill="url(#cyan)" fill-opacity="0.25" stroke="#38bdf8" stroke-width="2"/>
        <polygon points="50,22 62,42 50,78 38,42" fill="url(#cyan)" fill-opacity="0.4" stroke="#7dd3fc" stroke-width="1"/>
        <line x1="24" y1="42" x2="76" y2="42" stroke="#bae6fd" stroke-width="1.5"/>
        <circle cx="50" cy="42" r="3" fill="#ffffff"/>
      </svg>
    `),
  },
  {
    id: "neon_phoenix",
    name: "Neon Phoenix",
    src: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#31102b"/>
            <stop offset="100%" stop-color="#09050d"/>
          </radialGradient>
          <linearGradient id="fire" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f43f5e"/>
            <stop offset="50%" stop-color="#fb923c"/>
            <stop offset="100%" stop-color="#fde047"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg)" stroke="#f43f5e" stroke-width="2"/>
        <path d="M50 25 C45 38 30 45 20 40 C30 55 42 60 50 78 C58 60 70 55 80 40 C70 45 55 38 50 25 Z" fill="url(#fire)" stroke="#fde047" stroke-width="1.5"/>
        <circle cx="50" cy="48" r="4" fill="#ffffff"/>
      </svg>
    `),
  },
  {
    id: "royal_star",
    name: "Royal Star",
    src: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#172554"/>
            <stop offset="100%" stop-color="#030712"/>
          </radialGradient>
          <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="50%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg)" stroke="#f59e0b" stroke-width="2"/>
        <path d="M50 20 L58 38 L78 40 L62 54 L68 74 L50 62 L32 74 L38 54 L22 40 L42 38 Z" fill="url(#starGold)" stroke="#fef08a" stroke-width="1.5"/>
        <circle cx="50" cy="50" r="6" fill="#ffffff" fill-opacity="0.8"/>
      </svg>
    `),
  },
  {
    id: "lucky_clover",
    name: "Lucky Clover",
    src: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#022c22"/>
          </radialGradient>
          <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6ee7b7"/>
            <stop offset="50%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg)" stroke="#10b981" stroke-width="2"/>
        <circle cx="40" cy="40" r="13" fill="url(#emerald)" stroke="#a7f3d0" stroke-width="1"/>
        <circle cx="60" cy="40" r="13" fill="url(#emerald)" stroke="#a7f3d0" stroke-width="1"/>
        <circle cx="40" cy="60" r="13" fill="url(#emerald)" stroke="#a7f3d0" stroke-width="1"/>
        <circle cx="60" cy="60" r="13" fill="url(#emerald)" stroke="#a7f3d0" stroke-width="1"/>
        <circle cx="50" cy="50" r="5" fill="#fef08a"/>
      </svg>
    `),
  },
  {
    id: "cyber_shield",
    name: "Cyber Shield",
    src: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </radialGradient>
          <linearGradient id="purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#c084fc"/>
            <stop offset="50%" stop-color="#9333ea"/>
            <stop offset="100%" stop-color="#6b21a8"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg)" stroke="#a855f7" stroke-width="2"/>
        <path d="M50 24 L74 34 V54 C74 68 50 78 50 78 C50 78 26 68 26 54 V34 Z" fill="url(#purple)" stroke="#e9d5ff" stroke-width="1.5"/>
        <polyline points="40,52 47,59 62,44" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `),
  },
  {
    id: "fortune_coin",
    name: "Fortune Coin",
    src: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#451a03"/>
            <stop offset="100%" stop-color="#1c1917"/>
          </radialGradient>
          <linearGradient id="coin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="50%" stop-color="#eab308"/>
            <stop offset="100%" stop-color="#a16207"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg)" stroke="#eab308" stroke-width="2"/>
        <circle cx="50" cy="50" r="28" fill="url(#coin)" stroke="#fef08a" stroke-width="2"/>
        <rect x="42" y="42" width="16" height="16" rx="2" fill="#1c1917" stroke="#fef08a" stroke-width="1.5"/>
      </svg>
    `),
  },
];

interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AvatarCustomizerModal({ isOpen, onClose }: AvatarCustomizerModalProps) {
  const { user, avatar, updateAvatar } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<string>(avatar || "/user-avatar.jpg");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Image size exceeds 3MB limit. Please select a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSelectedAvatar(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setIsSaving(true);
    updateAvatar(selectedAvatar);
    setSuccessMsg("Profile avatar updated successfully!");
    setTimeout(() => {
      setIsSaving(false);
      setSuccessMsg("");
      onClose();
    }, 600);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #181824, #0f0f18)",
          border: "1px solid rgba(255, 215, 0, 0.3)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          padding: "2rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.15)",
          color: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#ffd700", letterSpacing: "0.5px" }}>
              Customize Profile Avatar
            </h3>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Personalize your account presence with VIP presets or your own photo
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0.4rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Live Preview */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.8rem",
            padding: "1.2rem",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              padding: "3px",
              background: "linear-gradient(135deg, #ffd700, #f59e0b, #0ea5e9)",
              boxShadow: "0 0 25px rgba(255, 215, 0, 0.35)",
            }}
          >
            <img
              src={selectedAvatar}
              alt="Avatar Preview"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
                background: "#181824",
              }}
            />
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
            {user?.first_name || user?.email?.split("@")[0] || "User"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {user?.email}
          </div>
        </div>

        {/* Upload Custom Image Button */}
        <div style={{ marginBottom: "1.5rem" }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/png, image/jpeg, image/webp"
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              background: "rgba(14, 165, 233, 0.12)",
              border: "1px dashed rgba(14, 165, 233, 0.5)",
              color: "var(--accent-cyan)",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Upload Custom Photo (PNG, JPG, WebP max 3MB)
          </button>
        </div>

        {/* Preset VIP Avatars Grid */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.6rem", fontWeight: 600 }}>
            Or Select a VIP Preset Avatar:
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.8rem",
            }}
          >
            {PRESET_AVATARS.map((preset) => {
              const isSelected = selectedAvatar === preset.src;
              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedAvatar(preset.src)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.5rem",
                    borderRadius: "10px",
                    background: isSelected ? "rgba(255, 215, 0, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    border: isSelected ? "2px solid #ffd700" : "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "0 0 12px rgba(255, 215, 0, 0.4)" : "none",
                  }}
                >
                  <img
                    src={preset.src}
                    alt={preset.name}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                  <span style={{ fontSize: "0.68rem", color: isSelected ? "#ffd700" : "var(--text-secondary)", textAlign: "center", fontWeight: 600 }}>
                    {preset.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Success Message */}
        {successMsg && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              color: "#34d399",
              padding: "0.6rem",
              borderRadius: "8px",
              textAlign: "center",
              fontSize: "0.85rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.8rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.65rem 1.2rem",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "0.65rem 1.4rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #ffd700, #f59e0b)",
              border: "none",
              color: "#000",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(255, 215, 0, 0.4)",
            }}
          >
            {isSaving ? "Saving..." : "Save Avatar"}
          </button>
        </div>
      </div>
    </div>
  );
}
