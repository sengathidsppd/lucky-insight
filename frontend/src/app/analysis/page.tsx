"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface AnalysisJob {
  id: string;
  game_code: string;
  analysis_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  result?: {
    id: string;
    job_id: string;
    result_data: Record<string, any>;
    explanation: string;
    created_at: string;
  };
}

export default function AnalysisPage() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<AnalysisJob | null>(null);
  const [games, setGames] = useState<any[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // Form states
  const [gameCode, setGameCode] = useState("LAO");
  const [analysisType, setAnalysisType] = useState("COMPOSITE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [quotaInfo, setQuotaInfo] = useState<{ remaining: number; daily_limit: number; used_today: number }>({
    remaining: 1,
    daily_limit: 1,
    used_today: 0,
  });

  const isLaoGame = (g: any) => {
    if (!g) return false;
    const code = (g.code || "").toUpperCase();
    const name = (g.name || "").toUpperCase();
    return code.includes("LAO") || name.includes("LAO") || name.includes("ลาว");
  };

  const fetchLookups = async () => {
    try {
      const resp = await apiRequest("/lotteries/games");
      const fetchedGames = resp.data || [];
      const sortedGames = [...fetchedGames].sort((a, b) => {
        const aIsLao = isLaoGame(a);
        const bIsLao = isLaoGame(b);
        if (aIsLao && !bIsLao) return -1;
        if (!aIsLao && bIsLao) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });
      setGames(sortedGames);
      if (sortedGames.length > 0) {
        const defaultGame = sortedGames.find(isLaoGame) || sortedGames[0];
        setGameCode(defaultGame.code);
        fetchQuota(defaultGame.code, sortedGames);
      }
    } catch (err) {
      console.error("Failed to load games lookup:", err);
    }
  };

  const fetchQuota = async (targetGameCode = gameCode, currentGames = games) => {
    try {
      const activeGames = currentGames.length > 0 ? currentGames : games;
      const selectedGame = activeGames.find((g) => g.code === targetGameCode);
      const param = selectedGame?.id
        ? `?game_id=${selectedGame.id}`
        : `?game_code=${targetGameCode}`;
      const resp = await apiRequest(`/analysis/quota${param}`);
      if (resp && resp.remaining !== undefined) {
        setQuotaInfo({
          remaining: resp.remaining,
          daily_limit: resp.daily_limit,
          used_today: resp.used_today,
        });
      }
    } catch (err) {
      console.error("Failed to load quota:", err);
    }
  };

  const fetchJobs = async () => {
    try {
      const resp = await apiRequest("/analysis/");
      setJobs(resp.data);
      setSelectedJobIds([]); // reset selection
    } catch (err: any) {
      setError(err.message || "Failed to load analysis history.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchJobs();
    fetchQuota();
  }, []);

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const selectedGame = games.find((g) => g.code === gameCode);
      const payload = {
        analysis_type: analysisType,
        parameters: {
          game_id: selectedGame?.id || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
      };

      const resp = await apiRequest("/analysis/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Reload jobs and quota
      await fetchJobs();
      await fetchQuota();

      // Automatically select the newly created job
      const newJob = resp.data;
      if (newJob) {
        setSelectedJob(newJob);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start analysis job.");
      await fetchQuota();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectJob = async (job: AnalysisJob) => {
    try {
      const resp = await apiRequest(`/analysis/${job.id}`);
      setSelectedJob(resp.data);
    } catch (err: any) {
      alert("Failed to load details: " + err.message);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this analysis history?")) {
      return;
    }
    try {
      await apiRequest(`/analysis/${jobId}`, {
        method: "DELETE",
      });
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }
      fetchJobs();
    } catch (err: any) {
      alert("Failed to delete history item: " + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedJobIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete all ${selectedJobIds.length} selected analysis histories?`)) {
      return;
    }
    try {
      await Promise.all(
        selectedJobIds.map((id) =>
          apiRequest(`/analysis/${id}`, {
            method: "DELETE",
          }).catch((err) => {
            console.warn("Ignored deletion error for job", id, err);
          })
        )
      );
      if (selectedJob && selectedJobIds.includes(selectedJob.id)) {
        setSelectedJob(null);
      }
      setSelectedJobIds([]);
      fetchJobs();
    } catch (err: any) {
      alert("Failed to delete selected items: " + err.message);
    }
  };


  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>Statistical Analysis Center</h1>
        <p style={subtitleStyle}>Run analytical models on lottery history to discover repeating trends.</p>
      </div>

      <div style={layoutGridStyle}>
        {/* Run Form & History Panel */}
        <div style={leftPanelStyle}>
          {/* Form */}
          <div className="glass-panel" style={panelCardStyle}>
            <h3 style={panelTitleStyle}>Run Statistical Model</h3>
            {error && <div style={errorStyle}>{error}</div>}
            <form onSubmit={handleStartAnalysis} style={formStyle}>
              <div style={formRowStyle}>
                <div style={formColStyle}>
                  <label style={labelStyle}>Target Game</label>
                  <select
                    value={gameCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setGameCode(newCode);
                      fetchQuota(newCode);
                    }}
                  >
                    {games.map((g) => (
                      <option key={g.id} value={g.code}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                </div>

                <div style={formColStyle}>
                  <label style={labelStyle}>Statistical Engine</label>
                  <select value={analysisType} onChange={(e) => setAnalysisType(e.target.value)}>
                    <option value="COMPOSITE">🌟 Multi-Objective Composite Model (4D Engine)</option>
                  </select>
                </div>
              </div>

              <div style={formRowStyle}>
                <div style={formColStyle}>
                  <label style={labelStyle}>Start Date (Optional)</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div style={formColStyle}>
                  <label style={labelStyle}>End Date (Optional)</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0.5rem 0", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {quotaInfo.remaining > 0 ? (
                  <span style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <span>💡</span> <span>Daily Analysis Quota for <strong>{games.find((g) => g.code === gameCode)?.name || gameCode}</strong>: <strong>{quotaInfo.remaining} / {quotaInfo.daily_limit}</strong> run remaining today</span>
                  </span>
                ) : (
                  <span style={{ color: "#f87171", display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(239, 68, 68, 0.12)", padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)", width: "100%" }}>
                    <span>🔒</span> <span>Daily Quota Reached for <strong>{games.find((g) => g.code === gameCode)?.name || gameCode}</strong>: <strong>0 / {quotaInfo.daily_limit}</strong> runs remaining today</span>
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || quotaInfo.remaining <= 0}
                style={{
                  opacity: quotaInfo.remaining <= 0 ? 0.5 : 1,
                  cursor: quotaInfo.remaining <= 0 ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting
                  ? "Calculating..."
                  : quotaInfo.remaining <= 0
                    ? `🔒 Quota Limit Reached (${quotaInfo.daily_limit}/${quotaInfo.daily_limit})`
                    : " Analyze Data"}
              </button>
            </form>
          </div>

          {/* History */}
          <div className="glass-panel" style={panelCardStyle}>
            <h3 style={panelTitleStyle}>Model Runs History</h3>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "1.5rem" }}>Loading history...</div>
            ) : jobs.length === 0 ? (
              <div style={emptyTextStyle}>No previous runs.</div>
            ) : (
              <div>
                {/* Bulk actions row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", padding: "0 0.2rem" }}>
                  <label style={{ display: "flex", alignItems: "center", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary)" }}>
                    <input
                      type="checkbox"
                      checked={selectedJobIds.length === jobs.length && jobs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedJobIds(jobs.map((j) => j.id));
                        } else {
                          setSelectedJobIds([]);
                        }
                      }}
                      style={{ marginRight: "0.5rem", cursor: "pointer" }}
                    />
                    Select All
                  </label>
                  {selectedJobIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className="btn"
                      style={{
                        padding: "0.3rem 0.6rem",
                        fontSize: "0.8rem",
                        borderRadius: "6px",
                        background: "rgba(224, 80, 80, 0.2)",
                        color: "hsl(0, 80%, 75%)",
                        border: "1px solid rgba(224, 80, 80, 0.4)",
                        cursor: "pointer",
                      }}
                    >
                      🗑️ Delete Selected ({selectedJobIds.length})
                    </button>
                  )}
                </div>

                <div style={historyListStyle}>
                  {jobs.map((job) => {
                    const isSelected = selectedJob?.id === job.id;
                    const isChecked = selectedJobIds.includes(job.id);
                    return (
                      <div
                        key={job.id}
                        onClick={() => handleSelectJob(job)}
                        style={{
                          ...(isSelected ? selectedHistoryItemStyle : historyItemStyle),
                          display: "flex",
                          alignItems: "center",
                          padding: "0.85rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedJobIds([...selectedJobIds, job.id]);
                            } else {
                              setSelectedJobIds(selectedJobIds.filter((id) => id !== job.id));
                            }
                          }}
                          style={{ marginRight: "0.8rem", cursor: "pointer", accentColor: "#ffd700", width: "16px", height: "16px" }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={historyItemHeaderStyle}>
                            <span style={historyItemTitleStyle}>
                              {job.analysis_type} ({job.game_code})
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={getStatusBadgeStyle(job.status)}>{job.status}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteJob(job.id);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "rgba(255, 255, 255, 0.6)",
                                  cursor: "pointer",
                                  fontSize: "1rem",
                                  padding: "0.2rem",
                                  transition: "color 0.2s",
                                }}
                                title="Delete this analysis run"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div style={historyItemDateStyle}>
                            Run on: {formatSafeDate(job.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div style={rightPanelStyle}>
          {selectedJob ? (
            <div className="glass-panel" style={resultsPanelCardStyle}>
              <div style={{ ...resultsHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={resultsGameBadgeStyle}>{selectedJob.game_code}</span>
                  <h2 style={resultsTitleStyle}>{selectedJob.analysis_type} Analysis</h2>
                  <p style={resultsSubTitleStyle}>
                    Status: <strong style={{ color: "var(--accent-cyan)" }}>{selectedJob.status}</strong>
                  </p>
                </div>
                {selectedJob.status === "COMPLETED" && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const csvContent = await apiRequest(`/analysis/${selectedJob.id}/export/csv`);
                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.setAttribute("download", `analysis_report_${selectedJob.id.slice(0, 8)}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } catch (err: any) {
                        alert("Export failed: " + err.message);
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                  >
                    📄 Export CSV Report
                  </button>
                )}
              </div>

              {selectedJob.status === "COMPLETED" ? (
                <AnalysisResultVisualizer job={selectedJob} />
              ) : selectedJob.status === "FAILED" ? (
                <div style={errorStyle}>Model execution failed. Please verify dates and draw history.</div>
              ) : (
                <div style={{ textAlign: "center", padding: "4rem" }}>
                  Calculating mathematical statistics. Please wait...
                </div>
              )}
            </div>

          ) : (
            <div className="glass-panel" style={resultsPlaceholderStyle}>
              <div>Select a model run from the history or start a new analysis to visualize statistics.</div>
              <GameComparisonMatrix />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameComparisonMatrix() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/analysis/compare/summary")
      .then((resp) => setData(resp.comparison || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "1rem" }}>Loading comparison matrix...</div>;

  return (
    <div style={{ marginTop: "1.5rem", textAlign: "left", width: "100%" }}>
      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "0.8rem" }}>
        ⚖️ Multi-Game Statistical Comparison Matrix
      </h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {data.map((item) => (
          <div key={item.game_code} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "1rem", borderRadius: "8px" }}>
            <div style={{ fontWeight: 800, color: "var(--accent-cyan)", fontSize: "0.95rem" }}>{item.game_name} ({item.game_code})</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>Total Draws: <strong>{item.total_draws}</strong></div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Top Digit: <strong style={{ color: "#fff" }}>{item.top_digit}</strong></div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Most Common 2D: <strong style={{ color: "var(--accent-purple)" }}>{item.most_common_last2}</strong></div>
          </div>
        ))}
      </div>
    </div>
  );
}



function AnalysisResultVisualizer({ job }: { job: AnalysisJob }) {
  const { user } = useAuth();
  const result = job.result;
  const [endingLength, setEndingLength] = useState(2); // default to 2-digit endings
  const [isSet1Visible, setIsSet1Visible] = useState(false);

  useEffect(() => {
    setIsSet1Visible(false);
  }, [job.id]);

  if (!result) return null;
  const details = result.result_data;

  return (
    <div style={resultsBodyStyle}>
      {(job.analysis_type === "COMPOSITE" || job.analysis_type === "FREQUENCY" || job.analysis_type === "MONTE_CARLO" || true) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Recommended Picks (6D for Admin only, 4D for Super Admin only, 2D for all) */}
          <div
            className="glass-panel"
            style={{
              background: "rgba(102, 126, 234, 0.06)",
              border: "1px solid rgba(102, 126, 234, 0.15)",
              padding: "1.5rem",
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <h4 style={{ ...subPanelTitleStyle, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, fontSize: "1.1rem" }}>
                Winning Number Projections (Statistical Picks)
              </h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.2rem" }}>
              {/* 6-Digit Card (Super Admin / Operator Admin Only) */}
              {user?.is_admin && details.best_analyzed_6d?.[0] && (
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", background: "rgba(255, 215, 0, 0.03)", border: "1px solid rgba(255, 215, 0, 0.12)", borderRadius: "10px", padding: "1.1rem 1.8rem" }}>
                  <div style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: "bold", minWidth: "150px" }}>
                    6-Digit Pick (Top 6D)
                  </div>
                  <div style={{ fontSize: "2.2rem", fontWeight: 900, fontFamily: "monospace", color: "#ffd700", letterSpacing: "5px", textShadow: "0 0 15px rgba(255, 215, 0, 0.4)" }}>
                    {details.best_analyzed_6d[0].number}
                  </div>
                </div>
              )}

              {/* 4-Digit Card (Super Admin Only - Exclusive VIP) */}
              {user?.email === "suzu@gmail.com" && (() => {
                const raw4d = details.generated_4d_recommendations?.[0]
                  ? (typeof details.generated_4d_recommendations[0] === "string"
                      ? details.generated_4d_recommendations[0]
                      : details.generated_4d_recommendations[0]?.number)
                  : (details.top_4digit_endings?.[0]?.combination
                      || (details.best_analyzed_6d?.[0]?.number ? details.best_analyzed_6d[0].number.slice(-4) : null));

                if (!raw4d) return null;

                return (
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", background: "rgba(168, 85, 247, 0.05)", border: "1px solid rgba(168, 85, 247, 0.25)", borderRadius: "10px", padding: "1.1rem 1.8rem" }}>
                    <div style={{ fontSize: "0.95rem", color: "#e9d5ff", fontWeight: "bold", minWidth: "150px", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      👑 4-Digit Pick (Super Admin VIP)
                    </div>
                    <div style={{ fontSize: "2.2rem", fontWeight: 900, fontFamily: "monospace", color: "#c084fc", letterSpacing: "5px", textShadow: "0 0 15px rgba(192, 132, 252, 0.5)" }}>
                      {raw4d}
                    </div>
                  </div>
                );
              })()}

              {/* 2-Digit Cards (3 Unique Picks) */}
              {(() => {
                let top2dList = [...(details.generated_2d_recommendations || [])];

                // Fallback for older jobs: supplement with top 2-digit endings if less than 3
                if (top2dList.length < 3 && details.top_2digit_endings) {
                  const existingSet = new Set(
                    top2dList.map((x: any) => (typeof x === "string" ? x : x.number))
                  );
                  for (const ending of details.top_2digit_endings) {
                    if (top2dList.length >= 3) break;
                    if (ending?.combination && !existingSet.has(ending.combination)) {
                      top2dList.push({ number: ending.combination });
                      existingSet.add(ending.combination);
                    }
                  }
                }

                const display2dList = top2dList.slice(0, 3);

                return display2dList.map((item: any, idx: number) => {
                  const numStr = typeof item === "string" ? item : item?.number || "00";

                  return (
                    <div
                      key={numStr + idx}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "1rem",
                        background: "rgba(255, 215, 0, 0.03)",
                        border: "1px solid rgba(255, 215, 0, 0.12)",
                        borderRadius: "10px",
                        padding: "1.1rem 1.8rem",
                      }}
                    >
                      <div style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: "bold", minWidth: "150px" }}>
                        2-Digit Pick #{idx + 1} (Top 2D)
                      </div>
                      <div style={{ fontSize: "2.2rem", fontWeight: 900, fontFamily: "monospace", color: "#f59e0b", letterSpacing: "5px", textShadow: "0 0 15px rgba(245, 158, 11, 0.4)" }}>
                        {numStr}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>


          {/* Winning Flow Wave Trend Section (Golden Bezier Wave) */}
          {(() => {
            const recentDrawsList = details.recent_draws || (details.best_analyzed_6d || []).map((d: any) => d.number) || [];
            const trendData = (recentDrawsList || [])
              .slice(0, 16)
              .reverse()
              .map((draw: string, idx: number) => {
                const cleaned = draw.replace(/\D/g, "");
                if (cleaned.length === 0) return null;
                const last2Val = cleaned.length >= 2 ? parseInt(cleaned.slice(-2), 10) : parseInt(cleaned, 10) * 10;
                const digits = cleaned.split("").map(c => parseInt(c, 10));
                const avgVal = digits.reduce((a, b) => a + b, 0) / (digits.length || 1);
                return {
                  label: `Draw ${idx + 1}`,
                  number: draw,
                  last2: last2Val,
                  avgVal,
                };
              })
              .filter(Boolean) as any[];

            if (trendData.length === 0) return null;

            // Generate Smooth Catmull-Rom to Cubic Bezier Path
            const chartWidth = 520;
            const chartHeight = 220;
            const padLeft = 45;
            const padRight = 25;
            const padTop = 30;
            const padBottom = 40;
            const plotWidth = chartWidth - padLeft - padRight;
            const plotHeight = chartHeight - padTop - padBottom;

            const points = trendData.map((d, idx) => {
              const x = padLeft + (idx * plotWidth) / Math.max(1, trendData.length - 1);
              const y = padTop + plotHeight * (1 - d.last2 / 99);
              return { x, y, data: d };
            });

            // Smooth Curve
            let curvePath = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
            for (let i = 0; i < points.length - 1; i++) {
              const p0 = points[Math.max(0, i - 1)];
              const p1 = points[i];
              const p2 = points[i + 1];
              const p3 = points[Math.min(points.length - 1, i + 2)];

              const cp1x = p1.x + (p2.x - p0.x) / 6;
              const cp1y = p1.y + (p2.y - p0.y) / 6;
              const cp2x = p2.x - (p3.x - p1.x) / 6;
              const cp2y = p2.y - (p3.y - p1.y) / 6;

              curvePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
            }

            const areaPath = `${curvePath} L ${points[points.length - 1].x.toFixed(1)},${padTop + plotHeight} L ${points[0].x.toFixed(1)},${padTop + plotHeight} Z`;

            return (
              <div
                className="glass-panel"
                style={{
                  background: "rgba(255, 215, 0, 0.02)",
                  border: "1px solid rgba(255, 215, 0, 0.12)",
                  padding: "1.5rem",
                  borderRadius: "14px",
                  marginTop: "1.5rem",
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h4 style={{ ...subPanelTitleStyle, color: "#ffd700", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem" }}>
                      <span>📈</span> Winning Flow Wave Trend (2-Digit Ending Trajectory)
                    </h4>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.2rem 0 0 0" }}>
                      Mathematical oscillation wave across recent 16 draws (Low Zone 00–49 vs High Zone 50–99)
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", fontSize: "0.78rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffd700", boxShadow: "0 0 8px #ffd700" }} />
                      <span style={{ color: "#ffd700", fontWeight: 700 }}>Winning 2D Wave</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <div style={{ width: "16px", height: "2px", background: "rgba(255, 215, 0, 0.4)", borderTop: "1px dashed rgba(255, 215, 0, 0.8)" }} />
                      <span style={{ color: "var(--text-secondary)" }}>Midline (50)</span>
                    </div>
                  </div>
                </div>

                <div style={{ position: "relative", width: "100%", height: "240px" }}>
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
                    <defs>
                      <linearGradient id="goldWaveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffd700" stopOpacity="0.3" />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
                      </linearGradient>

                      <linearGradient id="goldWaveStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="50%" stopColor="#ffd700" />
                        <stop offset="100%" stopColor="#fffbeb" />
                      </linearGradient>

                      <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffd700" floodOpacity="0.7" />
                      </filter>
                    </defs>

                    {/* Zone Background Rectangles */}
                    <rect
                      x={padLeft}
                      y={padTop}
                      width={plotWidth}
                      height={plotHeight / 2}
                      fill="rgba(245, 158, 11, 0.02)"
                    />
                    <rect
                      x={padLeft}
                      y={padTop + plotHeight / 2}
                      width={plotWidth}
                      height={plotHeight / 2}
                      fill="rgba(6, 182, 212, 0.015)"
                    />

                    {/* Horizontal Grid lines & Y-Axis Labels */}
                    {[
                      { val: 99, label: "99 (High)" },
                      { val: 75, label: "75" },
                      { val: 50, label: "50" },
                      { val: 25, label: "25" },
                      { val: 0, label: "00 (Low)" },
                    ].map(({ val, label }) => {
                      const y = padTop + plotHeight * (1 - val / 99);
                      const isMid = val === 50;
                      return (
                        <g key={val}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={padLeft + plotWidth}
                            y2={y}
                            stroke={isMid ? "rgba(255, 215, 0, 0.35)" : "rgba(255, 255, 255, 0.06)"}
                            strokeDasharray={isMid ? "4 4" : "2 4"}
                            strokeWidth={isMid ? 1.5 : 1}
                          />
                          <text
                            x={padLeft - 8}
                            y={y + 3}
                            fill={isMid ? "#ffd700" : "var(--text-muted)"}
                            fontSize="9.5"
                            fontWeight={isMid ? 800 : 500}
                            textAnchor="end"
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Vertical Gridlines */}
                    {points.map((p, idx) => (
                      <line
                        key={idx}
                        x1={p.x}
                        y1={padTop}
                        x2={p.x}
                        y2={padTop + plotHeight}
                        stroke="rgba(255, 255, 255, 0.04)"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Golden Wave Area Fill */}
                    <path d={areaPath} fill="url(#goldWaveFill)" />

                    {/* Golden Wave Stroke */}
                    <path
                      d={curvePath}
                      fill="none"
                      stroke="url(#goldWaveStroke)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#goldGlow)"
                    />

                    {/* Point Nodes */}
                    {points.map((p, idx) => {
                      const isLast = idx === points.length - 1;
                      const twoDigitStr = String(p.data.last2).padStart(2, "0");
                      return (
                        <g key={idx}>
                          {/* Outer Glow Halo for last point */}
                          {isLast && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="10"
                              fill="none"
                              stroke="#ffd700"
                              strokeWidth="2"
                              opacity="0.6"
                            >
                              <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
                            </circle>
                          )}

                          {/* Center Node */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isLast ? 6 : 4.5}
                            fill={isLast ? "#fffbeb" : "#ffd700"}
                            stroke="#000"
                            strokeWidth="2"
                            style={{ cursor: "pointer" }}
                          >
                            <title>{`Draw ${idx + 1}: ${p.data.number}\nWinning 2D: ${twoDigitStr} (${p.data.last2 >= 50 ? "High Zone" : "Low Zone"})`}</title>
                          </circle>

                          {/* Node Value Label Tag */}
                          <text
                            x={p.x}
                            y={p.y - 10}
                            fill={isLast ? "#ffd700" : "#ffffff"}
                            fontSize={isLast ? "11" : "9.5"}
                            fontWeight={900}
                            fontFamily="monospace"
                            textAnchor="middle"
                            filter="drop-shadow(0 1px 3px rgba(0,0,0,0.8))"
                          >
                            {twoDigitStr}
                          </text>

                          {/* X-Axis Draw Label */}
                          {(idx % 2 === 0 || isLast) && (
                            <text
                              x={p.x}
                              y={padTop + plotHeight + 18}
                              fill="var(--text-secondary)"
                              fontSize="9"
                              textAnchor="middle"
                            >
                              #{idx + 1}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            );
          })()}
          {/* 4-Dimension Statistical Grid */}
          <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-cyan)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>🧩</span> 4-Dimension Statistical Analytic Breakdown
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.2rem" }}>
              {/* Dim 1: Position Frequency */}
              {details.top_single_digits && (
                <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ fontWeight: 700, color: "var(--accent-cyan)", fontSize: "0.95rem", marginBottom: "0.8rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>🎯 Dim 1: Position Frequency (40%)</span>
                  </div>
                  <div style={tableWrapperStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={tableHeaderRowStyle}>
                          <th style={thStyle}>Digit</th>
                          <th style={thStyle}>Count</th>
                          <th style={thStyle}>Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.top_single_digits.slice(0, 5).map((item: any) => (
                          <tr key={item.digit} style={trStyle}>
                            <td style={{ ...tdStyle, fontWeight: 700, color: "#ffd700" }}>{item.digit}</td>
                            <td style={tdStyle}>{item.count}</td>
                            <td style={tdStyle}>{(item.relative_frequency * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Dim 2: Markov Chain & Pair Co-occurrences */}
              {details.top_digit_pairs && (
                <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ fontWeight: 700, color: "var(--accent-purple)", fontSize: "0.95rem", marginBottom: "0.8rem" }}>
                    <span>🔄 Dim 2: Markov & Digit Pairs (25%)</span>
                  </div>
                  <div style={tableWrapperStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={tableHeaderRowStyle}>
                          <th style={thStyle}>Pair</th>
                          <th style={thStyle}>Occurrences</th>
                          <th style={thStyle}>Lift Factor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.top_digit_pairs.slice(0, 5).map((item: any) => (
                          <tr key={item.pair} style={trStyle}>
                            <td style={{ ...tdStyle, fontWeight: 700, color: "var(--accent-cyan)" }}>({item.pair})</td>
                            <td style={tdStyle}>{item.count}</td>
                            <td style={{ ...tdStyle, color: "#4ade80", fontWeight: 700 }}>{item.lift ? `${item.lift}x` : "1.0x"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Dim 3: Poisson Gap Overdue Index */}
              {details.gaps && (
                <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: "0.95rem", marginBottom: "0.8rem" }}>
                    <span>⏳ Dim 3: Poisson Gap Overdue (20%)</span>
                  </div>
                  <div style={tableWrapperStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={tableHeaderRowStyle}>
                          <th style={thStyle}>Digit</th>
                          <th style={thStyle}>Current Gap</th>
                          <th style={thStyle}>Recovery Index</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(details.gaps || {})
                          .sort((a: any, b: any) => (b[1]?.recovery_index || 0) - (a[1]?.recovery_index || 0))
                          .slice(0, 5)
                          .map(([digit, gapInfo]: [string, any]) => (
                            <tr key={digit} style={trStyle}>
                              <td style={{ ...tdStyle, fontWeight: 700, color: "#f59e0b" }}>{digit}</td>
                              <td style={tdStyle}>{gapInfo.current_gap} draws</td>
                              <td style={{ ...tdStyle, color: gapInfo.recovery_index > 1.0 ? "#f87171" : "var(--text-secondary)", fontWeight: 700 }}>
                                {gapInfo.recovery_index}x
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Dim 4: Distribution Balance */}
              <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontWeight: 700, color: "#4ade80", fontSize: "0.95rem", marginBottom: "0.8rem" }}>
                  <span>📊 Dim 4: Distribution Balance (15%)</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Odd / Even Ratio</div>
                    <div className="chart-bar-container">
                      <div className="chart-bar-row">
                        <span className="chart-bar-label">Odd</span>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill" style={{ width: `${details.odd_percentage || 50}%` }} />
                        </div>
                        <span className="chart-bar-value">{details.odd_percentage || 50}%</span>
                      </div>
                      <div className="chart-bar-row">
                        <span className="chart-bar-label">Even</span>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill" style={{ width: `${details.even_percentage || 50}%` }} />
                        </div>
                        <span className="chart-bar-value">{details.even_percentage || 50}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>High (5-9) / Low (0-4) Ratio</div>
                    <div className="chart-bar-container">
                      <div className="chart-bar-row">
                        <span className="chart-bar-label">High</span>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill" style={{ width: `${details.high_percentage || 50}%` }} />
                        </div>
                        <span className="chart-bar-value">{details.high_percentage || 50}%</span>
                      </div>
                      <div className="chart-bar-row">
                        <span className="chart-bar-label">Low</span>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill" style={{ width: `${details.low_percentage || 50}%` }} />
                        </div>
                        <span className="chart-bar-value">{details.low_percentage || 50}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Helper safe date formatter for Safari/iOS compatibility
function formatSafeDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const cleanStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// Helper badge color functions
function getStatusBadgeStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "6px",
    WebkitTextFillColor: "currentColor",
  };

  if (status === "COMPLETED") {
    return { ...base, background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.4)" };
  }
  if (status === "FAILED") {
    return { ...base, background: "rgba(239, 68, 68, 0.2)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.4)" };
  }
  return { ...base, background: "rgba(255, 215, 0, 0.15)", color: "#ffd700", border: "1px solid rgba(255, 215, 0, 0.3)" };
}

// Styling Objects

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: 800,
  background: "linear-gradient(135deg, #ffffff 40%, #ffd700 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  color: "var(--text-secondary)",
};

const layoutGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "350px 1fr",
  gap: "1.5rem",
  alignItems: "start",
};

const leftPanelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const rightPanelStyle: React.CSSProperties = {
  flex: 1,
};

const panelCardStyle: React.CSSProperties = {
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
  border: "1px solid rgba(255, 215, 0, 0.12)",
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: "1.15rem",
  fontWeight: 800,
  color: "#ffd700",
  WebkitTextFillColor: "#ffd700",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const formRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const formColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
};

const emptyTextStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "0.9rem",
  textAlign: "center",
  padding: "1rem 0",
};

const historyListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.6rem",
  maxHeight: "380px",
  overflowY: "auto",
};

const historyItemStyle: React.CSSProperties = {
  background: "rgba(255, 215, 0, 0.03)",
  border: "1px solid rgba(255, 215, 0, 0.12)",
  borderRadius: "10px",
  padding: "0.85rem",
  cursor: "pointer",
  transition: "var(--transition-smooth)",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
};

const selectedHistoryItemStyle: React.CSSProperties = {
  ...historyItemStyle,
  background: "linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(245, 158, 11, 0.1))",
  borderColor: "#ffd700",
  boxShadow: "0 0 15px rgba(255, 215, 0, 0.3)",
};

const historyItemHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const historyItemTitleStyle: React.CSSProperties = {
  fontSize: "0.92rem",
  fontWeight: 800,
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
};

const historyItemDateStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "#cbd5e1",
  WebkitTextFillColor: "#cbd5e1",
  marginTop: "0.3rem",
};

const resultsPanelCardStyle: React.CSSProperties = {
  padding: "2.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const resultsHeaderStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border-light)",
  paddingBottom: "1rem",
};

const resultsTitleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 800,
  background: "linear-gradient(135deg, #fff, var(--text-secondary))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  marginTop: "0.25rem",
};

const resultsSubTitleStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  color: "var(--text-secondary)",
  marginTop: "0.25rem",
};

const resultsGameBadgeStyle: React.CSSProperties = {
  background: "var(--accent-gradient)",
  color: "#050409",
  fontSize: "0.7rem",
  fontWeight: 800,
  padding: "2px 8px",
  borderRadius: "4px",
};

const resultsBodyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const summaryBoxStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-md)",
  padding: "1.25rem",
};

const subPanelTitleStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "var(--text-secondary)",
  borderLeft: "3px solid var(--accent-cyan)",
  paddingLeft: "0.5rem",
};

const tableWrapperStyle: React.CSSProperties = {
  width: "100%",
};

const tableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  textAlign: "left",
};

const tableHeaderRowStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border-light)",
};

const thStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: "0.85rem",
  fontWeight: 600,
  padding: "0.75rem",
  textTransform: "uppercase",
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
};

const tdStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: "0.95rem",
  padding: "0.75rem",
};

const resultsPlaceholderStyle: React.CSSProperties = {
  padding: "4rem 2rem",
  textAlign: "center",
  color: "var(--text-secondary)",
  fontSize: "1.05rem",
};

const errorStyle: React.CSSProperties = {
  color: "hsl(0, 80%, 75%)",
  padding: "2rem",
  textAlign: "center",
};
