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
              <div style={historyListStyle}>
                {jobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      style={isSelected ? selectedHistoryItemStyle : historyItemStyle}
                    >
                      <div style={historyItemHeaderStyle}>
                        <span style={historyItemTitleStyle}>
                          {job.analysis_type} ({job.game_code})
                        </span>
                        <span style={getStatusBadgeStyle(job.status)}>{job.status}</span>
                      </div>
                      <div style={historyItemDateStyle}>
                        Run on: {new Date(job.created_at).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
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

      {/* Render model details */}
      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "1rem" }}>Calculated Statistics</h3>

      {job.analysis_type === "FREQUENCY" && details.frequencies && (
        <div className="chart-bar-container" style={{ marginTop: "0.5rem" }}>
          {Object.entries(details.frequencies)
            .sort((a: any, b: any) => b[1] - a[1])
            .map(([digit, count]: any) => {
              const maxCount = Math.max(...(Object.values(details.frequencies) as number[]), 1);
              const percent = Math.round((count / maxCount) * 100);
              return (
                <div key={digit} className="chart-bar-row">
                  <span className="chart-bar-label">Digit {digit}</span>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="chart-bar-value">{count}</span>
                </div>
              );
            })}
        </div>
      )}

      {job.analysis_type === "PAIR" && details.pairs && (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={thStyle}>Pair</th>
                <th style={thStyle}>Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(details.pairs)
                .slice(0, 10)
                .map(([pair, count]: any) => (
                  <tr key={pair} style={trStyle}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "var(--accent-cyan)" }}>
                      {pair}
                    </td>
                    <td style={tdStyle}>{count} draws</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {job.analysis_type === "TRIPLE" && details.triplets && (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={thStyle}>Triplet</th>
                <th style={thStyle}>Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(details.triplets)
                .slice(0, 10)
                .map(([triplet, count]: any) => (
                  <tr key={triplet} style={trStyle}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "var(--accent-cyan)" }}>
                      {triplet}
                    </td>
                    <td style={tdStyle}>{count} draws</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {job.analysis_type === "DISTRIBUTION" && details.odd_even && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <h4 style={subPanelTitleStyle}>Odd / Even Ratio</h4>
            <div className="chart-bar-container" style={{ marginTop: "0.5rem" }}>
              <div className="chart-bar-row">
                <span className="chart-bar-label">Odd</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${details.odd_even.odd_percentage || 0}%` }} />
                </div>
                <span className="chart-bar-value">{details.odd_even.odd}</span>
              </div>
              <div className="chart-bar-row">
                <span className="chart-bar-label">Even</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${details.odd_even.even_percentage || 0}%` }} />
                </div>
                <span className="chart-bar-value">{details.odd_even.even}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={subPanelTitleStyle}>High / Low Ratio</h4>
            <div className="chart-bar-container" style={{ marginTop: "0.5rem" }}>
              <div className="chart-bar-row">
                <span className="chart-bar-label">High (50-99)</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${details.high_low.high_percentage || 0}%` }} />
                </div>
                <span className="chart-bar-value">{details.high_low.high}</span>
              </div>
              <div className="chart-bar-row">
                <span className="chart-bar-label">Low (00-49)</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${details.high_low.low_percentage || 0}%` }} />
                </div>
                <span className="chart-bar-value">{details.high_low.low}</span>
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
