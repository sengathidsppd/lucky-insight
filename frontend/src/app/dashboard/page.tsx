"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface CategoryCount {
  category_name: string;
  count: number;
}

interface SourceCount {
  source_name: string;
  count: number;
}

interface DashboardData {
  total_records: number;
  total_favorites: number;
  records_by_category: CategoryCount[];
  records_by_source: SourceCount[];
  recent_records: any[];
  recent_analysis_jobs: any[];
}

interface LotteryGame {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface LatestDraw {
  id: string;
  game_id: string;
  draw_date: string;
  draw_number: string;
  first_prize: string;
  last2: string;
  front3: string;
  back3: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [latestDraws, setLatestDraws] = useState<{ game: LotteryGame; draw: LatestDraw | null }[]>([]);

  const fetchLatestDraws = async () => {
    try {
      const gamesResp = await apiRequest("/lotteries/games");
      const games: LotteryGame[] = gamesResp.data || [];
      // Sort so Lao Development Lottery (LAO) is always first on the left
      const sortedGames = [...games].sort((a, b) => {
        const isLaoA = (a.code || "").toUpperCase().includes("LAO") || (a.name || "").toLowerCase().includes("lao");
        const isLaoB = (b.code || "").toUpperCase().includes("LAO") || (b.name || "").toLowerCase().includes("lao");
        if (isLaoA && !isLaoB) return -1;
        if (!isLaoA && isLaoB) return 1;
        return 0;
      });

      const draws: { game: LotteryGame; draw: LatestDraw | null }[] = [];
      for (const game of sortedGames) {
        try {
          const drawResp = await apiRequest(`/lotteries/results/latest?game_id=${game.id}`);
          draws.push({ game, draw: drawResp.data || null });
        } catch {
          draws.push({ game, draw: null });
        }
      }
      setLatestDraws(draws);
    } catch (err: any) {
      setError(err.message || "Failed to load lottery data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestDraws();
  }, []);

  if (isLoading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={spinnerStyle} />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return <div style={errorContainerStyle}>Error: {error}</div>;
  }

  // Helper: get flag emoji for game
  const getGameFlag = (code: string) => {
    const c = code.toLowerCase();
    if (c.includes("thai") || c.includes("th")) return "🇹🇭";
    if (c.includes("lao") || c.includes("la")) return "🇱🇦";
    return "";
  };

  const getGameGradient = (code: string) => {
    const c = code.toLowerCase();
    if (c.includes("thai") || c.includes("th")) return "linear-gradient(135deg, rgba(217, 70, 239, 0.2), rgba(6, 182, 212, 0.2))";
    if (c.includes("lao") || c.includes("la")) return "linear-gradient(135deg, rgba(217, 70, 239, 0.2), rgba(6, 182, 212, 0.2))";
    return "var(--bg-panel)";
  };

  return (
    <div className="db-container">
      {/* 1. Latest Lottery Results Row (Top) */}
      {latestDraws.length > 0 && (
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: "0 0 1rem 0" }}>Latest Lottery Results</h3>
          <div className="db-lottery-row">
            {latestDraws.filter(({ draw }) => draw !== null).map(({ game, draw }) => (
              <div key={game.id} className="glass-panel" style={{ ...lotteryCardStyle, background: getGameGradient(game.code) }}>
                {/* Card Header */}
                <div style={lotteryCardHeaderStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.6rem" }}>{getGameFlag(game.code)}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{game.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{game.code.toUpperCase()}</div>
                    </div>
                  </div>
                  {draw && (
                    <div style={drawDateBadgeStyle}>
                      {new Date(draw.draw_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>

                {draw ? (
                  <div style={{ marginTop: "1rem" }}>
                    {/* First Prize - Big */}
                    <div style={firstPrizeContainerStyle}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.3rem" }}>
                        First Prize
                      </div>
                      <div style={firstPrizeValueStyle}>{draw.first_prize}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        Draw #{draw.draw_number}
                      </div>
                    </div>

                    {/* Sub prizes */}
                    <div style={subPrizesGridStyle}>
                      <div style={subPrizeBoxStyle}>
                        <div style={subPrizeLabelStyle}>Last 2</div>
                        <div style={subPrizeValueStyle}>{draw.last2 || "—"}</div>
                      </div>
                      <div style={subPrizeBoxStyle}>
                        <div style={subPrizeLabelStyle}>Front 3</div>
                        <div style={subPrizeValueStyle}>{draw.front3 || "—"}</div>
                      </div>
                      <div style={subPrizeBoxStyle}>
                        <div style={subPrizeLabelStyle}>Back 3</div>
                        <div style={subPrizeValueStyle}>{draw.back3 || "—"}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ ...emptyTextStyle, padding: "2rem 0" }}>No draw results yet.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Calendar Heatmap Section */}
      <CalendarHeatmap />
    </div>
  );
}


function CalendarHeatmap() {
  const [heatmapData, setHeatmapData] = useState<Record<string, { last2: string; first_prize: string; game_name: string; draw_number: string }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">("ALL");
  const [activeHoverDraw, setActiveHoverDraw] = useState<{ date: string; last2: string; first_prize: string; draw_number: string } | null>(null);

  useEffect(() => {
    apiRequest("/lotteries/heatmap?year=2026")
      .then((resp) => {
        const map: Record<string, { last2: string; first_prize: string; game_name: string; draw_number: string }> = {};
        (resp.data || []).forEach((item: any) => {
          map[item.date] = {
            last2: item.last2,
            first_prize: item.first_prize,
            game_name: item.game_name,
            draw_number: item.draw_number,
          };
        });
        setHeatmapData(map);
      })
      .catch((err) => console.error("Heatmap fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const displayedMonths = selectedMonth === "ALL" 
    ? months.map((m, idx) => ({ name: m, idx }))
    : [{ name: months[selectedMonth], idx: selectedMonth }];

  return (
    <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "16px", marginTop: "1rem" }}>
      {/* Header & Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🇱🇦</span> Lao Lottery Results Calendar (2026)
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.25rem 0 0 0" }}>
            Official winning 2-digit outcomes aligned by real calendar dates (Draws on Mon, Wed, Fri)
          </p>
        </div>

        {/* Month Selector Tabs */}
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", background: "rgba(255, 255, 255, 0.03)", padding: "0.3rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <button
            type="button"
            onClick={() => setSelectedMonth("ALL")}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "8px",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: selectedMonth === "ALL" ? 800 : 500,
              background: selectedMonth === "ALL" ? "linear-gradient(135deg, var(--accent-cyan), #0284c7)" : "transparent",
              color: selectedMonth === "ALL" ? "#000" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            All Year (12M)
          </button>
          {months.map((m, mIdx) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMonth(mIdx)}
              style={{
                padding: "0.35rem 0.6rem",
                borderRadius: "8px",
                border: "none",
                fontSize: "0.75rem",
                fontWeight: selectedMonth === mIdx ? 800 : 500,
                background: selectedMonth === mIdx ? "linear-gradient(135deg, var(--accent-cyan), #0284c7)" : "transparent",
                color: selectedMonth === mIdx ? "#000" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Active Draw Detail Callout (when hovered/selected) */}
      {activeHoverDraw && (
        <div style={{
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))",
          border: "1px solid rgba(6, 182, 212, 0.3)",
          borderRadius: "10px",
          padding: "0.75rem 1.2rem",
          marginBottom: "1.2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🇱🇦</span>
            <div>
              <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem" }}>
                Draw Date: {new Date(activeHoverDraw.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Draw #{activeHoverDraw.draw_number || "—"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>1st Prize (6D): </span>
              <span style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 800, color: "#ffd700", letterSpacing: "2px" }}>
                {activeHoverDraw.first_prize || "—"}
              </span>
            </div>
            <div style={{
              background: "linear-gradient(135deg, var(--accent-cyan), #0284c7)",
              color: "#000",
              fontWeight: 900,
              fontSize: "1.1rem",
              padding: "0.2rem 0.8rem",
              borderRadius: "6px",
              fontFamily: "monospace",
              letterSpacing: "1px",
            }}>
              2D: {activeHoverDraw.last2}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          Loading 2026 calendar lottery results...
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: selectedMonth === "ALL" ? "repeat(auto-fit, minmax(290px, 1fr))" : "1fr",
          gap: "1.2rem",
          width: "100%",
        }}>
          {displayedMonths.map(({ name: mName, idx: mIdx }) => {
            const daysInMonth = new Date(2026, mIdx + 1, 0).getDate();
            const startDayOfWeek = new Date(2026, mIdx, 1).getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
            const isSingleMonthView = selectedMonth !== "ALL";

            return (
              <div
                key={mName}
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  padding: isSingleMonthView ? "1.5rem" : "1rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  boxSizing: "border-box",
                  width: "100%",
                  overflow: "hidden",
                }}
              >
                {/* Month Title */}
                <div style={{
                  fontSize: isSingleMonthView ? "1.2rem" : "0.95rem",
                  fontWeight: 800,
                  color: "var(--accent-cyan)",
                  marginBottom: "0.8rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>{mName} 2026</span>
                  {!isSingleMonthView && (
                    <button
                      type="button"
                      onClick={() => setSelectedMonth(mIdx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Expand
                    </button>
                  )}
                </div>

                {/* Day of Week Headers */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gap: isSingleMonthView ? "6px" : "3px",
                  textAlign: "center",
                  marginBottom: "6px",
                  width: "100%",
                }}>
                  {weekDays.map((wd, wdIdx) => {
                    const isDrawDayHeader = wdIdx === 1 || wdIdx === 3 || wdIdx === 5; // Mon, Wed, Fri
                    return (
                      <div
                        key={wd}
                        style={{
                          fontSize: isSingleMonthView ? "0.8rem" : "0.68rem",
                          fontWeight: isDrawDayHeader ? 800 : 500,
                          color: isDrawDayHeader ? "var(--accent-cyan)" : "var(--text-muted)",
                          paddingBottom: "2px",
                        }}
                      >
                        {wd}
                      </div>
                    );
                  })}
                </div>

                {/* Days Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gap: isSingleMonthView ? "6px" : "3px",
                  width: "100%",
                }}>
                  {/* Empty offset slots for previous month overflow */}
                  {Array.from({ length: startDayOfWeek }).map((_, emptyIdx) => (
                    <div key={`empty-${emptyIdx}`} style={{ aspectRatio: "1", minWidth: 0 }} />
                  ))}

                  {/* Day Cells */}
                  {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                    const dayNum = dIdx + 1;
                    const dateStr = `2026-${String(mIdx + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                    const drawInfo = heatmapData[dateStr];
                    const hasDraw = !!drawInfo;
                    const dayOfWeekIdx = (startDayOfWeek + dIdx) % 7;
                    const isOfficialDrawDay = dayOfWeekIdx === 1 || dayOfWeekIdx === 3 || dayOfWeekIdx === 5; // Mon, Wed, Fri

                    return (
                      <div
                        key={dayNum}
                        onMouseEnter={() => {
                          if (hasDraw) {
                            setActiveHoverDraw({
                              date: dateStr,
                              last2: drawInfo.last2,
                              first_prize: drawInfo.first_prize,
                              draw_number: drawInfo.draw_number,
                            });
                          }
                        }}
                        style={{
                          aspectRatio: "1",
                          minWidth: 0,
                          width: "100%",
                          boxSizing: "border-box",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderRadius: isSingleMonthView ? "8px" : "5px",
                          padding: isSingleMonthView ? "6px 4px" : "2px 1px",
                          background: hasDraw
                            ? "linear-gradient(135deg, rgba(6, 182, 212, 0.95), rgba(59, 130, 246, 0.95))"
                            : isOfficialDrawDay
                            ? "rgba(255, 255, 255, 0.04)"
                            : "rgba(255, 255, 255, 0.015)",
                          border: hasDraw
                            ? "1px solid rgba(255, 255, 255, 0.45)"
                            : isOfficialDrawDay
                            ? "1px dashed rgba(6, 182, 212, 0.2)"
                            : "1px solid rgba(255, 255, 255, 0.02)",
                          boxShadow: hasDraw ? "0 2px 8px rgba(6, 182, 212, 0.35)" : "none",
                          cursor: hasDraw ? "pointer" : "default",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* Top: Day number */}
                        <span style={{
                          fontSize: isSingleMonthView ? "0.75rem" : "0.58rem",
                          fontWeight: hasDraw ? 800 : 500,
                          color: hasDraw ? "#ffffff" : isOfficialDrawDay ? "rgba(255,255,255,0.7)" : "rgba(255, 255, 255, 0.3)",
                          alignSelf: "flex-start",
                          marginLeft: isSingleMonthView ? "4px" : "2px",
                          lineHeight: 1,
                        }}>
                          {dayNum}
                        </span>

                        {/* Center: Winning 2D number or empty indicator */}
                        {hasDraw ? (
                          <span style={{
                            fontSize: isSingleMonthView ? "1.4rem" : "0.78rem",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            letterSpacing: "0.2px",
                            color: "#ffffff",
                            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                            lineHeight: 1,
                          }}>
                            {drawInfo.last2}
                          </span>
                        ) : (
                          <div style={{ flex: 1 }} />
                        )}

                        {/* Bottom: 6D prize in expanded view */}
                        {isSingleMonthView && hasDraw && (
                          <span style={{
                            fontSize: "0.65rem",
                            color: "rgba(255,255,255,0.85)",
                            fontFamily: "monospace",
                            lineHeight: 1,
                          }}>
                            1st: {drawInfo.first_prize}
                          </span>
                        )}
                        {(!isSingleMonthView || !hasDraw) && <div style={{ height: "1px" }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---


function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
      <div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{label}</div>
        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>{value}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: number; accent: string }) {
  return (
    <div className="glass-panel" style={statCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={statLabelStyle}>{label}</p>
          <h3 style={statValueStyle}>{value.toLocaleString()}</h3>
        </div>
        <div style={{ ...statIconBoxStyle, background: accent }}>
          <span style={{ fontSize: "1.2rem" }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

// ========= STYLES =========

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  color: "var(--text-primary)"
};

const statsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "1.2rem"
};

const statCardStyle: React.CSSProperties = {
  padding: "1.2rem 1.5rem",
  background: "var(--bg-panel)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
};

const statLabelStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: 0
};

const statValueStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#fff",
  margin: "0.2rem 0 0 0"
};

const statIconBoxStyle: React.CSSProperties = {
  width: "45px",
  height: "45px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
};

const bannerRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: "1.2rem",
  minHeight: "240px"
};

const welcomeBannerStyle: React.CSSProperties = {
  borderRadius: "20px",
  background: "radial-gradient(circle at 10% 20%, rgba(0, 117, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(184, 100%, 48, 0.15) 0%, transparent 50%), linear-gradient(135deg, rgba(20, 5, 30, 0.8) 0%, rgba(15, 5, 24, 0.9) 100%)",
  overflow: "hidden",
  position: "relative",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
};

const welcomeOverlayStyle: React.CSSProperties = {
  padding: "2rem",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between"
};

const bannerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.6rem 1.2rem",
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "12px",
  color: "#fff",
  textDecoration: "none",
  fontSize: "0.85rem",
  fontWeight: 600,
  transition: "all 0.2s ease"
};

const ringPanelStyle: React.CSSProperties = {
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "var(--bg-panel)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
};

const ringContainerStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "1.2rem"
};

const ringTextStyle: React.CSSProperties = {
  position: "absolute",
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

const quickActionsStyle: React.CSSProperties = {
  padding: "1.5rem",
  background: "var(--bg-panel)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
};

const quickActionBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.8rem",
  padding: "0.75rem 0.9rem",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "12px",
  textDecoration: "none",
  color: "inherit",
  transition: "all 0.2s ease"
};

const qaBtnIconStyle: React.CSSProperties = {
  fontSize: "1.3rem",
  filter: "drop-shadow(0 0 4px rgba(255,255,255,0.1))"
};

const qaBtnTitleStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#fff"
};

const qaBtnSubStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "var(--text-muted)",
  marginTop: "0.1rem"
};

// Lottery Results Section
const lotteryResultsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1.2rem"
};

const lotteryCardStyle: React.CSSProperties = {
  padding: "1.5rem",
  borderRadius: "20px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(20px)"
};

const lotteryCardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const drawDateBadgeStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "10px",
  padding: "0.35rem 0.75rem",
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
  fontWeight: 600
};

const firstPrizeContainerStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "1.2rem 0",
  background: "rgba(255, 255, 255, 0.02)",
  border: "1px solid rgba(255, 255, 255, 0.04)",
  borderRadius: "14px",
  marginTop: "0.8rem"
};

const firstPrizeValueStyle: React.CSSProperties = {
  fontSize: "2.4rem",
  fontWeight: 900,
  fontFamily: "monospace",
  letterSpacing: "6px",
  background: "linear-gradient(135deg, #ffd700, #ff9500)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  filter: "drop-shadow(0 0 10px rgba(255,215,0,0.2))"
};

const subPrizesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "0.6rem",
  marginTop: "0.8rem"
};

const subPrizeBoxStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "0.7rem",
  background: "rgba(255, 255, 255, 0.03)",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.05)"
};

const subPrizeLabelStyle: React.CSSProperties = {
  fontSize: "0.65rem",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "0.2rem"
};

const subPrizeValueStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  fontFamily: "monospace",
  color: "#fff",
  letterSpacing: "2px"
};

const chartsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 1fr",
  gap: "1.2rem"
};

const chartPanelStyle: React.CSSProperties = {
  padding: "1.5rem",
  background: "var(--bg-panel)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
};

const chartPanelSmallStyle: React.CSSProperties = {
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-panel)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
};

const chartHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start"
};

const bottomRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 1fr",
  gap: "1.2rem"
};

const recentPanelStyle: React.CSSProperties = {
  padding: "1.5rem",
  background: "var(--bg-panel)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
};

const sourcePanelStyle: React.CSSProperties = {
  padding: "1.5rem",
  background: "var(--bg-panel)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
};

// Bar chart styles
const barRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "0.6rem" };
const barLabelStyle: React.CSSProperties = { width: "100px", fontSize: "0.82rem", color: "var(--text-secondary)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const barTrackStyle: React.CSSProperties = { flex: 1, height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", overflow: "hidden" };
const barFillStyle: React.CSSProperties = { height: "100%", borderRadius: "4px", transition: "width 0.6s ease" };
const barValueStyle: React.CSSProperties = { width: "35px", textAlign: "right", fontSize: "0.8rem", fontWeight: 700, color: "#fff", flexShrink: 0 };

// Mini bar chart
const miniBarChartStyle: React.CSSProperties = { display: "flex", alignItems: "flex-end", gap: "6px", height: "100px", marginTop: "1.2rem", padding: "0 0.5rem" };
const miniBarColStyle: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" };

const panelTitleStyle: React.CSSProperties = { fontSize: "1rem", fontWeight: 700, color: "#fff", margin: 0 };
const emptyTextStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0" };

// Table
const tableStyle: React.CSSProperties = { borderCollapse: "collapse", width: "100%", textAlign: "left" };
const tableHeaderRowStyle: React.CSSProperties = { borderBottom: "1px solid rgba(255,255,255,0.08)" };
const thStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, padding: "0.6rem 0.8rem", textTransform: "uppercase" };
const trStyle: React.CSSProperties = { borderBottom: "1px solid rgba(255,255,255,0.03)" };
const tdStyle: React.CSSProperties = { color: "var(--text-secondary)", fontSize: "0.88rem", padding: "0.6rem 0.8rem" };

// Loading / Error
const loadingContainerStyle: React.CSSProperties = { display: "flex", height: "50vh", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", gap: "0.75rem" };
const spinnerStyle: React.CSSProperties = { width: "32px", height: "32px", border: "3px solid rgba(255, 255, 255, 0.1)", borderTopColor: "var(--accent-cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const errorContainerStyle: React.CSSProperties = { color: "hsl(0, 80%, 75%)", padding: "2rem", textAlign: "center" };
