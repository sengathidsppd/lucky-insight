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
  const [gameCode, setGameCode] = useState("THAI_NATIONAL");
  const [analysisType, setAnalysisType] = useState("FREQUENCY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchLookups = async () => {
    try {
      const resp = await apiRequest("/lotteries/games");
      setGames(resp.data);
    } catch (err) {
      console.error("Failed to load games lookup:", err);
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
          date_from: startDate ? new Date(startDate + "T00:00:00").toISOString() : undefined,
          date_to: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
        },
      };

      const resp = await apiRequest("/analysis/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Reload jobs
      await fetchJobs();

      // Automatically select the newly created job
      const newJob = resp.data;
      if (newJob) {
        setSelectedJob(newJob);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start analysis job.");
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
                    <option value="THAI_NATIONAL">Thai National Lottery</option>
                    <option value="LAO">Lao Government Lottery</option>
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

              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Calculating..." : " Analyze Data"}
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
              <div style={resultsHeaderStyle}>
                <div>
                  <span style={resultsGameBadgeStyle}>{selectedJob.game_code}</span>
                  <h2 style={resultsTitleStyle}>{selectedJob.analysis_type} Analysis</h2>
                  <p style={resultsSubTitleStyle}>
                    Status: <strong style={{ color: "var(--accent-cyan)" }}>{selectedJob.status}</strong>
                  </p>
                </div>
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
               Select a model run from the history or start a new analysis to visualize statistics.
            </div>
          )}
        </div>
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

  if (!result) return null;
  const details = result.result_data;

  return (
    <div style={resultsBodyStyle}>
      {/* Summary Text */}
      <div style={summaryBoxStyle}>
        <h4 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Summary Analysis</h4>
        <p style={{ fontSize: "0.95rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
          {result.explanation}
        </p>
      </div>

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
            <h4 style={{ ...subPanelTitleStyle, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, fontSize: "1.1rem" }}>
               🔮 เลขที่งวดนี้จะออกได้แก่... (Statistical Picks)
            </h4>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem", marginTop: "1.2rem" }}>
              {/* 6-Digit Card */}
              {details.best_analyzed_6d?.[0] && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: "bold" }}>
                    เลขเด่น 6 ตัว (Top 6D)
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "bold", fontFamily: "monospace", color: "var(--accent-cyan)", letterSpacing: "2px", margin: "0.5rem 0" }}>
                    {details.best_analyzed_6d[0].number}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Score: {details.best_analyzed_6d[0].score}
                  </div>
                </div>
              )}

              {/* 4-Digit Card */}
              {details.generated_4d_recommendations?.[0] && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: "bold" }}>
                    เลขเด่น 4 ตัว (Top 4D)
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "bold", fontFamily: "monospace", color: "var(--accent-purple)", letterSpacing: "2px", margin: "0.5rem 0" }}>
                    {details.generated_4d_recommendations[0].number}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Score: {details.generated_4d_recommendations[0].score}
                  </div>
                </div>
              )}

              {/* 3-Digit Card */}
              {details.generated_3d_recommendations?.[0] && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: "bold" }}>
                    เลขเด่น 3 ตัว (Top 3D)
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "bold", fontFamily: "monospace", color: "var(--accent-cyan)", letterSpacing: "2px", margin: "0.5rem 0" }}>
                    {details.generated_3d_recommendations[0].number}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Score: {details.generated_3d_recommendations[0].score}
                  </div>
                </div>
              )}

              {/* 2-Digit Card */}
              {details.generated_2d_recommendations?.[0] && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: "bold" }}>
                    เลขเด่น 2 ตัว (Top 2D)
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "bold", fontFamily: "monospace", color: "var(--accent-purple)", letterSpacing: "2px", margin: "0.5rem 0" }}>
                    {details.generated_2d_recommendations[0].number}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Score: {details.generated_2d_recommendations[0].score}
                  </div>
                </div>
              )}
            </div>
          </div>

          
          <div>
            <h4 style={subPanelTitleStyle}>Analyze Digit Endings</h4>
            {/* Tab Buttons for Ending Lengths 1 to 6 */}
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
              {[6, 5, 4, 3, 2, 1].map((len) => {
                const hasData = !!details[`top_${len}digit_endings`]?.length;
                const isActive = endingLength === len;
                return (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setEndingLength(len)}
                    disabled={!hasData}
                    className={`btn ${isActive ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      opacity: hasData ? 1 : 0.4,
                      cursor: hasData ? "pointer" : "not-allowed",
                      border: isActive ? "1px solid var(--accent-cyan)" : "1px solid transparent",
                      background: isActive ? "var(--gradient-cyan-purple)" : "rgba(255, 255, 255, 0.05)",
                      color: "#fff",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {len}-Digit Number
                  </button>
                );
              })}
            </div>

            {/* Render selected ending length bar charts */}
            <div className="chart-bar-container" style={{ marginTop: "0.5rem" }}>
              {(details[`top_${endingLength}digit_endings`] || []).map((item: any) => {
                const endingsList = details[`top_${endingLength}digit_endings`] || [];
                const maxCount = Math.max(...endingsList.map((d: any) => d.count), 1);
                const percent = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.combination} className="chart-bar-row">
                    <span className="chart-bar-label">Ending {item.combination}</span>
                    <div className="chart-bar-track">
                      <div className="chart-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="chart-bar-value">{item.count}</span>
                  </div>
                );
              })}
              {(!details[`top_${endingLength}digit_endings`] || details[`top_${endingLength}digit_endings`].length === 0) && (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "1rem" }}>
                  No {endingLength}-digit ending data for this condition
                </div>
              )}
            </div>

            {/* Custom Interactive Trend Analysis Section */}
            {(() => {
              const recentDrawsList = details.recent_draws || (details.best_analyzed_6d || []).map((d: any) => d.number) || [];
              const trendData = (recentDrawsList || [])
                .slice(0, 10)
                .reverse() // oldest to newest (left to right)
                .map((draw: string, idx: number) => {
                  const cleaned = draw.replace(/\D/g, "");
                  if (cleaned.length === 0) return null;
                  const total = cleaned.length;
                  const odds = cleaned.split("").filter(c => parseInt(c, 10) % 2 !== 0).length;
                  const highs = cleaned.split("").filter(c => parseInt(c, 10) >= 5).length;
                  return {
                    label: `Draw ${idx + 1}`,
                    number: draw,
                    oddPercent: Math.round((odds / total) * 100),
                    highPercent: Math.round((highs / total) * 100),
                  };
                })
                .filter(Boolean) as any[];

              return (
                <>
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
                        📊 Position-Specific Digit Heatmap (ตารางความร้อนความถี่แยกหลัก 0-9)
                      </h4>
                      
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "0.5rem", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)", fontSize: "0.8rem" }}>Digit</th>
                              {[1, 2, 3, 4, 5, 6].map((pos) => (
                                <th key={pos} style={{ padding: "0.5rem", border: "1px solid rgba(255,255,255,0.08)", color: "var(--accent-cyan)", fontSize: "0.8rem" }}>
                                  หลักที่ {pos}
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
                                      title={`หลักที่ ${posIndex + 1}: เลข ${digit} (ความถี่ ${percent}%)`}
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

                  {/* Trend Line Chart Section */}
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
                        📈 Digit Distribution Trend (กราฟแนวโน้มสัดส่วนเลขคู่-คี่ และ สูง-ต่ำ ย้อนหลัง 10 งวด)
                      </h4>
                      
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <div style={{ width: "12px", height: "12px", background: "var(--accent-cyan)", borderRadius: "2px" }} />
                          <span style={{ color: "#fff" }}>Odd (เลขคี่) %</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <div style={{ width: "12px", height: "12px", background: "var(--accent-purple)", borderRadius: "2px" }} />
                          <span style={{ color: "#fff" }}>High (เลขสูง) %</span>
                        </div>
                      </div>
                      
                      <div style={{ position: "relative", width: "100%", height: "220px" }}>
                        <svg viewBox="0 0 500 220" style={{ width: "100%", height: "100%" }}>
                          {/* Grids and Axes */}
                          {[0, 25, 50, 75, 100].map((yVal) => {
                            const y = 20 + 150 * (1 - yVal / 100);
                            return (
                              <g key={yVal}>
                                <line x1="40" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                <text x="30" y={y + 4} fill="var(--text-secondary)" fontSize="10" textAnchor="end">
                                  {yVal}%
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* Draw labels and data points */}
                          {trendData.map((d, idx) => {
                            const x = 40 + (idx * 440) / (trendData.length - 1);
                            return (
                              <g key={idx}>
                                <line x1={x} y1="20" x2={x} y2="170" stroke="rgba(255,255,255,0.04)" />
                                <text x={x} y="195" fill="var(--text-secondary)" fontSize="9" textAnchor="middle" transform={`rotate(-15, ${x}, 195)`}>
                                  {d.number}
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* Line for Odd % */}
                          <path
                            d={trendData.reduce((acc, d, idx) => {
                              const x = 40 + (idx * 440) / (trendData.length - 1);
                              const y = 20 + 150 * (1 - d.oddPercent / 100);
                              return acc + `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                            }, "")}
                            fill="none"
                            stroke="var(--accent-cyan)"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          
                          {/* Line for High % */}
                          <path
                            d={trendData.reduce((acc, d, idx) => {
                              const x = 40 + (idx * 440) / (trendData.length - 1);
                              const y = 20 + 150 * (1 - d.highPercent / 100);
                              return acc + `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                            }, "")}
                            fill="none"
                            stroke="var(--accent-purple)"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          
                          {/* Glowing Data Dots */}
                          {trendData.map((d, idx) => {
                            const x = 40 + (idx * 440) / (trendData.length - 1);
                            const yOdd = 20 + 150 * (1 - d.oddPercent / 100);
                            const yHigh = 20 + 150 * (1 - d.highPercent / 100);
                            
                            return (
                              <g key={idx}>
                                <circle cx={x} cy={yOdd} r="5" fill="var(--accent-cyan)" stroke="#090d16" strokeWidth="2" />
                                <circle cx={x} cy={yHigh} r="5" fill="var(--accent-purple)" stroke="#090d16" strokeWidth="2" />
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
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
