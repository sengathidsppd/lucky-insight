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

interface Tag {
  id: string;
  name: string;
}

interface NumberRecord {
  id: string;
  number: string;
  note: string | null;
  is_favorite: boolean;
  recorded_at: string;
  category: Category;
  source: Source;
  tags: Tag[];
}

export default function RecordsPage() {
  // Lists
  const [records, setRecords] = useState<NumberRecord[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [isFavoriteFilter, setIsFavoriteFilter] = useState<boolean | null>(null);

  // Pagination & Loading
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Record Form state (for create and edit)
  const [editingRecord, setEditingRecord] = useState<NumberRecord | null>(null);
  const [formNumber, setFormNumber] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formRecordedAt, setFormRecordedAt] = useState("");

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Lookups
  const fetchLookups = async () => {
    try {
      const [catsResp, srcsResp, tagsResp] = await Promise.all([
        apiRequest("/lookups/categories"),
        apiRequest("/lookups/sources"),
        apiRequest("/tags"),
      ]);
      setCategories(catsResp.data);
      setSources(srcsResp.data);
      setTags(tagsResp.data);
    } catch (err) {
      console.error("Failed to load metadata lookups:", err);
    }
  };

  // Fetch Records list
  const fetchRecords = async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, any> = { limit: 50 };
      if (searchQuery) params.query = searchQuery;
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedSource) params.source_id = selectedSource;
      if (selectedTag) params.tag_id = selectedTag;
      if (isFavoriteFilter !== null) params.is_favorite = isFavoriteFilter;

      const resp = await apiRequest("/records/", { params });
      setRecords(resp.data);
      setSelectedRecordIds([]); // clear selection
    } catch (err: any) {
      setError(err.message || "Failed to load records.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDeleteRecords = async () => {
    if (selectedRecordIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete all ${selectedRecordIds.length} selected records?`)) {
      return;
    }
    try {
      await Promise.all(
        selectedRecordIds.map((id) =>
          apiRequest(`/records/${id}`, {
            method: "DELETE",
          })
        )
      );
      setSelectedRecordIds([]);
      fetchRecords();
    } catch (err: any) {
      alert("Failed to delete selected records: " + err.message);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRecords();
    }, 300); // Debounce search
    return () => clearTimeout(handler);
  }, [searchQuery, selectedCategory, selectedSource, selectedTag, isFavoriteFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormNumber("");
    setFormCategory("");
    setFormSource("");
    setFormTags("");
    setFormNote("");
    setFormIsFavorite(false);
    setFormRecordedAt(new Date().toISOString().substring(0, 16));
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: NumberRecord) => {
    setEditingRecord(rec);
    setFormNumber(rec.number);
    setFormCategory(rec.category?.id || "");
    setFormSource(rec.source?.id || "");
    setFormTags(rec.tags.map((t) => t.name).join(", "));
    setFormNote(rec.note || "");
    setFormIsFavorite(rec.is_favorite);
    setFormRecordedAt(new Date(rec.recorded_at).toISOString().substring(0, 16));
    setIsCreateOpen(true);
  };

  // Submit form (create or edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        number: formNumber,
        category_id: formCategory || undefined,
        source_id: formSource || undefined,
        note: formNote || undefined,
        is_favorite: formIsFavorite,
        recorded_at: formRecordedAt ? new Date(formRecordedAt).toISOString() : undefined,
      };

      let savedRecord: any;
      if (editingRecord) {
        // Update record
        const resp = await apiRequest(`/records/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        savedRecord = resp.data;
      } else {
        // Create record
        const resp = await apiRequest("/records/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        savedRecord = resp.data;
      }

      // Map tag names to tag IDs, creating them if necessary
      const cleanTags = formTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");

      const tagIds: string[] = [];
      for (const tagName of cleanTags) {
        const existing = tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
        if (existing) {
          tagIds.push(existing.id);
        } else {
          try {
            const createResp = await apiRequest("/tags/", {
              method: "POST",
              body: JSON.stringify({ name: tagName }),
            });
            tagIds.push(createResp.data.id);
          } catch (createErr) {
            console.error("Failed to create tag:", tagName, createErr);
          }
        }
      }

      // Update the record's tags
      await apiRequest(`/records/${savedRecord.id}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tag_ids: tagIds }),
      });

      setIsCreateOpen(false);
      fetchRecords();
      fetchLookups(); // Refresh tag list
    } catch (err: any) {
      alert(err.message || "Failed to save record.");
    }
  };

  // Toggle favorite directly
  const handleToggleFavorite = async (rec: NumberRecord) => {
    try {
      await apiRequest(`/records/${rec.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_favorite: !rec.is_favorite }),
      });
      fetchRecords();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  // Delete record
  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await apiRequest(`/records/${id}`, {
        method: "DELETE",
      });
      fetchRecords();
    } catch (err: any) {
      alert(err.message || "Failed to delete.");
    }
  };

  // CSV Export Trigger
  const handleExportCSV = async () => {
    try {
      const csvContent = await apiRequest("/records/export/csv");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `records_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Failed to export: " + err.message);
    }
  };

  // CSV Import trigger
  const handleImportCSVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImportLoading(true);
    setImportError("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const resp = await apiRequest("/records/import/csv", {
        method: "POST",
        body: formData,
      });

      setImportResult(resp);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchRecords();
      fetchLookups();
    } catch (err: any) {
      setImportError(err.message || "Failed to import CSV.");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header and Quick Buttons */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Number Records</h1>
          <p style={subtitleStyle}>Manage and tag your collected lucky numbers.</p>
        </div>
        <div style={actionsStyle}>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            📤 Export CSV
          </button>
          <button onClick={() => setIsImportOpen(true)} className="btn btn-secondary">
            📥 Import CSV
          </button>
          <button onClick={handleOpenCreate} className="btn btn-primary">
            ➕ Add Number
          </button>
        </div>
      </div>

      {/* Search and Filters panel */}
      <div className="glass-panel" style={filtersPanelStyle}>
        <div style={filterGridStyle}>
          <div style={filterColStyle}>
            <label style={filterLabelStyle}>Search Number</label>
            <input
              type="text"
              placeholder="Type prefix (e.g. 77...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={filterColStyle}>
            <label style={filterLabelStyle}>Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={filterColStyle}>
            <label style={filterLabelStyle}>Source</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              <option value="">All Sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div style={filterColStyle}>
            <label style={filterLabelStyle}>Tag</label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div style={filterColStyle}>
            <label style={filterLabelStyle}>Favorites Only</label>
            <select
              value={isFavoriteFilter === null ? "" : String(isFavoriteFilter)}
              onChange={(e) => {
                const val = e.target.value;
                setIsFavoriteFilter(val === "" ? null : val === "true");
              }}
            >
              <option value="">All Records</option>
              <option value="true">💖 Favorites</option>
              <option value="false">Regular Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      {isLoading ? (
        <div style={loadingContainerStyle}>
          <div style={spinnerStyle} />
          <span>Searching records...</span>
        </div>
      ) : error ? (
        <div style={errorStyle}>{error}</div>
      ) : records.length === 0 ? (
        <div className="glass-panel" style={emptyPanelStyle}>
          No records match your filters. Try adjusting them or add a new record!
        </div>
      ) : (
        <div className="glass-panel" style={tablePanelStyle}>
          {selectedRecordIds.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.8rem", paddingRight: "0.5rem" }}>
              <button
                type="button"
                onClick={handleBulkDeleteRecords}
                className="btn"
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                  background: "rgba(224, 80, 80, 0.2)",
                  color: "hsl(0, 80%, 75%)",
                  border: "1px solid rgba(224, 80, 80, 0.4)",
                  cursor: "pointer",
                }}
              >
                🗑️ Delete Selected ({selectedRecordIds.length})
              </button>
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={{ ...thStyle, width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedRecordIds.length === records.length && records.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRecordIds(records.map((r) => r.id));
                        } else {
                          setSelectedRecordIds([]);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th style={thStyle}>Number</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Tags</th>
                  <th style={thStyle}>Note</th>
                  <th style={thStyle}>Date</th>
                  <th style={thRightStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id} style={trStyle}>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedRecordIds.includes(rec.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecordIds([...selectedRecordIds, rec.id]);
                          } else {
                            setSelectedRecordIds(selectedRecordIds.filter((id) => id !== rec.id));
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "var(--accent-cyan)", fontSize: "1.1rem" }}>
                      {rec.number}
                    </td>
                    <td style={tdStyle}>{rec.category?.name}</td>
                    <td style={tdStyle}>{rec.source?.name}</td>
                    <td style={tdStyle}>
                      <div style={tagsListStyle}>
                        {rec.tags.map((t) => (
                          <span key={t.id} style={tagStyle}>
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "200px" }}>
                      {rec.note || "—"}
                    </td>
                    <td style={tdStyle}>
                      {new Date(rec.recorded_at).toLocaleDateString()}
                    </td>
                    <td style={tdRightStyle}>
                      <button
                        onClick={() => handleToggleFavorite(rec)}
                        style={actionIconButtonStyle}
                      >
                        {rec.is_favorite ? "💖" : "🖤"}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(rec)}
                        style={actionIconButtonStyle}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(rec.id)}
                        style={{ ...actionIconButtonStyle, color: "hsl(0,80%,65%)" }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE & EDIT RECORD MODAL */}
      {isCreateOpen && (
        <div style={modalBackdropStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={modalTitleStyle}>
              {editingRecord ? "Edit Record" : "Add Number Record"}
            </h2>
            <form onSubmit={handleFormSubmit} style={formStyle}>
              <div style={formRowStyle}>
                <div style={formColStyle}>
                  <label style={labelStyle}>Number *</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="Enter digits (e.g. 98)"
                    required
                  />
                </div>

                <div style={formColStyle}>
                  <label style={labelStyle}>Recorded At</label>
                  <input
                    type="datetime-local"
                    value={formRecordedAt}
                    onChange={(e) => setFormRecordedAt(e.target.value)}
                  />
                </div>
              </div>

              <div style={formRowStyle}>
                <div style={formColStyle}>
                  <label style={labelStyle}>Category</label>
                  <input
                    type="text"
                    list="categories-list"
                    value={categories.find((c) => c.id === formCategory)?.name || formCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = categories.find((c) => c.name.toLowerCase() === val.toLowerCase());
                      setFormCategory(match ? match.id : val);
                    }}
                    placeholder="General, Dream, etc."
                  />
                  <datalist id="categories-list">
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <div style={formColStyle}>
                  <label style={labelStyle}>Source</label>
                  <input
                    type="text"
                    list="sources-list"
                    value={sources.find((s) => s.id === formSource)?.name || formSource}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = sources.find((s) => s.name.toLowerCase() === val.toLowerCase());
                      setFormSource(match ? match.id : val);
                    }}
                    placeholder="Calculator, Social, etc."
                  />
                  <datalist id="sources-list">
                    {sources.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={formColStyle}>
                <label style={labelStyle}>Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="lucky, win, night"
                />
              </div>

              <div style={formColStyle}>
                <label style={labelStyle}>Note / Description</label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Write details..."
                  rows={3}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="form-is-favorite"
                  checked={formIsFavorite}
                  onChange={(e) => setFormIsFavorite(e.target.checked)}
                  style={{ width: "auto" }}
                />
                <label htmlFor="form-is-favorite" style={{ fontSize: "0.9rem", cursor: "pointer" }}>
                  Add to Favorites 💖
                </label>
              </div>

              <div style={modalButtonsContainerStyle}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRecord ? "Save Changes" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT CSV MODAL */}
      {isImportOpen && (
        <div style={modalBackdropStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={modalTitleStyle}>Import Numbers from CSV</h2>
            <p style={{ ...subtitleStyle, marginBottom: "1.5rem" }}>
              Upload a CSV file containing columns: <strong>number, source, category, note, is_favorite, recorded_at, tags</strong>.
            </p>

            {importError && <div style={errorStyle}>{importError}</div>}

            <form onSubmit={handleImportCSVSubmit} style={formStyle}>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                required
              />

              <button
                type="submit"
                className="btn btn-primary"
                disabled={importLoading || !importFile}
              >
                {importLoading ? "Uploading..." : "Start Import"}
              </button>
            </form>

            {importResult && (
              <div style={importResultStyle}>
                <h4 style={{ fontWeight: 700, color: "var(--text-primary)" }}>Import Completed</h4>
                <p>Imported: <strong>{importResult.imported_count}</strong> rows</p>
                <p>Failed: <strong>{importResult.failed_count}</strong> rows</p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div style={importErrorsListStyle}>
                    <p style={{ fontWeight: 600, color: "hsl(0,80%,75%)" }}>Errors list:</p>
                    <ul style={{ paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {importResult.errors.map((err: any, idx: number) => (
                        <li key={idx}>
                          Row {err.row}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div style={modalButtonsContainerStyle}>
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setImportResult(null);
                  setImportError("");
                }}
                className="btn btn-secondary"
                style={{ width: "100%" }}
              >
                Close
              </button>
            </div>
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

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
};

const filtersPanelStyle: React.CSSProperties = {
  padding: "1.5rem",
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "1.25rem",
};

const filterColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
};

const tablePanelStyle: React.CSSProperties = {
  padding: "1rem",
};

const emptyPanelStyle: React.CSSProperties = {
  padding: "4rem 2rem",
  textAlign: "center",
  color: "var(--text-secondary)",
  fontSize: "1.05rem",
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
  padding: "1rem",
  textTransform: "uppercase",
};

const thRightStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: "right",
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
  transition: "var(--transition-smooth)",
};

const tdStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: "0.95rem",
  padding: "1rem",
};

const tdRightStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
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

const actionIconButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "1.1rem",
  padding: "0.25rem",
  marginLeft: "0.5rem",
  transition: "var(--transition-smooth)",
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
  maxWidth: "540px",
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

const importResultStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.02)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-md)",
  padding: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  fontSize: "0.9rem",
};

const importErrorsListStyle: React.CSSProperties = {
  marginTop: "0.5rem",
  maxHeight: "150px",
  overflowY: "auto",
};
