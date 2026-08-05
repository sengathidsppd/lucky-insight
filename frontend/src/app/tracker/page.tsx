"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface TicketSummary {
  total_spent: number;
  total_won: number;
  net_profit_loss: number;
  total_tickets: number;
  total_won_tickets: number;
  win_rate: number;
}

interface Ticket {
  id: string;
  user_id: string;
  draw_date: string;
  lottery_type: string;
  number_code: string;
  category: string;
  amount_spent: number;
  prize_won: number;
  status: "PENDING" | "WON" | "MISSED";
  notes?: string;
  created_at: string;
}

export default function TrackerPage() {
  const [summary, setSummary] = useState<TicketSummary>({
    total_spent: 0,
    total_won: 0,
    net_profit_loss: 0,
    total_tickets: 0,
    total_won_tickets: 0,
    win_rate: 0,
  });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit form state
  const [editDrawDate, setEditDrawDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [editAmountSpent, setEditAmountSpent] = useState<string>("0");
  const [editPrizeWon, setEditPrizeWon] = useState<string>("0");
  const [editStatus, setEditStatus] = useState<string>("PENDING");
  const [editNotes, setEditNotes] = useState<string>("");

  // Add ticket form state
  const [addNumberCode, setAddNumberCode] = useState<string>("");
  const [addCategory, setAddCategory] = useState<string>("6D");
  const [addLotteryType, setAddLotteryType] = useState<string>("LAO");
  const [addAmountSpent, setAddAmountSpent] = useState<string>("0");
  const [addDrawDate, setAddDrawDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const fetchTrackerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryResp = await apiRequest<TicketSummary>("/tickets/summary");
      setSummary(summaryResp);

      const params = statusFilter !== "ALL" ? { status: statusFilter } : undefined;
      const ticketsResp = await apiRequest<Ticket[]>("/tickets", { params });
      setTickets(ticketsResp);
    } catch (err: any) {
      setError(err.message || "Failed to load tracker data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, [statusFilter]);

  const handleOpenEditModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditDrawDate(ticket.draw_date || new Date().toISOString().split("T")[0]);
    setEditAmountSpent(ticket.amount_spent.toString());
    setEditPrizeWon(ticket.prize_won.toString());
    setEditStatus(ticket.status);
    setEditNotes(ticket.notes || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEditTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      await apiRequest(`/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          draw_date: editDrawDate,
          amount_spent: parseFloat(editAmountSpent) || 0,
          prize_won: parseFloat(editPrizeWon) || 0,
          status: editStatus,
          notes: editNotes,
        }),
      });
      setIsEditModalOpen(false);
      fetchTrackerData();
    } catch (err: any) {
      alert("Failed to update ticket: " + err.message);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNumberCode.trim()) {
      alert("Please enter a ticket number");
      return;
    }
    try {
      await apiRequest("/tickets", {
        method: "POST",
        body: JSON.stringify({
          number_code: addNumberCode.trim(),
          category: addCategory,
          lottery_type: addLotteryType,
          amount_spent: parseFloat(addAmountSpent) || 0,
          draw_date: addDrawDate,
          status: "PENDING",
        }),
      });
      setIsAddModalOpen(false);
      setAddNumberCode("");
      setAddAmountSpent("0");
      fetchTrackerData();
    } catch (err: any) {
      alert("Failed to create ticket: " + err.message);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket entry?")) return;
    try {
      await apiRequest(`/tickets/${ticketId}`, { method: "DELETE" });
      fetchTrackerData();
    } catch (err: any) {
      alert("Failed to delete ticket: " + err.message);
    }
  };

  const [isChecking, setIsChecking] = useState(false);

  const handleCheckTickets = async () => {
    setIsChecking(true);
    try {
      await apiRequest("/tickets/check", { method: "POST" });
      await fetchTrackerData();
    } catch (err: any) {
      console.error("Check tickets failed:", err);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", color: "#fff" }}>
        {/* Title Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🎫 Personal Bet Tracker
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
              Track your tickets, spent amounts, winnings, and profit/loss in real-time.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={handleCheckTickets}
              disabled={isChecking}
              style={{
                padding: "0.75rem 1.25rem",
                background: "rgba(234, 179, 8, 0.15)",
                border: "1px solid rgba(234, 179, 8, 0.4)",
                color: "#facc15",
                fontWeight: 800,
                fontSize: "0.9rem",
                borderRadius: "10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {isChecking ? "🔄 Checking..." : "⚡ Check Results"}
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                padding: "0.75rem 1.25rem",
                background: "linear-gradient(135deg, var(--accent-cyan), #0284c7)",
                color: "#000",
                fontWeight: 800,
                fontSize: "0.9rem",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 12px rgba(14, 165, 233, 0.4)",
              }}
            >
              + Add Ticket
            </button>
          </div>
        </div>

        {/* Summary Dashboard Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total Spent</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginTop: "0.4rem" }}>
              {summary.total_spent.toLocaleString()} Kip
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Accumulated bets</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total Won</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#4ade80", marginTop: "0.4rem" }}>
              {summary.total_won.toLocaleString()} Kip
            </div>
            <div style={{ fontSize: "0.75rem", color: "#4ade80", marginTop: "0.2rem" }}>Prize winnings</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Net Profit / Loss</div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: summary.net_profit_loss >= 0 ? "#4ade80" : "#f87171",
                marginTop: "0.4rem",
              }}
            >
              {summary.net_profit_loss >= 0 ? "+" : ""}
              {summary.net_profit_loss.toLocaleString()} Kip
            </div>
            <div style={{ fontSize: "0.75rem", color: summary.net_profit_loss >= 0 ? "#4ade80" : "#f87171", marginTop: "0.2rem" }}>
              {summary.net_profit_loss >= 0 ? "🟢 Net Profit" : "🔴 Net Loss"}
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Win Rate & Tickets</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-cyan)", marginTop: "0.4rem" }}>
              {summary.win_rate}%
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              {summary.total_won_tickets} won of {summary.total_tickets} tickets
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {["ALL", "PENDING", "WON", "MISSED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: statusFilter === st ? "1px solid var(--accent-cyan)" : "1px solid rgba(255,255,255,0.1)",
                background: statusFilter === st ? "rgba(14, 165, 233, 0.2)" : "rgba(255,255,255,0.03)",
                color: statusFilter === st ? "var(--accent-cyan)" : "var(--text-secondary)",
                fontWeight: statusFilter === st ? 700 : 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {st === "ALL" ? "All Tickets" : st}
            </button>
          ))}
        </div>

        {/* Tickets List Container */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
            Loading tickets...
          </div>
        ) : error ? (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "1rem", borderRadius: "10px", color: "#f87171" }}>
            {error}
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px border-dash rgba(255,255,255,0.1)", padding: "3rem", borderRadius: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎫</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>No Tickets Found</div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Save lucky numbers from the <strong>Analyze</strong> page or click <strong>Add Ticket</strong> to start tracking!
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {tickets.map((t) => {
              const statusBadge =
                t.status === "WON"
                  ? { bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.4)", text: "#4ade80", icon: "🟢 WON" }
                  : t.status === "MISSED"
                  ? { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)", text: "#f87171", icon: "🔴 MISSED" }
                  : { bg: "rgba(234, 179, 8, 0.15)", border: "rgba(234, 179, 8, 0.4)", text: "#facc15", icon: "🟡 PENDING" };

              return (
                <div
                  key={t.id}
                  style={{
                    background: "rgba(10, 2, 15, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                    padding: "1.25rem",
                    backdropFilter: "blur(10px)",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "rgba(255,255,255,0.08)", padding: "0.2rem 0.6rem", borderRadius: "6px", color: "var(--accent-cyan)" }}>
                        {t.lottery_type} • {t.category}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.6rem",
                          borderRadius: "6px",
                          background: statusBadge.bg,
                          border: `1px solid ${statusBadge.border}`,
                          color: statusBadge.text,
                        }}
                      >
                        {statusBadge.icon}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.4rem 0" }}>
                      {t.number_code.split(",").map((num, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: "1.2rem",
                            fontWeight: 800,
                            color: "var(--accent-cyan)",
                            letterSpacing: "2px",
                            fontFamily: "monospace",
                            background: "rgba(14, 165, 233, 0.1)",
                            border: "1px solid rgba(14, 165, 233, 0.25)",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "6px",
                          }}
                        >
                          {num.trim()}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.75rem", background: "rgba(255,255,255,0.02)", padding: "0.6rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Amount Spent</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                          {t.amount_spent.toLocaleString()} Kip
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Prize Won</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: t.prize_won > 0 ? "#4ade80" : "var(--text-secondary)" }}>
                          {t.prize_won.toLocaleString()} Kip
                        </div>
                      </div>
                    </div>

                    {t.notes && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem", fontStyle: "italic" }}>
                        💬 {t.notes}
                      </div>
                    )}

                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                      📅 Draw Date: {t.draw_date}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <button
                      onClick={() => handleOpenEditModal(t)}
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        background: "rgba(14, 165, 233, 0.1)",
                        border: "1px solid rgba(14, 165, 233, 0.3)",
                        borderRadius: "8px",
                        color: "var(--accent-cyan)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Edit Amount
                    </button>
                    <button
                      onClick={() => handleDeleteTicket(t.id)}
                      style={{
                        padding: "0.5rem 0.75rem",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "8px",
                        color: "#f87171",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Ticket Modal */}
        {isEditModalOpen && selectedTicket && (
          <div style={modalBackdropStyle}>
            <div style={modalContentStyle}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: 0, marginBottom: "1rem" }}>
                ✏️ Update Ticket - {selectedTicket.number_code}
              </h2>
              <form onSubmit={handleSaveEditTicket}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Draw Date</label>
                  <input
                    type="date"
                    value={editDrawDate}
                    onChange={(e) => setEditDrawDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Amount Spent (Kip / THB)</label>
                  <input
                    type="number"
                    step="any"
                    value={editAmountSpent}
                    onChange={(e) => setEditAmountSpent(e.target.value)}
                    style={inputStyle}
                    placeholder="Enter amount spent (e.g. 20000)"
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Prize Won (Kip / THB)</label>
                  <input
                    type="number"
                    step="any"
                    value={editPrizeWon}
                    onChange={(e) => setEditPrizeWon(e.target.value)}
                    style={inputStyle}
                    placeholder="Enter prize won if won"
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="PENDING">🟡 PENDING (Waiting for draw)</option>
                    <option value="WON">🟢 WON (Prize Winner)</option>
                    <option value="MISSED">🔴 MISSED (Not Won)</option>
                  </select>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={labelStyle}>Notes (Optional)</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Bought from local agent"
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    style={cancelBtnStyle}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={submitBtnStyle}>
                    Save Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Manual Ticket Modal */}
        {isAddModalOpen && (
          <div style={modalBackdropStyle}>
            <div style={modalContentStyle}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: 0, marginBottom: "1rem" }}>
                ➕ Add New Ticket
              </h2>
              <form onSubmit={handleCreateTicket}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Number Code *</label>
                  <input
                    type="text"
                    required
                    value={addNumberCode}
                    onChange={(e) => setAddNumberCode(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. 932479, 592, or 59"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select
                      value={addCategory}
                      onChange={(e) => setAddCategory(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="6D">6D Prize</option>
                      <option value="4D">4D Prize</option>
                      <option value="3D">3D Prize</option>
                      <option value="2D">2D Prize</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Lottery Type</label>
                    <select
                      value={addLotteryType}
                      onChange={(e) => setAddLotteryType(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="LAO">LAO (Lao Development Lottery)</option>
                      <option value="THAI">THAI (Thai National Lottery)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={labelStyle}>Amount Spent (Kip)</label>
                    <input
                      type="number"
                      step="any"
                      value={addAmountSpent}
                      onChange={(e) => setAddAmountSpent(e.target.value)}
                      style={inputStyle}
                      placeholder="e.g. 20000"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Draw Date</label>
                    <input
                      type="date"
                      value={addDrawDate}
                      onChange={(e) => setAddDrawDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    style={cancelBtnStyle}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={submitBtnStyle}>
                    Add Ticket
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
const summaryCardStyle: React.CSSProperties = {
  background: "rgba(10, 2, 15, 0.75)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "14px",
  padding: "1.25rem",
  backdropFilter: "blur(10px)",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.8)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
  padding: "1rem",
  maxHeight: "100vh",
  overflowY: "auto",
};

const modalContentStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "16px",
  padding: "1.5rem",
  maxWidth: "480px",
  width: "100%",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
  color: "#fff",
  maxHeight: "85vh",
  overflowY: "auto",
  marginBottom: "80px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "var(--text-secondary)",
  marginBottom: "0.35rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "0.6rem 1.2rem",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "0.85rem",
  cursor: "pointer",
};

const submitBtnStyle: React.CSSProperties = {
  padding: "0.6rem 1.2rem",
  background: "linear-gradient(135deg, var(--accent-cyan), #0284c7)",
  border: "none",
  borderRadius: "8px",
  color: "#000",
  fontWeight: 800,
  fontSize: "0.85rem",
  cursor: "pointer",
};
