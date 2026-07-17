"use client";

import React, { useEffect, useState, useRef } from "react";
import { apiRequest } from "@/lib/api";

interface Category {
  id: string;
  name: string;
}

interface Source {
  id: string;
  name: string;
}

export default function LuckySpinPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  
  // Slot Machine States
  const [digits, setDigits] = useState<string[]>(["7", "7", "7", "7", "7", "7"]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rollComplete, setRollComplete] = useState(false);
  
  // Save form states
  const [saveCategory, setSaveCategory] = useState("");
  const [saveSource, setSaveSource] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const targetDigits = useRef<string[]>(["7", "7", "7", "7", "7", "7"]);
  const spinningStates = useRef<boolean[]>([false, false, false, false, false, false]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Fetch Category and Source lookups on mount
  useEffect(() => {
    async function fetchLookups() {
      try {
        const [catResp, srcResp] = await Promise.all([
          apiRequest("/lookups/categories"),
          apiRequest("/lookups/sources"),
        ]);
        setCategories(catResp.data);
        setSources(srcResp.data);
        
        // Auto-select defaults: find "Other" category and "Random" source
        const otherCat = catResp.data.find((c: Category) => c.name.toLowerCase() === "other");
        if (otherCat) setSaveCategory(otherCat.id);
        
        const randomSrc = srcResp.data.find((s: Source) => s.name.toLowerCase() === "random");
        if (randomSrc) setSaveSource(randomSrc.id);
      } catch (err) {
        console.error("Failed to load lookups:", err);
      }
    }
    fetchLookups();
  }, []);

  // Web Audio Sounds
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playClickSound = () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(700 + Math.random() * 300, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      // Audio failed / blocked by user interaction policy
    }
  };

  const playLockSound = (slotIndex: number) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      
      // Pitch goes down as the slots lock
      const freq = 300 - slotIndex * 30;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio blocked
    }
  };

  const playWinSound = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 major chord arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.1, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.5);
      });
    } catch (e) {
      // Audio blocked
    }
  };

  // Main spin handler
  const handleSpin = () => {
    if (isSpinning) return;
    
    // Unlock and set state
    setIsSpinning(true);
    setRollComplete(false);
    setIsSaved(false);
    setSaveError("");
    
    // Generate targets
    targetDigits.current = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10).toString());
    spinningStates.current = [true, true, true, true, true, true];

    // Start rolling animation
    let tickCount = 0;
    const intervalId = setInterval(() => {
      tickCount++;
      setDigits((prev) =>
        prev.map((d, index) => {
          if (spinningStates.current[index]) {
            // Play click sound on a throttled rate
            if (index === 0 && tickCount % 2 === 0) playClickSound();
            return Math.floor(Math.random() * 10).toString();
          }
          return d;
        })
      );
    }, 60);

    // Set sequential locks
    const timings = [700, 1100, 1500, 1900, 2300, 2700];
    timings.forEach((ms, index) => {
      setTimeout(() => {
        spinningStates.current[index] = false;
        setDigits((prev) => {
          const next = [...prev];
          next[index] = targetDigits.current[index];
          return next;
        });
        playLockSound(index);
        
        // When the final slot stops rolling
        if (index === 5) {
          clearInterval(intervalId);
          setIsSpinning(false);
          setRollComplete(true);
          playWinSound();
        }
      }, ms);
    });
  };

  // Save generated number to database
  const handleSaveToRecords = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    try {
      const generatedNumber = digits.join("");
      const payload = {
        number: generatedNumber,
        category_id: saveCategory || undefined,
        source_id: saveSource || undefined,
        note: saveNote || undefined,
        is_favorite: false,
      };

      // Create number record
      const recordResp = await apiRequest("/records/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const savedRecord = recordResp.data;

      // Handle tags if entered
      const cleanTags = saveTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");

      if (cleanTags.length > 0) {
        // Fetch all existing tags first
        const tagsResp = await apiRequest("/tags/");
        const existingTags = tagsResp.data || [];

        const tagIds: string[] = [];
        for (const tagName of cleanTags) {
          const existing = existingTags.find((t: any) => t.name.toLowerCase() === tagName.toLowerCase());
          if (existing) {
            tagIds.push(existing.id);
          } else {
            // Create tag
            try {
              const createResp = await apiRequest("/tags/", {
                method: "POST",
                body: JSON.stringify({ name: tagName }),
              });
              tagIds.push(createResp.data.id);
            } catch (err) {
              console.error("Failed to create tag:", tagName, err);
            }
          }
        }

        // Connect tags to record
        if (tagIds.length > 0) {
          await apiRequest(`/records/${savedRecord.id}/tags`, {
            method: "PUT",
            body: JSON.stringify({ tag_ids: tagIds }),
          });
        }
      }

      setIsSaved(true);
      setSaveNote("");
      setSaveTags("");
    } catch (err: any) {
      setSaveError(err.message || "Failed to save record.");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}> Random Generator Generator</h1>
        <p style={subtitleStyle}>Roll custom 6-digit lucky numbers for fun without affecting your stats unless saved.</p>
      </div>

      {/* Slots Section */}
      <div className="glass-panel" style={spinWrapperStyle}>
        <div style={slotsGridStyle}>
          {digits.map((digit, idx) => (
            <div
              key={idx}
              style={{
                ...slotCardStyle,
                border: spinningStates.current[idx]
                  ? "2px solid var(--accent-cyan)"
                  : "1px solid var(--border-light)",
                boxShadow: spinningStates.current[idx]
                  ? "0 0 20px -3px hsla(184, 100%, 48%, 0.45)"
                  : "none",
                animation: spinningStates.current[idx] ? "rollPulse 0.4s infinite alternate" : "none",
              }}
            >
              <span style={slotNumberStyle}>{digit}</span>
              <div style={slotOverlayStyle} />
            </div>
          ))}
        </div>

        <button
          onClick={handleSpin}
          disabled={isSpinning}
          style={{
            ...spinButtonStyle,
            background: isSpinning ? "rgba(255,255,255,0.08)" : "var(--accent-gradient)",
            color: isSpinning ? "var(--text-muted)" : "#050409",
            cursor: isSpinning ? "not-allowed" : "pointer",
            transform: isSpinning ? "none" : "translateY(0)",
          }}
          className={!isSpinning ? "pulse-glow" : ""}
        >
          {isSpinning ? " GENERATING..." : " GENERATE"}
        </button>
      </div>

      {/* Save to History Form */}
      {rollComplete && (
        <div className="glass-panel" style={{ ...savePanelStyle, animation: "fadeIn 0.5s ease" }}>
          {isSaved ? (
            <div style={successWrapperStyle}>
              <span style={{ fontSize: "2rem" }}>✅</span>
              <h3 style={{ margin: "0.5rem 0", color: "#fff" }}>Saved Successfully!</h3>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                Lucky number <strong>{digits.join("")}</strong> has been added to your personal records.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveToRecords} style={formStyle}>
              <h3 style={formTitleStyle}>📥 Love this number? Save it to records!</h3>
              
              {saveError && <div style={errorStyle}>❌ {saveError}</div>}

              <div style={formRowStyle}>
                <div style={formColStyle}>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={saveCategory}
                    onChange={(e) => setSaveCategory(e.target.value)}
                    style={selectStyle}
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={formColStyle}>
                  <label style={labelStyle}>Source</label>
                  <select
                    value={saveSource}
                    onChange={(e) => setSaveSource(e.target.value)}
                    style={selectStyle}
                    required
                  >
                    <option value="">-- Select Source --</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={formRowStyle}>
                <div style={formColStyle}>
                  <label style={labelStyle}>Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={saveTags}
                    onChange={(e) => setSaveTags(e.target.value)}
                    placeholder="lucky, wheel, dream"
                    style={inputStyle}
                  />
                </div>

                <div style={formColStyle}>
                  <label style={labelStyle}>Notes / Description</label>
                  <input
                    type="text"
                    value={saveNote}
                    onChange={(e) => setSaveNote(e.target.value)}
                    placeholder="E.g. Spun randomly from lucky wheel game"
                    style={inputStyle}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={saveBtnStyle}>
                📥 Save to My Records
              </button>
            </form>
          )}
        </div>
      )}

      {/* Styled animation keyframes */}
      <style>{`
        @keyframes rollPulse {
          from { transform: scale(1); }
          to { transform: scale(1.03); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ========= STYLES =========

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: "800",
  background: "linear-gradient(135deg, #fff, var(--text-secondary))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  margin: 0,
  fontSize: "0.95rem",
};

const spinWrapperStyle: React.CSSProperties = {
  padding: "3rem 2rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2.5rem",
  background: "var(--bg-panel)",
  borderRadius: "20px",
  position: "relative",
  overflow: "hidden",
};

const slotsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "0.5rem",
  justifyContent: "center",
  width: "100%",
  maxWidth: "500px",
  margin: "0 auto",
};

const slotCardStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "3 / 4",
  background: "rgba(255, 255, 255, 0.02)",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  overflow: "hidden",
  transition: "all 0.15s ease",
};

const slotNumberStyle: React.CSSProperties = {
  fontSize: "clamp(1.8rem, 8vw, 3.5rem)",
  fontWeight: "900",
  fontFamily: "monospace",
  color: "#fff",
  textShadow: "0 0 10px rgba(255,255,255,0.15)",
  zIndex: 2,
};

const slotOverlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.4) 100%)",
  zIndex: 3,
  pointerEvents: "none",
};

const spinButtonStyle: React.CSSProperties = {
  padding: "1rem 3rem",
  fontSize: "1.1rem",
  fontWeight: "800",
  border: "none",
  borderRadius: "12px",
  transition: "all 0.2s ease",
  letterSpacing: "1px",
};

const savePanelStyle: React.CSSProperties = {
  padding: "2rem",
  background: "var(--bg-panel)",
  borderRadius: "20px",
  border: "1px solid var(--border-light)",
};

const successWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "1rem",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.2rem",
};

const formTitleStyle: React.CSSProperties = {
  margin: "0 0 0.5rem 0",
  color: "#fff",
  fontSize: "1.15rem",
  fontWeight: "700",
};

const formRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "1.2rem",
};

const formColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  outline: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  outline: "none",
};

const errorStyle: React.CSSProperties = {
  color: "hsl(0, 80%, 65%)",
  fontSize: "0.9rem",
  fontWeight: "600",
  background: "rgba(255,0,0,0.05)",
  padding: "0.6rem 1rem",
  borderRadius: "8px",
  border: "1px solid rgba(255,0,0,0.15)",
};

const saveBtnStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "0.75rem 2rem",
  marginTop: "0.5rem",
};
