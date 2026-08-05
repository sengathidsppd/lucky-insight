"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

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
  const [analysisType, setAnalysisType] = useState("FREQUENCY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [quotaInfo, setQuotaInfo] = useState<{ remaining: number; daily_limit: number; used_today: number }>({
    remaining: 2,
    daily_limit: 2,
    used_today: 0,
  });

  const fetchLookups = async () => {
    try {
      const resp = await apiRequest("/lotteries/games");
      const fetchedGames = resp.data || [];
      setGames(fetchedGames);
      if (fetchedGames.length > 0) {
        setGameCode(fetchedGames[0].code);
      }
    } catch (err) {
      console.error("Failed to load games lookup:", err);
    }
  };

  const fetchQuota = async () => {
    try {
      const resp = await apiRequest("/analysis/quota");
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

  const handleSaveToTracker = async (numberCode: string, category: string) => {
    try {
      await apiRequest("/tickets", {
        method: "POST",
        body: JSON.stringify({
          number_code: numberCode,
          category: category,
          lottery_type: gameCode || "LAO",
          amount_spent: 0,
          status: "PENDING",
        }),
      });
      alert(`📌 Number ${numberCode} (${category}) saved to your Personal Tracker!`);
    } catch (err: any) {
      alert("Failed to save to Tracker: " + err.message);
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
                  <select value={gameCode} onChange={(e) => setGameCode(e.target.value)}>
                    {games.map((g) => (
                      <option key={g.id} value={g.code}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                </div>

                <div style={formColStyle}>
                  <label style={labelStyle}>Model Type</label>
                  <select value={analysisType} onChange={(e) => setAnalysisType(e.target.value)}>
                    <option value="FREQUENCY">Digit Frequency</option>
                    <option value="PAIR">Winning Pairs</option>
                    <option value="TRIPLE">Winning Triplets</option>
                    <option value="DISTRIBUTION">Distribution (Odd/Even, High/Low)</option>
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
                    <span>💡</span> <span>Daily Analysis Quota: <strong>{quotaInfo.remaining} / {quotaInfo.daily_limit}</strong> runs remaining today</span>
                  </span>
                ) : (
                  <span style={{ color: "#f87171", display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(239, 68, 68, 0.12)", padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)", width: "100%" }}>
                    <span>🔒</span> <span>Daily Quota Reached: <strong>0 / {quotaInfo.daily_limit}</strong> runs remaining today</span>
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
                  ? "🔒 Quota Limit Reached (2/2)"
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
                          padding: "0.8rem",
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
                          style={{ marginRight: "0.8rem", cursor: "pointer" }}
                        />
                        <div style={{ flex: 1 }}>
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
                                  color: "rgba(255, 255, 255, 0.4)",
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
                            Run on: {new Date(job.created_at).toLocaleString()}
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
  const result = job.result;
  const [endingLength, setEndingLength] = useState(2); // default to 2-digit endings
  const [isSet1Visible, setIsSet1Visible] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ digit: string; pos: number } | null>(null);

  useEffect(() => {
    setIsSet1Visible(false);
  }, [job.id]);

  const handleSaveToTracker = async (numberCode: string, category: string) => {
    try {
      await apiRequest("/tickets", {
        method: "POST",
        body: JSON.stringify({
          number_code: numberCode,
          category: category,
          lottery_type: job.game_code || "LAO",
          amount_spent: 0,
          status: "PENDING",
        }),
      });
      alert(`📌 Number ${numberCode} (${category}) saved to your Personal Tracker!`);
    } catch (err: any) {
      alert("Failed to save to Tracker: " + err.message);
    }
  };

  const handleSaveAllToTracker = async () => {
    const numbers: string[] = [];
    if (details.best_analyzed_6d?.[0]?.number) {
      numbers.push(details.best_analyzed_6d[0].number);
    }
    if (details.generated_4d_recommendations?.[0]?.number) {
      numbers.push(details.generated_4d_recommendations[0].number);
    }
    if (details.generated_3d_recommendations?.[0]?.number) {
      numbers.push(details.generated_3d_recommendations[0].number);
    }
    if (details.generated_2d_recommendations?.[0]?.number) {
      numbers.push(details.generated_2d_recommendations[0].number);
    }

    if (numbers.length === 0) {
      alert("No recommendation numbers available to save.");
      return;
    }

    const combinedCode = numbers.join(", ");
    try {
      await apiRequest("/tickets", {
        method: "POST",
        body: JSON.stringify({
          number_code: combinedCode,
          category: "SET",
          lottery_type: job.game_code || "LAO",
          amount_spent: 0,
          status: "PENDING",
        }),
      });
      alert(`📌 Combined Lucky Set (${combinedCode}) saved as 1 Ticket to your Personal Tracker!`);
    } catch (err: any) {
      alert("Failed to save to Tracker: " + err.message);
    }
  };

  if (!result) return null;
  const details = result.result_data;

  return (
    <div style={resultsBodyStyle}>


      {job.analysis_type === "FREQUENCY" && details.top_single_digits && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Recommended Picks (6D, 4D, 3D, 2D) */}
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
              <button
                type="button"
                onClick={handleSaveAllToTracker}
                style={{
                  padding: "0.6rem 1.2rem",
                  background: "linear-gradient(135deg, var(--accent-cyan), #0284c7)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#000",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
                }}
              >
                📌 Save All to Tracker (1 Combined Ticket)
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.2rem" }}>
              {/* 6-Digit Card */}
              {details.best_analyzed_6d?.[0] && (
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "1rem 1.5rem" }}>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "bold", minWidth: "150px" }}>
                    6-Digit Pick (Top 6D)
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: "bold", fontFamily: "monospace", color: "var(--accent-cyan)", letterSpacing: "4px" }}>
                    {details.best_analyzed_6d[0].number}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "right" }}>
                      Score: {details.best_analyzed_6d[0].score}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveToTracker(details.best_analyzed_6d[0].number, "6D")}
                      style={{
                        padding: "0.4rem 0.8rem",
                        background: "rgba(14, 165, 233, 0.15)",
                        border: "1px solid rgba(14, 165, 233, 0.4)",
                        borderRadius: "6px",
                        color: "var(--accent-cyan)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      📌 Save to Tracker
                    </button>
                  </div>
                </div>
              )}

              {/* 4-Digit Card */}
              {(() => {
                const top4dItem = details.generated_4d_recommendations?.[0] || null;

                const top3dItem = details.generated_3d_recommendations?.[0] || null;
                const top2dItem = details.generated_2d_recommendations?.[0] || null;


                return (
                  <>
                    {top4dItem && (
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "1rem 1.5rem" }}>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "bold", minWidth: "150px" }}>
                          4-Digit Pick (Top 4D)
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "bold", fontFamily: "monospace", color: "var(--accent-purple)", letterSpacing: "4px" }}>
                          {top4dItem.number}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "right" }}>
                            Score: {top4dItem.score}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveToTracker(top4dItem.number, "4D")}
                            style={{
                              padding: "0.4rem 0.8rem",
                              background: "rgba(14, 165, 233, 0.15)",
                              border: "1px solid rgba(14, 165, 233, 0.4)",
                              borderRadius: "6px",
                              color: "var(--accent-cyan)",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                          >
                            📌 Save to Tracker
                          </button>
                        </div>
                      </div>
                    )}

                    {top3dItem && (
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "1rem 1.5rem" }}>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "bold", minWidth: "150px" }}>
                          3-Digit Pick (Top 3D)
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "bold", fontFamily: "monospace", color: "var(--accent-cyan)", letterSpacing: "4px" }}>
                          {top3dItem.number}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "right" }}>
                            Score: {top3dItem.score}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveToTracker(top3dItem.number, "3D")}
                            style={{
                              padding: "0.4rem 0.8rem",
                              background: "rgba(14, 165, 233, 0.15)",
                              border: "1px solid rgba(14, 165, 233, 0.4)",
                              borderRadius: "6px",
                              color: "var(--accent-cyan)",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                          >
                            📌 Save to Tracker
                          </button>
                        </div>
                      </div>
                    )}

                    {top2dItem && (
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "1rem 1.5rem" }}>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "bold", minWidth: "150px" }}>
                          2-Digit Pick (Top 2D)
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "bold", fontFamily: "monospace", color: "var(--accent-purple)", letterSpacing: "4px" }}>
                          {top2dItem.number}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "right" }}>
                            Score: {top2dItem.score}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveToTracker(top2dItem.number, "2D")}
                            style={{
                              padding: "0.4rem 0.8rem",
                              background: "rgba(14, 165, 233, 0.15)",
                              border: "1px solid rgba(14, 165, 233, 0.4)",
                              borderRadius: "6px",
                              color: "var(--accent-cyan)",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                          >
                            📌 Save to Tracker
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>


            {/* Custom Interactive Trend Analysis Section */}
            {(() => {
              const recentDrawsList = details.recent_draws || (details.best_analyzed_6d || []).map((d: any) => d.number) || [];
              const trendData = (recentDrawsList || [])
                .slice(0, 15)
                .reverse() // oldest to newest (left to right)
                .map((draw: string, idx: number) => {
                  const cleaned = draw.replace(/\D/g, "");
                  if (cleaned.length === 0) return null;
                  const digits = cleaned.split("").map(c => parseInt(c, 10));
                  const mid = Math.ceil(digits.length / 2);
                  const frontAvg = digits.slice(0, mid).reduce((a, b) => a + b, 0) / (mid || 1);
                  const backAvg = digits.slice(mid).reduce((a, b) => a + b, 0) / (digits.length - mid || 1);
                  return {
                    label: `Draw ${idx + 1}`,
                    number: draw,
                    frontAvg,
                    backAvg,
                  };
                })
                .filter(Boolean) as any[];

              const frontPoints = trendData.map((d, idx) => {
                const x = 50 + (idx * 410) / Math.max(1, trendData.length - 1);
                const y = 20 + 150 * (1 - d.frontAvg / 9);
                return { x, y };
              });

              const backPoints = trendData.map((d, idx) => {
                const x = 50 + (idx * 410) / Math.max(1, trendData.length - 1);
                const y = 20 + 150 * (1 - d.backAvg / 9);
                return { x, y };
              });

              const dFront = trendData.length > 0
                ? "M " + frontPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")
                : "";
              const dBack = trendData.length > 0
                ? "M " + backPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")
                : "";

              return (
                <>
                  {/* Trend Multi-Line Chart Section */}
                  {trendData.length > 0 && (
                    <div
                      className="glass-panel"
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        padding: "1.2rem",
                        borderRadius: "10px",
                        marginTop: "2rem",
                      }}
                    >
                      <h4 style={{ ...subPanelTitleStyle, color: "var(--accent-cyan)", marginBottom: "0.8rem", fontWeight: "bold" }}>
                        Digit Distribution Trend (Front vs Back Half Average - Last 15 Draws)
                      </h4>
                      
                      {/* Legend */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1.5rem", fontSize: "0.8rem", marginBottom: "0.8rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <div style={{ width: "12px", height: "4px", background: "linear-gradient(90deg, #f59e0b, #ec4899)", borderRadius: "2px" }} />
                          <span style={{ color: "#fff", fontWeight: "bold" }}>Front-Half Average</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <div style={{ width: "12px", height: "4px", background: "linear-gradient(90deg, #d946ef, #8b5cf6)", borderRadius: "2px" }} />
                          <span style={{ color: "#fff", fontWeight: "bold" }}>Back-Half Average</span>
                        </div>
                      </div>
                      
                      <div style={{ position: "relative", width: "100%", height: "220px" }}>
                        <svg viewBox="0 0 500 220" style={{ width: "100%", height: "100%" }}>
                          <defs>
                            <filter id="chartShadow" x="-10%" y="-10%" width="120%" height="120%">
                              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
                            </filter>
                            <linearGradient id="frontGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                            <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#d946ef" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>

                          {/* Grids and Axes (Y values 0 to 9) */}
                          {[0, 2, 4, 6, 8, 9].map((yVal) => {
                            const y = 20 + 150 * (1 - yVal / 9);
                            return (
                              <g key={yVal}>
                                <line x1="45" y1={y} x2="470" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                <text x="35" y={y + 3} fill="var(--text-secondary)" fontSize="10" textAnchor="end">
                                  {yVal}
                                </text>
                              </g>
                            );
                          })}

                          {/* Vertical Gridlines at Draw points */}
                          {trendData.map((d, idx) => {
                            const x = 50 + (idx * 410) / Math.max(1, trendData.length - 1);
                            return (
                              <line key={idx} x1={x} y1="20" x2={x} y2="170" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                            );
                          })}

                          {/* Trend Lines */}
                          <path
                            d={dFront}
                            fill="none"
                            stroke="url(#frontGrad)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#chartShadow)"
                          />
                          <path
                            d={dBack}
                            fill="none"
                            stroke="url(#backGrad)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#chartShadow)"
                          />

                          {/* Interactive Nodes / Dots */}
                          {trendData.map((d, idx) => {
                            const x = 50 + (idx * 410) / Math.max(1, trendData.length - 1);
                            const yF = 20 + 150 * (1 - d.frontAvg / 9);
                            const yB = 20 + 150 * (1 - d.backAvg / 9);
                            
                            return (
                              <g key={idx}>
                                {/* Front Node */}
                                <circle
                                  cx={x}
                                  cy={yF}
                                  r="5"
                                  fill="#f59e0b"
                                  stroke="#fff"
                                  strokeWidth="1.5"
                                  style={{ transition: "transform 0.1s ease", transformOrigin: `${x}px ${yF}px`, cursor: "pointer" }}
                                >
                                  <title>{`Draw: ${d.number}\nFront-Half Avg: ${d.frontAvg.toFixed(2)}`}</title>
                                </circle>

                                {/* Back Node */}
                                <circle
                                  cx={x}
                                  cy={yB}
                                  r="5"
                                  fill="#d946ef"
                                  stroke="#fff"
                                  strokeWidth="1.5"
                                  style={{ transition: "transform 0.1s ease", transformOrigin: `${x}px ${yB}px`, cursor: "pointer" }}
                                >
                                  <title>{`Draw: ${d.number}\nBack-Half Avg: ${d.backAvg.toFixed(2)}`}</title>
                                </circle>

                                {/* X-axis Text Label */}
                                {(idx % 2 === 0 || idx === trendData.length - 1) && (
                                  <text x={x} y="192" fill="var(--text-secondary)" fontSize="8.5" textAnchor="middle" transform={`rotate(-15, ${x}, 192)`}>
                                    {d.number}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Heatmap Section */}
                  {details.position_frequencies?.length > 0 && (
                    <div
                      className="glass-panel"
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        padding: "1.2rem",
                        borderRadius: "10px",
                        marginTop: "2rem",
                      }}
                    >
                      <h4 style={{ ...subPanelTitleStyle, color: "var(--accent-cyan)", marginBottom: "0.8rem", fontWeight: "bold" }}>
                        Position-Specific Digit Heatmap
                      </h4>
                      
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "0.5rem", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)", fontSize: "0.8rem" }}>Digit</th>
                              {[1, 2, 3, 4, 5, 6].map((pos) => (
                                <th key={pos} style={{ padding: "0.5rem", border: "1px solid rgba(255,255,255,0.08)", color: "var(--accent-cyan)", fontSize: "0.8rem" }}>
                                  Slot {pos}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                              <tr key={digit}>
                                <td style={{ padding: "0.4rem", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center", fontWeight: "bold", fontSize: "0.9rem", color: "#fff", background: "rgba(255,255,255,0.02)" }}>
                                  {digit}
                                </td>
                                {[0, 1, 2, 3, 4, 5].map((posIndex) => {
                                  const freq = details.position_frequencies[posIndex]?.[String(digit)] || 0;
                                  const percent = (freq * 100).toFixed(1);
                                  const opacity = Math.min(0.85, freq * 4.0);
                                  const isHovered = hoveredCell?.digit === String(digit) && hoveredCell?.pos === posIndex;
                                  
                                  return (
                                    <td
                                      key={posIndex}
                                      onMouseEnter={() => setHoveredCell({ digit: String(digit), pos: posIndex })}
                                      onMouseLeave={() => setHoveredCell(null)}
                                      style={{
                                        padding: "0.6rem",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        textAlign: "center",
                                        fontSize: "0.85rem",
                                        fontWeight: "bold",
                                        color: isHovered || opacity > 0.45 ? "#000" : "#fff",
                                        background: freq > 0 ? `rgba(0, 242, 254, ${opacity})` : "transparent",
                                        transition: "all 0.15s ease",
                                        cursor: "pointer",
                                        boxShadow: isHovered ? "inset 0 0 0 2px var(--accent-purple)" : "none",
                                      }}
                                      title={`Slot ${posIndex + 1}: Digit ${digit} (Frequency: ${percent}%)`}
                                    >
                                      {percent}%
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
      )}

      {job.analysis_type === "PAIR" && details.top_digit_pairs && (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={thStyle}>Digit Pair</th>
                <th style={thStyle}>Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {details.top_digit_pairs.map((item: any) => (
                <tr key={item.pair} style={trStyle}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "var(--accent-cyan)" }}>
                    ({item.pair})
                  </td>
                  <td style={tdStyle}>{item.count} times</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {job.analysis_type === "TRIPLE" && details.top_digit_triplets && (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={thStyle}>Digit Triplet</th>
                <th style={thStyle}>Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {details.top_digit_triplets.map((item: any) => (
                <tr key={item.triplet} style={trStyle}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "var(--accent-cyan)" }}>
                    ({item.triplet})
                  </td>
                  <td style={tdStyle}>{item.count} times</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {job.analysis_type === "DISTRIBUTION" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <h4 style={subPanelTitleStyle}>Odd / Even Ratio</h4>
            <div className="chart-bar-container" style={{ marginTop: "0.5rem" }}>
              <div className="chart-bar-row">
                <span className="chart-bar-label">Odd</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${details.odd_percentage || 0}%` }} />
                </div>
                <span className="chart-bar-value">{details.odd_percentage || 0}%</span>
              </div>
              <div className="chart-bar-row">
                <span className="chart-bar-label">Even</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${details.even_percentage || 0}%` }} />
                </div>
                <span className="chart-bar-value">{details.even_percentage || 0}%</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={subPanelTitleStyle}>High / Low Ratio</h4>
            <div className="chart-bar-container" style={{ marginTop: "0.5rem" }}>
              <div className="chart-bar-row">
                <span className="chart-bar-label">High (5-9)</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${details.high_percentage || 0}%` }} />
                </div>
                <span className="chart-bar-value">{details.high_percentage || 0}%</span>
              </div>
              <div className="chart-bar-row">
                <span className="chart-bar-label">Low (0-4)</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${details.low_percentage || 0}%` }} />
                </div>
                <span className="chart-bar-value">{details.low_percentage || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Helper badge color functions
function getStatusBadgeStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "4px",
  };

  if (status === "COMPLETED") {
    return { ...base, background: "rgba(80, 224, 120, 0.15)", color: "hsl(120, 80%, 75%)" };
  }
  if (status === "FAILED") {
    return { ...base, background: "rgba(224, 80, 80, 0.15)", color: "hsl(0, 80%, 75%)" };
  }
  return { ...base, background: "rgba(255, 255, 255, 0.05)", color: "var(--text-secondary)" };
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
  background: "linear-gradient(135deg, #fff, var(--text-secondary))",
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
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "var(--text-primary)",
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
  gap: "0.5rem",
  maxHeight: "350px",
  overflowY: "auto",
};

const historyItemStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-md)",
  padding: "0.75rem",
  cursor: "pointer",
  transition: "var(--transition-smooth)",
};

const selectedHistoryItemStyle: React.CSSProperties = {
  ...historyItemStyle,
  background: "rgba(255,255,255,0.06)",
  borderColor: "var(--accent-cyan)",
};

const historyItemHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const historyItemTitleStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 700,
  color: "var(--text-primary)",
};

const historyItemDateStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-muted)",
  marginTop: "0.25rem",
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
