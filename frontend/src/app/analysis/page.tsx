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
  const [gameCode, setGameCode] = useState("THAI");
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
    if (!confirm("ต้องการลบประวัติการวิเคราะห์นี้ใช่หรือไม่?")) {
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
    if (!confirm(`ต้องการลบประวัติการวิเคราะห์ที่เลือกทั้งหมด ${selectedJobIds.length} รายการใช่หรือไม่?`)) {
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
                    <option value="THAI">Thai Government Lottery</option>
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
                {isSubmitting ? "Calculating..." : "🔮 Run Model"}
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
              🔮 Select a model run from the history or start a new analysis to visualize statistics.
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
          {/* Recommended 6-Digit Numbers */}
          {details.best_analyzed_6d?.length > 0 && (
            <div
              className="glass-panel"
              style={{
                background: "rgba(102, 126, 234, 0.08)",
                border: "1px solid rgba(102, 126, 234, 0.2)",
                padding: "1.5rem",
                borderRadius: "10px",
              }}
            >
              <h4 style={{ ...subPanelTitleStyle, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, fontSize: "1.1rem" }}>
                🔮 เลขที่งวดนี้จะออกได้แก่... (เลขวิเคราะห์ทางสถิติที่ดีที่สุด 2 ชุด)
              </h4>
              
              <div style={{ marginTop: "1.2rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {details.best_analyzed_6d.slice(0, 2).map((item: any, idx: number) => (
                    <div
                      key={item.number}
                      style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        padding: "0.8rem 1.2rem",
                        borderRadius: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontFamily: "monospace",
                        fontSize: "1.3rem",
                        letterSpacing: "2px",
                      }}
                    >
                      <span style={{ color: "var(--accent-cyan)", fontWeight: "bold", display: "flex", alignItems: "center" }}>
                        ชุดที่ {idx + 1}:{" "}
                        {idx === 0 ? (
                          <>
                            <span
                              style={{
                                filter: isSet1Visible ? "none" : "blur(6px)",
                                transition: "filter 0.2s ease",
                                userSelect: isSet1Visible ? "auto" : "none",
                                marginLeft: "0.5rem",
                              }}
                            >
                              {item.number}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsSet1Visible(!isSet1Visible)}
                              style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                cursor: "pointer",
                                fontSize: "1rem",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "6px",
                                marginLeft: "0.8rem",
                                color: isSet1Visible ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.6)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s",
                              }}
                              title={isSet1Visible ? "คลิกเพื่อซ่อนตัวเลข" : "คลิกเพื่อดูตัวเลข"}
                            >
                              {isSet1Visible ? "👁️" : "🔒"}
                            </button>
                          </>
                        ) : (
                          <span style={{ marginLeft: "0.5rem" }}>{item.number}</span>
                        )}
                      </span>
                      <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                        คะแนนความถ่วงน้ำหนัก: {item.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recommended 3-Digit & 2-Digit Sets */}
          {(details.generated_3d_recommendations?.length > 0 || details.generated_2d_recommendations?.length > 0) && (
            <div
              className="glass-panel"
              style={{
                background: "rgba(102, 126, 234, 0.05)",
                border: "1px solid rgba(102, 126, 234, 0.15)",
                padding: "1.2rem",
                borderRadius: "10px",
              }}
            >
              <h4 style={{ ...subPanelTitleStyle, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                🔮 Recommended 3-Digit & 2-Digit Sets (เลขเด่นแนะนำ 3 ตัว และ 2 ตัว)
              </h4>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
                {details.generated_3d_recommendations?.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.6rem", fontWeight: "bold" }}>
                      Top 5 Synthesized 3-Digit Picks (เลขท้าย 3 ตัววิเคราะห์สังเคราะห์):
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {details.generated_3d_recommendations.map((item: any) => (
                        <div
                          key={item.number}
                          style={{
                            background: "rgba(0, 242, 254, 0.04)",
                            border: "1px dashed rgba(0, 242, 254, 0.15)",
                            padding: "0.5rem 0.8rem",
                            borderRadius: "6px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontFamily: "monospace",
                            fontSize: "1.1rem",
                            letterSpacing: "2px",
                          }}
                        >
                          <span style={{ color: "var(--accent-cyan)", fontWeight: "bold" }}>{item.number}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Score: {item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {details.generated_2d_recommendations?.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.6rem", fontWeight: "bold" }}>
                      Top 5 Synthesized 2-Digit Picks (เลขท้าย 2 ตัววิเคราะห์สังเคราะห์):
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {details.generated_2d_recommendations.map((item: any) => (
                        <div
                          key={item.number}
                          style={{
                            background: "rgba(102, 126, 234, 0.04)",
                            border: "1px dashed rgba(102, 126, 234, 0.15)",
                            padding: "0.5rem 0.8rem",
                            borderRadius: "6px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontFamily: "monospace",
                            fontSize: "1.1rem",
                            letterSpacing: "2px",
                          }}
                        >
                          <span style={{ color: "var(--accent-purple)", fontWeight: "bold" }}>{item.number}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Score: {item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          
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
                    เลข {len} ตัว
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
                  ไม่มีข้อมูลเลขท้าย {endingLength} ตัวสำหรับเงื่อนไขนี้
                </div>
              )}
            </div>
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
