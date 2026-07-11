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

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const resp = await apiRequest("/dashboard/summary");
      setData(resp.data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={spinnerStyle} />
        <span>Loading stats...</span>
      </div>
    );
  }

  if (error) {
    return <div style={errorContainerStyle}>Error: {error}</div>;
  }

  if (!data) return null;

  // Find max count to scale progress bars correctly
  const maxCategoryCount = Math.max(...data.records_by_category.map(c => c.count), 1);
  const maxSourceCount = Math.max(...data.records_by_source.map(s => s.count), 1);

  return (
    <div style={containerStyle}>
      {/* Welcome header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>Welcome back, {user?.first_name || "friend"}!</h1>
        <p style={subtitleStyle}>Here is your lucky numbers summary for today.</p>
      </div>

      {/* Stats Cards */}
      <div style={cardRowStyle}>
        <div className="glass-panel" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardIconStyle}>🔢</span>
            <span style={cardLabelStyle}>Total Records</span>
          </div>
          <div style={cardValueStyle}>{data.total_records}</div>
        </div>

        <div className="glass-panel" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardIconStyle}>💖</span>
            <span style={cardLabelStyle}>Favorites</span>
          </div>
          <div style={{ ...cardValueStyle, color: "#ff4d88" }}>
            {data.total_favorites}
          </div>
        </div>

        <div className="glass-panel" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardIconStyle}>📊</span>
            <span style={cardLabelStyle}>Distribution Type</span>
          </div>
          <div style={cardValueStyle}>{data.records_by_category.length}</div>
        </div>
      </div>

      {/* Chart and distribution panels */}
      <div style={gridStyle}>
        {/* Category distribution */}
        <div className="glass-panel" style={panelStyle}>
          <h3 style={panelTitleStyle}>Records by Category</h3>
          {data.records_by_category.length === 0 ? (
            <div style={emptyTextStyle}>No category data available.</div>
          ) : (
            <div className="chart-bar-container">
              {data.records_by_category.map((cat) => {
                const percent = Math.round((cat.count / maxCategoryCount) * 100);
                return (
                  <div key={cat.category_name} className="chart-bar-row">
                    <span className="chart-bar-label">{cat.category_name}</span>
                    <div className="chart-bar-track">
                      <div className="chart-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="chart-bar-value">{cat.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Source distribution */}
        <div className="glass-panel" style={panelStyle}>
          <h3 style={panelTitleStyle}>Records by Source</h3>
          {data.records_by_source.length === 0 ? (
            <div style={emptyTextStyle}>No source data available.</div>
          ) : (
            <div className="chart-bar-container">
              {data.records_by_source.map((src) => {
                const percent = Math.round((src.count / maxSourceCount) * 100);
                return (
                  <div key={src.source_name} className="chart-bar-row">
                    <span className="chart-bar-label">{src.source_name}</span>
                    <div className="chart-bar-track">
                      <div className="chart-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="chart-bar-value">{src.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Records */}
        <div className="glass-panel" style={{ ...panelStyle, gridColumn: "span 2" }}>
          <div style={panelHeaderStyle}>
            <h3 style={panelTitleStyle}>Recent Recorded Numbers</h3>
            <Link href="/records" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
              View All
            </Link>
          </div>

          {data.recent_records.length === 0 ? (
            <div style={emptyTextStyle}>You haven't recorded any numbers yet. Go to Number Records to add some!</div>
          ) : (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderRowStyle}>
                    <th style={thStyle}>Number</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Source</th>
                    <th style={thStyle}>Tags</th>
                    <th style={thStyle}>Recorded At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_records.map((rec) => (
                    <tr key={rec.id} style={trStyle}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: "var(--accent-cyan)", fontSize: "1.1rem" }}>
                        {rec.number}
                        {rec.is_favorite && <span style={{ marginLeft: "0.5rem" }}>💖</span>}
                      </td>
                      <td style={tdStyle}>{rec.category?.name || "General"}</td>
                      <td style={tdStyle}>{rec.source?.name || "N/A"}</td>
                      <td style={tdStyle}>
                        <div style={tagsListStyle}>
                          {rec.tags.map((tag: any) => (
                            <span key={tag.id} style={tagStyle}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {new Date(rec.recorded_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

const cardRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "1.5rem",
};

const cardStyle: React.CSSProperties = {
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  color: "var(--text-secondary)",
};

const cardIconStyle: React.CSSProperties = {
  fontSize: "1.2rem",
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 500,
};

const cardValueStyle: React.CSSProperties = {
  fontSize: "2.2rem",
  fontWeight: 800,
  color: "var(--text-primary)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1.5rem",
};

const panelStyle: React.CSSProperties = {
  padding: "1.75rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "var(--text-primary)",
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const emptyTextStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "0.95rem",
  textAlign: "center",
  padding: "2rem 0",
};

const tableWrapperStyle: React.CSSProperties = {
  width: "100%",
  overflowX: "auto",
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
  padding: "0.75rem 1rem",
  textTransform: "uppercase",
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
};

const tdStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: "0.95rem",
  padding: "0.75rem 1rem",
};

const tagsListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.25rem",
};

const tagStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid var(--border-light)",
  borderRadius: "4px",
  color: "var(--text-secondary)",
  fontSize: "0.75rem",
  padding: "2px 6px",
};

const loadingContainerStyle: React.CSSProperties = {
  display: "flex",
  height: "50vh",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-secondary)",
  gap: "0.75rem",
};

const spinnerStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  border: "3px solid rgba(255, 255, 255, 0.1)",
  borderTopColor: "var(--accent-cyan)",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const errorContainerStyle: React.CSSProperties = {
  color: "hsl(0, 80%, 75%)",
  padding: "2rem",
  textAlign: "center",
};
