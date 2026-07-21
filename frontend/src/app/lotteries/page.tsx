"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface LotteryGame {
  id: string;
  code: string;
  name: string;
  country: string;
  frequency_description: string;
}

interface LotteryResult {
  id: string;
  game_id: string;
  draw_date: string;
  draw_number: string | null;
  first_prize: string;
  last2: string | null;
  front3: string | null;
  back3: string | null;
  created_at: string;
}

export default function LotteriesPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<LotteryGame[]>([]);
  const [selectedGameCode, setSelectedGameCode] = useState("THAI_NATIONAL");
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Admin New Result form
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [modalGameId, setModalGameId] = useState("");
  const [newDrawDate, setNewDrawDate] = useState("");
  const [newDrawNumber, setNewDrawNumber] = useState("");
  const [newFirstPrize, setNewFirstPrize] = useState("");
  const [newThreeDigits, setNewThreeDigits] = useState("");
  const [newTwoDigits, setNewTwoDigits] = useState("");

  const fetchGamesAndResults = async () => {
    setIsLoading(true);
    setError("");
    try {
      const gamesResp = await apiRequest("/lotteries/games");
      setGames(gamesResp.data);

      const selectedGame = gamesResp.data.find((g: any) => g.code === selectedGameCode);
      if (selectedGame) {
        // Fetch results for selected game code using its UUID
        const resResp = await apiRequest("/lotteries/results", {
          params: { 
            game_id: selectedGame.id,
            limit: pageSize,
            offset: currentPage * pageSize,
          },
        });
        setResults(resResp.data);
        setTotal(resResp.total);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load lottery data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGamesAndResults();
  }, [selectedGameCode, currentPage]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!modalGameId) return;

      const payload = {
        game_id: modalGameId,
        draw_date: new Date(newDrawDate).toISOString().slice(0, 10),
        draw_number: newDrawNumber || undefined,
        first_prize: newFirstPrize,
        last2: newTwoDigits || undefined,
        back3: newThreeDigits || undefined,
      };

      await apiRequest("/lotteries/results", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setIsAdminOpen(false);
      setNewDrawDate("");
      setNewDrawNumber("");
      setNewFirstPrize("");
      setNewThreeDigits("");
      setNewTwoDigits("");

      // Refresh list
      fetchGamesAndResults();
    } catch (err: any) {
      alert(err.message || "Failed to submit result.");
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm("Are you sure you want to delete this lottery result?")) {
      return;
    }
    try {
      await apiRequest(`/lotteries/results/${resultId}`, {
        method: "DELETE",
      });
      fetchGamesAndResults();
    } catch (err: any) {
      alert("Failed to delete draw result: " + err.message);
    }
  };

  const activeGame = games.find((g) => g.code === selectedGameCode);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Lottery Results History</h1>
          <p style={subtitleStyle}>Official government lottery draws and winning prizes.</p>
        </div>
        
        {user?.is_admin && (
          <button onClick={() => { setModalGameId(activeGame?.id || (games[0]?.id ?? "")); setIsAdminOpen(true); }} className="btn btn-primary">
            Add Draw Result (Admin)
          </button>
        )}
      </div>

      {/* Game Selector Tabs */}
      <div style={tabsRowStyle}>
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => { setSelectedGameCode(g.code); setCurrentPage(0); }}
            style={selectedGameCode === g.code ? activeTabStyle : tabStyle}
          >
            {g.name} ({g.country})
          </button>
        ))}
      </div>

      {/* Main Results Table */}
      {isLoading ? (
        <div style={loadingContainerStyle}>
          <div style={spinnerStyle} />
          <span>Fetching draw history...</span>
        </div>
      ) : error ? (
        <div style={errorStyle}>{error}</div>
      ) : results.length === 0 ? (
        <div className="glass-panel" style={emptyPanelStyle}>
          No results recorded yet for {activeGame?.name}.
        </div>
      ) : (
        <>
          <div style={resultsGridStyle}>
            {results.map((res) => {
              const game = games.find((g) => g.id === res.game_id);
              const threeDigits = [res.front3, res.back3].filter(Boolean).join(" / ") || "—";
              return (
                <div key={res.id} className="glass-panel" style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={cardDateStyle}>
                      📅 Draw Date: {new Date(res.draw_date).toLocaleDateString()}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={cardBadgeStyle}>{game?.code || selectedGameCode}</span>
                      {user?.is_admin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteResult(res.id);
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
                          title="Delete this draw result"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {res.draw_number && (
                    <div style={winningNumberContainerStyle}>
                      <div style={winningNumberLabelStyle}>Draw Number</div>
                      <div style={winningNumberValueStyle}>{res.draw_number}</div>
                    </div>
                  )}

                  <div style={prizesGridStyle}>
                    <div style={prizeRowStyle}>
                      <span style={prizeLabelStyle}>1st Prize</span>
                      <span style={prizeValueStyle}>{res.first_prize || "—"}</span>
                    </div>
                    <div style={prizeRowStyle}>
                      <span style={prizeLabelStyle}>3-Digit Prefix/Suffix</span>
                      <span style={prizeValueStyle}>{threeDigits}</span>
                    </div>
                    <div style={prizeRowStyle}>
                      <span style={prizeLabelStyle}>2-Digit Suffix</span>
                      <span style={prizeValueStyle}>{res.last2 || "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {total > pageSize && (
            <div style={paginationContainerStyle}>
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                style={currentPage === 0 ? disabledPageButtonStyle : pageButtonStyle}
              >
                ◀ Prev
              </button>
              
              <span style={pageInfoStyle}>
                Page {currentPage + 1} of {Math.ceil(total / pageSize)} (Total {total} draws)
              </span>
              
              <button
                disabled={(currentPage + 1) * pageSize >= total}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                style={(currentPage + 1) * pageSize >= total ? disabledPageButtonStyle : pageButtonStyle}
              >
                Next ▶
              </button>
            </div>
          )}
        </>
      )}

      {/* ADMIN SUBMIT RESULT MODAL */}
      {isAdminOpen && (
        <div style={modalBackdropStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={modalTitleStyle}>Add Lottery Result</h2>
            <form onSubmit={handleAdminSubmit} style={formStyle}>
              <div style={formColStyle}>
                <label style={labelStyle}>Lottery Game *</label>
                <select
                  value={modalGameId}
                  onChange={(e) => setModalGameId(e.target.value)}
                  required
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code === "THAI_NATIONAL" ? "Thai National Lottery" : g.code === "LAO" ? "Lao Development Lottery" : g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={formColStyle}>
                <label style={labelStyle}>Draw Date *</label>
                <input
                  type="date"
                  value={newDrawDate}
                  onChange={(e) => setNewDrawDate(e.target.value)}
                  required
                />
              </div>

              <div style={formColStyle}>
                <label style={labelStyle}>Draw Number (e.g. 93)</label>
                <input
                  type="text"
                  value={newDrawNumber}
                  onChange={(e) => setNewDrawNumber(e.target.value)}
                  placeholder="e.g. 93"
                />
              </div>

              <div style={formColStyle}>
                <label style={labelStyle}>1st Prize (6-Digit Number) *</label>
                <input
                  type="text"
                  value={newFirstPrize}
                  onChange={(e) => setNewFirstPrize(e.target.value)}
                  placeholder="e.g. 096592"
                />
              </div>

              <div style={formRowStyle}>
                <div style={formColStyle}>
                  <label style={labelStyle}>3-Digit Prize</label>
                  <input
                    type="text"
                    value={newThreeDigits}
                    onChange={(e) => setNewThreeDigits(e.target.value)}
                    placeholder="e.g. 120, 340, 560"
                  />
                </div>
                <div style={formColStyle}>
                  <label style={labelStyle}>2-Digit Prize</label>
                  <input
                    type="text"
                    value={newTwoDigits}
                    onChange={(e) => setNewTwoDigits(e.target.value)}
                    placeholder="e.g. 84"
                  />
                </div>
              </div>

              <div style={modalButtonsContainerStyle}>
                <button
                  type="button"
                  onClick={() => setIsAdminOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "1rem",
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

const tabsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  borderBottom: "1px solid var(--border-light)",
  paddingBottom: "0.75rem",
};

const tabStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: 600,
  padding: "0.5rem 1rem",
  borderRadius: "var(--radius-md)",
  transition: "var(--transition-smooth)",
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  color: "var(--accent-cyan)",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--border-light)",
};

const resultsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "1.5rem",
};

const cardStyle: React.CSSProperties = {
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const cardDateStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "var(--text-primary)",
};

const cardBadgeStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-light)",
  borderRadius: "4px",
  color: "var(--text-secondary)",
  fontSize: "0.75rem",
  padding: "2px 6px",
  fontWeight: 700,
};

const winningNumberContainerStyle: React.CSSProperties = {
  textAlign: "center",
  background: "rgba(0, 242, 254, 0.03)",
  border: "1px solid rgba(0, 242, 254, 0.1)",
  borderRadius: "var(--radius-md)",
  padding: "0.75rem",
};

const winningNumberLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  fontWeight: 600,
  letterSpacing: "0.5px",
};

const winningNumberValueStyle: React.CSSProperties = {
  fontSize: "1.8rem",
  fontWeight: 800,
  color: "var(--accent-cyan)",
  letterSpacing: "2px",
  marginTop: "0.25rem",
  textShadow: "0 0 16px hsla(184, 100%, 48%, 0.3)",
};

const prizesGridStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const prizeRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid rgba(255, 255, 255, 0.02)",
  paddingBottom: "0.5rem",
};

const prizeLabelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "var(--text-secondary)",
};

const prizeValueStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "var(--text-primary)",
};

const emptyPanelStyle: React.CSSProperties = {
  padding: "4rem 2rem",
  textAlign: "center",
  color: "var(--text-secondary)",
  fontSize: "1.05rem",
};

const loadingContainerStyle: React.CSSProperties = {
  display: "flex",
  height: "30vh",
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

const errorStyle: React.CSSProperties = {
  color: "hsl(0, 80%, 75%)",
  padding: "2rem",
  textAlign: "center",
};

// Modal styles
const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(5, 4, 9, 0.65)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "1rem",
};

const modalContentStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "500px",
  padding: "2.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: "1.4rem",
  fontWeight: 800,
  background: "linear-gradient(135deg, #fff, var(--text-secondary))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const formRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
};

const formColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  flex: 1,
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
};

const modalButtonsContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginTop: "1rem",
};

const paginationContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "1.5rem",
  marginTop: "2.5rem",
  padding: "1rem",
  background: "rgba(255, 255, 255, 0.02)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "var(--radius-md)",
  backdropFilter: "blur(10px)",
};

const pageButtonStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "var(--text-primary)",
  padding: "0.5rem 1rem",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9rem",
  transition: "all 0.2s ease",
};

const disabledPageButtonStyle: React.CSSProperties = {
  ...pageButtonStyle,
  opacity: 0.3,
  cursor: "not-allowed",
  background: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.03)",
  color: "var(--text-muted)",
};

const pageInfoStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 500,
  color: "var(--text-secondary)",
};
