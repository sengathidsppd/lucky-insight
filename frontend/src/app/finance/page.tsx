"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface PayerBreakdown {
  payer_name: string;
  amount: number;
  percentage: number;
}

interface FamilyFinanceSummary {
  currency: string;
  total_income: number;
  total_expense: number;
  net_balance: number;
  expense_by_category: CategoryBreakdown[];
  expense_by_payer: PayerBreakdown[];
  transaction_count: number;
}

interface FamilyTransaction {
  id: string;
  user_id: string;
  transaction_type: "INCOME" | "EXPENSE";
  amount: number;
  currency: string;
  category: string;
  payer_name: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

interface GoogleSheetConfig {
  webhook_url: string | null;
  sheet_url: string | null;
  is_auto_sync: boolean;
}

const INCOME_CATEGORIES = [
  "Salary & Earnings",
  "Business Revenue",
  "Treasury Deposit",
  "Bonus & Gift",
  "Investment Return",
  "Other Inflow",
];

const EXPENSE_CATEGORIES = [
  "Food & Groceries",
  "Home & Utilities",
  "Family & Children",
  "Transport & Fuel",
  "Shopping & Leisure",
  "Healthcare & Medicine",
  "Education",
  "Loans & Debts",
  "Miscellaneous",
];

const PAYER_PRESETS = ["Suzu", "Ning", "Family Fund", "Other"];

export default function FamilyFinancePage() {
  const { user } = useAuth();

  const currency = "LAK";
  const [periodFilter, setPeriodFilter] = useState<"ALL" | "THIS_MONTH" | "CUSTOM">("THIS_MONTH");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [payerFilter, setPayerFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [summary, setSummary] = useState<FamilyFinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FamilyTransaction[]>([]);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const DEFAULT_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1zgDD-TVtAAseMyuBfLG_saz9ejn_c0_RcOhvQfkSimc/edit?usp=sharing";
  const DEFAULT_WEBHOOK_URL =
    "https://script.google.com/macros/s/AKfycbzCrVAg0qzIT2Imkua44UovZOM2EjA9qbSqBM2t9winCLMTOWqFEAIRrT0HQXTOQpw0Fg/exec";

  // Google Sheets Integration State
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>({
    webhook_url: DEFAULT_WEBHOOK_URL,
    sheet_url: DEFAULT_SHEET_URL,
    is_auto_sync: true,
  });
  const [isSheetModalOpen, setIsSheetModalOpen] = useState<boolean>(false);
  const [inputWebhookUrl, setInputWebhookUrl] = useState<string>(DEFAULT_WEBHOOK_URL);
  const [inputSheetUrl, setInputSheetUrl] = useState<string>(DEFAULT_SHEET_URL);
  const [inputAutoSync, setInputAutoSync] = useState<boolean>(true);
  const [activeGuideTab, setActiveGuideTab] = useState<"settings" | "instructions">("settings");
  const [isTestingSheet, setIsTestingSheet] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [isSavingSheetConfig, setIsSavingSheetConfig] = useState<boolean>(false);
  const [sheetStatusMessage, setSheetStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("Food & Groceries");
  const [payerName, setPayerName] = useState<string>("Suzu");
  const [customPayer, setCustomPayer] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Custom Categories State
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("family_custom_income_categories");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("family_custom_expense_categories");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [removedCategories, setRemovedCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("family_removed_categories");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isAddingNewCategory, setIsAddingNewCategory] = useState<boolean>(false);
  const [newCategoryInput, setNewCategoryInput] = useState<string>("");

  const isFamilyMember =
    user?.email === "suzu@gmail.com" ||
    user?.email === "ning80074@gmail.com";

  const customCategoriesForType = useMemo(() => {
    const isInc = modalType === "INCOME";
    const presets = isInc ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const custom = isInc ? customIncomeCategories : customExpenseCategories;
    const fromTx = transactions
      .filter((t) => t.transaction_type === modalType)
      .map((t) => t.category);
    return Array.from(new Set([...custom, ...fromTx])).filter(
      (c) => !presets.includes(c) && !removedCategories.includes(c)
    );
  }, [modalType, customIncomeCategories, customExpenseCategories, transactions, removedCategories]);

  // Merged available categories (excluding deleted ones)
  const availableCategories = useMemo(() => {
    const isInc = modalType === "INCOME";
    const presets = isInc ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const custom = (isInc ? customIncomeCategories : customExpenseCategories).filter(
      (c) => !removedCategories.includes(c)
    );
    const fromTx = transactions
      .filter((t) => t.transaction_type === modalType)
      .map((t) => t.category)
      .filter((c) => !removedCategories.includes(c));
    const list = Array.from(new Set([...presets, ...custom, ...fromTx]));
    if (category && !list.includes(category)) {
      list.push(category);
    }
    return list;
  }, [modalType, customIncomeCategories, customExpenseCategories, transactions, removedCategories, category]);

  // Helper to format Date to YYYY-MM-DD using local time
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Date range computed from periodFilter
  const dateParams = useMemo(() => {
    if (periodFilter === "THIS_MONTH") {
      const now = new Date();
      const firstDay = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
      const lastDay = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { date_from: firstDay, date_to: lastDay };
    }
    if (periodFilter === "CUSTOM") {
      const params: { date_from?: string; date_to?: string } = {};
      if (customDateFrom) params.date_from = customDateFrom;
      if (customDateTo) params.date_to = customDateTo;
      return params;
    }
    return {};
  }, [periodFilter, customDateFrom, customDateTo]);

  const fetchData = async () => {
    if (!isFamilyMember) return;
    setIsLoading(true);
    setError(null);
    try {
      const summaryParams: Record<string, string | number | boolean> = { currency };
      if (dateParams.date_from) summaryParams.date_from = dateParams.date_from;
      if (dateParams.date_to) summaryParams.date_to = dateParams.date_to;

      const summaryResp = await apiRequest<FamilyFinanceSummary>("/finances/summary", {
        params: summaryParams,
      });
      setSummary(summaryResp);

      const listParams: Record<string, string | number | boolean> = { currency, limit: 500 };
      if (dateParams.date_from) listParams.date_from = dateParams.date_from;
      if (dateParams.date_to) listParams.date_to = dateParams.date_to;

      const txListResp = await apiRequest<FamilyTransaction[]>("/finances", {
        params: listParams,
      });
      setTransactions(Array.isArray(txListResp) ? txListResp : []);

      // Load Google Sheets config
      try {
        const sheetCfg = await apiRequest<GoogleSheetConfig>("/finances/google-sheets");
        if (sheetCfg && sheetCfg.webhook_url) {
          setSheetConfig(sheetCfg);
          setInputWebhookUrl(sheetCfg.webhook_url);
          setInputSheetUrl(sheetCfg.sheet_url || DEFAULT_SHEET_URL);
          setInputAutoSync(sheetCfg.is_auto_sync !== false);
        } else {
          // Auto-persist default configured webhook to backend so Render DB has it immediately
          const savedCfg = await apiRequest<GoogleSheetConfig>("/finances/google-sheets", {
            method: "POST",
            body: JSON.stringify({
              webhook_url: DEFAULT_WEBHOOK_URL,
              sheet_url: DEFAULT_SHEET_URL,
              is_auto_sync: true,
            }),
          });
          if (savedCfg) {
            setSheetConfig(savedCfg);
          }
        }
      } catch (sheetErr) {
        console.warn("Could not load Google Sheet config:", sheetErr);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load financial records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currency, periodFilter, customDateFrom, customDateTo, isFamilyMember]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const openModal = (type: "INCOME" | "EXPENSE") => {
    setEditingId(null);
    setModalType(type);
    setCategory(type === "INCOME" ? "Treasury Deposit" : "Food & Groceries");
    setPayerName(user?.email === "ning80074@gmail.com" ? "Ning" : "Suzu");
    setAmount("");
    setDescription("");
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
    setTxDate(formatLocalDate(new Date()));
    setIsModalOpen(true);
  };

  const openEditModal = (tx: FamilyTransaction) => {
    setEditingId(tx.id);
    setModalType(tx.transaction_type);
    setAmount(String(tx.amount));
    setCategory(tx.category);
    if (PAYER_PRESETS.filter((p) => p !== "Other").includes(tx.payer_name)) {
      setPayerName(tx.payer_name);
      setCustomPayer("");
    } else {
      setPayerName("Other");
      setCustomPayer(tx.payer_name);
    }
    setDescription(tx.description || "");
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
    setTxDate(tx.transaction_date);
    setIsModalOpen(true);
  };

  const handleAddNewCategory = (nameToSave?: string): string => {
    const trimmed = (nameToSave || newCategoryInput).trim();
    if (!trimmed) return category;

    if (modalType === "INCOME") {
      if (!customIncomeCategories.includes(trimmed)) {
        const updated = [...customIncomeCategories, trimmed];
        setCustomIncomeCategories(updated);
        try {
          localStorage.setItem("family_custom_income_categories", JSON.stringify(updated));
        } catch {}
      }
    } else {
      if (!customExpenseCategories.includes(trimmed)) {
        const updated = [...customExpenseCategories, trimmed];
        setCustomExpenseCategories(updated);
        try {
          localStorage.setItem("family_custom_expense_categories", JSON.stringify(updated));
        } catch {}
      }
    }

    setCategory(trimmed);
    setNewCategoryInput("");
    setIsAddingNewCategory(false);
    return trimmed;
  };

  const handleDeleteCustomCategory = (catToDelete: string) => {
    if (!confirm(`Are you sure you want to remove the category "${catToDelete}" from the list?`)) return;

    if (modalType === "INCOME") {
      const updated = customIncomeCategories.filter((c) => c !== catToDelete);
      setCustomIncomeCategories(updated);
      try {
        localStorage.setItem("family_custom_income_categories", JSON.stringify(updated));
      } catch {}
    } else {
      const updated = customExpenseCategories.filter((c) => c !== catToDelete);
      setCustomExpenseCategories(updated);
      try {
        localStorage.setItem("family_custom_expense_categories", JSON.stringify(updated));
      } catch {}
    }

    const updatedRemoved = Array.from(new Set([...removedCategories, catToDelete]));
    setRemovedCategories(updatedRemoved);
    try {
      localStorage.setItem("family_removed_categories", JSON.stringify(updatedRemoved));
    } catch {}

    if (category === catToDelete) {
      setCategory(modalType === "INCOME" ? "Treasury Deposit" : "Food & Groceries");
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid amount greater than zero.");
      return;
    }

    let finalCategory = category;
    if (isAddingNewCategory && newCategoryInput.trim()) {
      finalCategory = handleAddNewCategory(newCategoryInput.trim());
    }

    const finalPayer = payerName === "Other" ? (customPayer.trim() || "Other") : payerName;

    setIsSubmitting(true);
    try {
      const payload = {
        transaction_type: modalType,
        amount: parsedAmount,
        currency,
        category: finalCategory,
        payer_name: finalPayer,
        description: description.trim() || null,
        transaction_date: txDate,
      };

      if (editingId) {
        const updated = await apiRequest<FamilyTransaction>(`/finances/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        if (updated && updated.id) {
          setTransactions((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        }
      } else {
        const created = await apiRequest<FamilyTransaction>("/finances", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (created && created.id) {
          setTransactions((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
        }
      }

      setIsModalOpen(false);
      setEditingId(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || (editingId ? "Failed to update transaction." : "Failed to record transaction."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this financial record?")) return;
    try {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      await apiRequest(`/finances/${id}`, { method: "DELETE" });
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete record.");
      await fetchData();
    }
  };

  const GOOGLE_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // Auto-create headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Date",
        "Type",
        "Category",
        "Payer / Beneficiary",
        "Amount (LAK)",
        "Currency",
        "Note / Description",
        "Created At",
        "Transaction ID"
      ]);
      sheet.getRange("A1:I1").setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    
    var data = JSON.parse(e.postData.contents);
    
    // 1. Connection Test Ping
    if (data.action === "test") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Connected successfully!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Helper to append a single record
    function appendTx(tx) {
      sheet.appendRow([
        tx.date || "",
        tx.type || "",
        tx.category || "",
        tx.payer || "",
        tx.amount || 0,
        tx.currency || "LAK",
        tx.description || "",
        tx.created_at || "",
        tx.id || ""
      ]);
    }
    
    // 2. Batch Sync
    if (data.action === "batch_sync" && Array.isArray(data.transactions)) {
      data.transactions.forEach(function(tx) {
        appendTx(tx);
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: data.transactions.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. Single Transaction Sync
    var tx = data.transaction || data;
    appendTx(tx);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleOpenSheetModal = () => {
    setInputWebhookUrl(sheetConfig.webhook_url || "");
    setInputSheetUrl(sheetConfig.sheet_url || "");
    setInputAutoSync(sheetConfig.is_auto_sync !== false);
    setSheetStatusMessage(null);
    setIsSheetModalOpen(true);
  };

  const handleSaveSheetConfig = async () => {
    setIsSavingSheetConfig(true);
    setSheetStatusMessage(null);
    try {
      const payload: GoogleSheetConfig = {
        webhook_url: inputWebhookUrl.trim() || null,
        sheet_url: inputSheetUrl.trim() || null,
        is_auto_sync: inputAutoSync,
      };
      const updated = await apiRequest<GoogleSheetConfig>("/finances/google-sheets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (updated) {
        setSheetConfig(updated);
        setSheetStatusMessage({ type: "success", text: "Google Sheets configuration saved successfully." });
      }
    } catch (err: any) {
      setSheetStatusMessage({ type: "error", text: err?.message || "Failed to save Google Sheets configuration." });
    } finally {
      setIsSavingSheetConfig(false);
    }
  };

  const handleTestSheetConnection = async () => {
    if (!inputWebhookUrl.trim()) {
      setSheetStatusMessage({ type: "error", text: "Please enter a Webhook URL before testing connection." });
      return;
    }
    setIsTestingSheet(true);
    setSheetStatusMessage(null);
    try {
      const res = await apiRequest<{ status: string; message: string }>("/finances/google-sheets/test", {
        method: "POST",
        body: JSON.stringify({
          webhook_url: inputWebhookUrl.trim(),
          sheet_url: inputSheetUrl.trim() || null,
          is_auto_sync: inputAutoSync,
        }),
      });
      setSheetStatusMessage({ type: "success", text: res?.message || "Connection to Google Sheet verified successfully!" });
    } catch (err: any) {
      setSheetStatusMessage({ type: "error", text: err?.message || "Failed to connect to Google Sheet Webhook." });
    } finally {
      setIsTestingSheet(false);
    }
  };

  const handleSyncAllToSheet = async () => {
    const webhookToUse =
      inputWebhookUrl.trim() || sheetConfig.webhook_url || DEFAULT_WEBHOOK_URL;
    if (!webhookToUse) {
      setSheetStatusMessage({ type: "error", text: "Please save a valid Webhook URL first before syncing history." });
      return;
    }
    if (!confirm("This will push all recorded transactions in the database to your Google Sheet. Continue?")) {
      return;
    }
    setIsSyncingAll(true);
    setSheetStatusMessage(null);
    try {
      // Ensure backend has current webhook before syncing
      await apiRequest<GoogleSheetConfig>("/finances/google-sheets", {
        method: "POST",
        body: JSON.stringify({
          webhook_url: webhookToUse,
          sheet_url: inputSheetUrl.trim() || sheetConfig.sheet_url || DEFAULT_SHEET_URL,
          is_auto_sync: inputAutoSync,
        }),
      }).catch((e) => console.warn("Auto save config error:", e));

      const res = await apiRequest<{ status: string; message: string; synced_count: number }>(
        "/finances/google-sheets/sync-all",
        { method: "POST" }
      );
      setSheetStatusMessage({ type: "success", text: res?.message || `Successfully synced ${res?.synced_count || 0} records.` });
    } catch (err: any) {
      setSheetStatusMessage({ type: "error", text: err?.message || "Failed to batch-sync transactions to Google Sheet." });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCopyScript = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    }
  };

  const handleExportToExcel = () => {
    if (displayedTransactions.length === 0) {
      alert("No transaction records to export.");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Category",
      "Payer / Beneficiary",
      "Amount (LAK)",
      "Currency",
      "Note / Description",
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = displayedTransactions.map((tx) => [
      escapeCsv(tx.transaction_date),
      escapeCsv(tx.transaction_type),
      escapeCsv(tx.category),
      escapeCsv(tx.payer_name),
      Math.round(tx.amount),
      escapeCsv(tx.currency || "LAK"),
      escapeCsv(tx.description || ""),
    ]);

    let totalInflow = 0;
    let totalExpense = 0;
    displayedTransactions.forEach((tx) => {
      if (tx.transaction_type === "INCOME") totalInflow += tx.amount;
      else if (tx.transaction_type === "EXPENSE") totalExpense += tx.amount;
    });
    const netBalance = totalInflow - totalExpense;

    const separatorRow = ['""', '""', '""', '""', '""', '""', '""'];

    const summaryInflowRow = [
      escapeCsv("SUMMARY"),
      escapeCsv("TOTAL INFLOW / DEPOSITS"),
      escapeCsv("-"),
      escapeCsv("-"),
      Math.round(totalInflow),
      escapeCsv("LAK"),
      escapeCsv("Total Treasury Inflow"),
    ];
    const summaryExpenseRow = [
      escapeCsv("SUMMARY"),
      escapeCsv("TOTAL EXPENSES"),
      escapeCsv("-"),
      escapeCsv("-"),
      Math.round(totalExpense),
      escapeCsv("LAK"),
      escapeCsv("Total Expense Deductions"),
    ];
    const summaryNetRow = [
      escapeCsv("SUMMARY"),
      escapeCsv("NET REMAINING BALANCE"),
      escapeCsv("-"),
      escapeCsv("-"),
      Math.round(netBalance),
      escapeCsv("LAK"),
      escapeCsv(netBalance >= 0 ? "Treasury Surplus" : "Treasury Deficit"),
    ];

    const allCsvLines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.join(",")),
      separatorRow.join(","),
      summaryInflowRow.join(","),
      summaryExpenseRow.join(","),
      summaryNetRow.join(","),
    ];

    const csvContent = "\uFEFF" + allCsvLines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const dateStr = formatLocalDate(new Date());
    const parts = ["family_finance"];
    if (periodFilter === "THIS_MONTH") parts.push("this_month");
    else if (periodFilter === "ALL") parts.push("all_time");
    else parts.push("custom_period");
    if (typeFilter !== "ALL") parts.push(typeFilter.toLowerCase());
    if (payerFilter !== "ALL") parts.push(payerFilter.toLowerCase().replace(/\s+/g, "_"));
    if (categoryFilter !== "ALL") parts.push(categoryFilter.toLowerCase().replace(/\s+/g, "_"));
    parts.push(dateStr);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${parts.join("_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (val: number | undefined) => {
    const num = Math.round(val ?? 0);
    return `₭ ${num.toLocaleString("en-US")}`;
  };

  // List of available payers for filtering
  const availablePayers = useMemo(() => {
    const presets = PAYER_PRESETS.filter((p) => p !== "Other");
    const fromTx = transactions.map((t) => t.payer_name).filter(Boolean);
    return ["ALL", ...Array.from(new Set([...presets, ...fromTx]))];
  }, [transactions]);

  // List of all categories for filtering
  const allFilterCategories = useMemo(() => {
    const presets = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    const custom = [...customIncomeCategories, ...customExpenseCategories].filter(
      (c) => !removedCategories.includes(c)
    );
    const fromTx = transactions.map((t) => t.category).filter((c) => !removedCategories.includes(c));
    return ["ALL", ...Array.from(new Set([...presets, ...custom, ...fromTx]))];
  }, [customIncomeCategories, customExpenseCategories, transactions, removedCategories]);

  // Filtered transactions for the ledger table
  const displayedTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "ALL" && t.transaction_type !== typeFilter) return false;
      if (payerFilter !== "ALL" && t.payer_name !== payerFilter) return false;
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false;
      if (periodFilter === "CUSTOM") {
        if (customDateFrom && t.transaction_date < customDateFrom) return false;
        if (customDateTo && t.transaction_date > customDateTo) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, payerFilter, categoryFilter, periodFilter, customDateFrom, customDateTo]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(displayedTransactions.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, payerFilter, categoryFilter, periodFilter, customDateFrom, customDateTo, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return displayedTransactions.slice(startIndex, startIndex + pageSize);
  }, [displayedTransactions, currentPage, pageSize]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  // Micro-summary computed strictly from displayed transactions
  const filteredMetrics = useMemo(() => {
    let inflow = 0;
    let expense = 0;
    displayedTransactions.forEach((tx) => {
      if (tx.transaction_type === "INCOME") inflow += tx.amount;
      else if (tx.transaction_type === "EXPENSE") expense += tx.amount;
    });
    return {
      count: displayedTransactions.length,
      inflow,
      expense,
      net: inflow - expense,
    };
  }, [displayedTransactions]);

  const isFilteredActive =
    typeFilter !== "ALL" ||
    payerFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    periodFilter !== "THIS_MONTH" ||
    customDateFrom !== "" ||
    customDateTo !== "";

  const handleResetFilters = () => {
    setTypeFilter("ALL");
    setPayerFilter("ALL");
    setCategoryFilter("ALL");
    setPeriodFilter("THIS_MONTH");
    setCustomDateFrom("");
    setCustomDateTo("");
    setCurrentPage(1);
  };

  if (!isFamilyMember) {
    return (
      <div
        style={{
          minHeight: "75vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            background: "rgba(26, 11, 46, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            padding: "3rem 2.5rem",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              border: "2px solid #ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ color: "#ffffff", fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.8rem" }}>
            Restricted Family Vault
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            This financial treasury is private to authorized family members. Your current account does not have access.
          </p>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #ffd700, #f59e0b)",
              color: "#000000",
              fontWeight: 700,
              padding: "0.75rem 2rem",
              borderRadius: "12px",
              textDecoration: "none",
            }}
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const netBalance = summary?.net_balance ?? 0;
  const isSurplus = netBalance >= 0;

  return (
    <div className="finance-container">
      {/* Top Header & Global Actions */}
      <div className="finance-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "1.5px",
                padding: "0.3rem 0.8rem",
                borderRadius: "20px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#ffd700",
                border: "1px solid rgba(245, 158, 11, 0.35)",
              }}
            >
              PRIVATE FAMILY VAULT
            </span>
            <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "0.85rem" }}>
              Authorized: Suzu & Ning
            </span>
          </div>
          <h1 className="finance-header-title">
            Family Finance & Treasury
          </h1>
        </div>

        {/* Currency & Period Controls */}
        <div className="finance-controls-row">
          {/* Lao Kip Currency Badge */}
          <div
            style={{
              background: "rgba(26, 11, 46, 0.85)",
              border: "1px solid rgba(255, 215, 0, 0.35)",
              borderRadius: "12px",
              padding: "0.5rem 1.1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 0 15px rgba(245, 158, 11, 0.15)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#ffd700",
                boxShadow: "0 0 8px #ffd700",
              }}
            />
            <span style={{ color: "#ffd700", fontWeight: 800, fontSize: "0.85rem", letterSpacing: "1px" }}>
              LAO KIP (₭)
            </span>
          </div>

          {/* Period Toggle */}
          <div
            className="finance-period-toggle"
            style={{
              background: "rgba(26, 11, 46, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "12px",
              padding: "0.25rem",
              display: "flex",
              gap: "0.25rem",
            }}
          >
            <button
              onClick={() => setPeriodFilter("ALL")}
              style={{
                background: periodFilter === "ALL" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                color: periodFilter === "ALL" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                border: "none",
                fontWeight: 600,
                padding: "0.45rem 0.9rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              All Time
            </button>
            <button
              onClick={() => setPeriodFilter("THIS_MONTH")}
              style={{
                background: periodFilter === "THIS_MONTH" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                color: periodFilter === "THIS_MONTH" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                border: "none",
                fontWeight: 600,
                padding: "0.45rem 0.9rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriodFilter("CUSTOM")}
              style={{
                background: periodFilter === "CUSTOM" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                color: periodFilter === "CUSTOM" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                border: "none",
                fontWeight: 600,
                padding: "0.45rem 0.9rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Custom Dates
            </button>
          </div>

          {/* Action Buttons */}
          <div className="finance-action-group">
            <button
              onClick={() => openModal("INCOME")}
              className="finance-action-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                border: "none",
                padding: "0.65rem 1.15rem",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
                whiteSpace: "nowrap",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Deposit Inflow
            </button>

            <button
              onClick={() => openModal("EXPENSE")}
              className="finance-action-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "#ffffff",
                border: "none",
                padding: "0.65rem 1.15rem",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)",
                whiteSpace: "nowrap",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Record Expense
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #ef4444",
            borderRadius: "12px",
            padding: "1rem 1.5rem",
            color: "#ef4444",
            marginBottom: "1.5rem",
            fontSize: "0.95rem",
          }}
        >
          {error}
        </div>
      )}

      {/* HERO CARD: REMAINING TREASURY BALANCE */}
      <div
        className="finance-hero-card"
        style={{
          background: isSurplus
            ? "radial-gradient(ellipse at top left, rgba(16, 185, 129, 0.18), transparent 70%), linear-gradient(145deg, rgba(26, 11, 46, 0.9), rgba(15, 6, 26, 0.95))"
            : "radial-gradient(ellipse at top left, rgba(239, 68, 68, 0.22), transparent 70%), linear-gradient(145deg, rgba(26, 11, 46, 0.9), rgba(15, 6, 26, 0.95))",
          border: isSurplus ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(239, 68, 68, 0.5)",
          boxShadow: isSurplus
            ? "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 35px rgba(16, 185, 129, 0.15)"
            : "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 35px rgba(239, 68, 68, 0.2)",
        }}
      >
        <div className="finance-hero-content">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.8rem" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  padding: "0.35rem 0.9rem",
                  borderRadius: "20px",
                  background: isSurplus ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  color: isSurplus ? "#34d399" : "#f87171",
                  border: isSurplus ? "1px solid rgba(52, 211, 153, 0.4)" : "1px solid rgba(248, 113, 113, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: isSurplus ? "#34d399" : "#f87171",
                    boxShadow: isSurplus ? "0 0 10px #34d399" : "0 0 10px #f87171",
                  }}
                />
                {isSurplus ? "TREASURY SURPLUS - ACTIVE SOLVENCY" : "TREASURY DEFICIT - EXPENDITURE WARNING"}
              </span>
            </div>

            <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.5px" }}>
              REMAINING TREASURY BALANCE (NET CASH ON HAND)
            </div>

            <div
              className="finance-hero-balance"
              style={{
                color: isSurplus ? "#10b981" : "#ef4444",
                textShadow: isSurplus ? "0 0 25px rgba(16, 185, 129, 0.35)" : "0 0 25px rgba(239, 68, 68, 0.35)",
              }}
            >
              {formatCurrency(netBalance)}
            </div>

            {/* Clear deduction formula */}
            <div className="finance-formula-box">
              <span>Treasury Inflow: <strong style={{ color: "#10b981" }}>+{formatCurrency(summary?.total_income)}</strong></span>
              <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>•</span>
              <span>Deductions: <strong style={{ color: "#ef4444" }}>-{formatCurrency(summary?.total_expense)}</strong></span>
              <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>•</span>
              <span>Remaining: <strong style={{ color: isSurplus ? "#34d399" : "#f87171" }}>{formatCurrency(netBalance)}</strong></span>
            </div>
          </div>

          {/* Quick Stats Block */}
          <div className="finance-solvency-box">
            <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "1px", marginBottom: "0.6rem" }}>
              SOLVENCY METRICS
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8rem", fontSize: "0.9rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>Retained Ratio:</span>
              <span style={{ fontWeight: 700, color: isSurplus ? "#10b981" : "#ef4444" }}>
                {summary && summary.total_income > 0
                  ? `${Math.max(-100, Math.min(100, Math.round((netBalance / summary.total_income) * 100)))}%`
                  : "0%"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8rem", fontSize: "0.9rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>Recorded Entries:</span>
              <span style={{ fontWeight: 700, color: "#ffffff" }}>{summary?.transaction_count ?? 0}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>Active Currency:</span>
              <span style={{ fontWeight: 700, color: "#ffd700" }}>{currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 KPI SUMMARY CARDS */}
      <div className="finance-kpi-grid">
        {/* Total Inflow */}
        <div
          className="finance-kpi-card"
          style={{
            border: "1px solid rgba(16, 185, 129, 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
            <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.5px" }}>
              TOTAL INFLOW & DEPOSITS
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
          </div>
          <div style={{ color: "#10b981", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
            +{formatCurrency(summary?.total_income)}
          </div>
          <div style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "0.82rem" }}>
            Cumulative treasury deposits and income receipts
          </div>
        </div>

        {/* Total Outflow */}
        <div
          className="finance-kpi-card"
          style={{
            border: "1px solid rgba(239, 68, 68, 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
            <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.5px" }}>
              TOTAL EXPENSE DEDUCTIONS
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>
          </div>
          <div style={{ color: "#ef4444", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
            -{formatCurrency(summary?.total_expense)}
          </div>
          <div style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "0.82rem" }}>
            Total family expenditures deducted from the fund
          </div>
        </div>

        {/* Net Retained */}
        <div
          className="finance-kpi-card"
          style={{
            border: "1px solid rgba(255, 215, 0, 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
            <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.5px" }}>
              NET REMAINING BALANCE
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(255, 215, 0, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffd700",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>
          <div style={{ color: isSurplus ? "#ffd700" : "#ef4444", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
            {formatCurrency(netBalance)}
          </div>
          <div style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "0.82rem" }}>
            Exact net reserve funds available after all debits
          </div>
        </div>
      </div>

      {/* ANALYTICS SECTION: CATEGORY & PAYER BREAKDOWNS */}
      <div className="finance-analytics-grid">
        {/* Category Breakdown */}
        <div className="finance-analytics-card">
          <h3 style={{ color: "#ffffff", fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
            Expense Distribution by Category
          </h3>

          {summary && summary.expense_by_category.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {summary.expense_by_category.map((cat, idx) => (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.88rem" }}>
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>{cat.category}</span>
                    <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                      {formatCurrency(cat.amount)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, cat.percentage)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255, 255, 255, 0.4)", fontSize: "0.9rem" }}>
              No expense entries recorded for this period.
            </div>
          )}
        </div>

        {/* Payer Breakdown */}
        <div className="finance-analytics-card">
          <h3 style={{ color: "#ffffff", fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Expenditure Share by Payer
          </h3>

          {summary && summary.expense_by_payer.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {summary.expense_by_payer.map((p, idx) => (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.88rem" }}>
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>{p.payer_name}</span>
                    <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                      {formatCurrency(p.amount)} ({p.percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, p.percentage)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #6366f1, #a855f7)",
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255, 255, 255, 0.4)", fontSize: "0.9rem" }}>
              No payer statistics available for this period.
            </div>
          )}
        </div>
      </div>

      {/* TRANSACTION LEDGER TABLE */}
      <div className="finance-table-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <h3 style={{ color: "#ffffff", fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.2rem" }}>
              Transaction History
            </h3>
            <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.85rem" }}>
              Detailed audit trail of all treasury deposits and family expense deductions
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            {sheetConfig.sheet_url && (
              <a
                href={sheetConfig.sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open your Google Spreadsheet directly in a new tab"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  color: "#4ade80",
                  padding: "0.5rem 1rem",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open Google Sheet
              </a>
            )}

            <button
              onClick={handleOpenSheetModal}
              title="Configure real-time Google Sheets sync and settings"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                background: sheetConfig.webhook_url ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.07)",
                border: sheetConfig.webhook_url ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255, 255, 255, 0.18)",
                color: sheetConfig.webhook_url ? "#60a5fa" : "#cbd5e1",
                padding: "0.5rem 1rem",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
              {sheetConfig.webhook_url ? "Google Sheets (Active)" : "Google Sheets Sync"}
            </button>

            <button
              onClick={handleExportToExcel}
              disabled={displayedTransactions.length === 0}
              title="Export displayed records to Microsoft Excel CSV format"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                color: "#10b981",
                padding: "0.5rem 1.1rem",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: displayedTransactions.length === 0 ? "not-allowed" : "pointer",
                opacity: displayedTransactions.length === 0 ? 0.5 : 1,
                transition: "all 0.2s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export to Excel
            </button>
          </div>
        </div>


        {/* Enhanced Filter Toolbar */}
        <div
          style={{
            background: "rgba(10, 2, 18, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
          }}
        >
          {/* Row 1: Period Tabs & Type Tabs */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.85rem",
            }}
          >
            {/* Period Quick Select */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
                Period:
              </span>
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  padding: "0.2rem",
                  display: "flex",
                  gap: "0.2rem",
                }}
              >
                {(["THIS_MONTH", "ALL", "CUSTOM"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodFilter(p)}
                    style={{
                      background: periodFilter === p ? "rgba(255, 255, 255, 0.15)" : "transparent",
                      color: periodFilter === p ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    {p === "THIS_MONTH" ? "This Month" : p === "ALL" ? "All Time" : "Custom Dates"}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Quick Select */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
                Type:
              </span>
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  padding: "0.2rem",
                  display: "flex",
                  gap: "0.2rem",
                }}
              >
                {(["ALL", "INCOME", "EXPENSE"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    style={{
                      background: typeFilter === t ? "rgba(255, 255, 255, 0.15)" : "transparent",
                      color: typeFilter === t ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    {t === "ALL" ? "All Types" : t === "INCOME" ? "Inflows Only" : "Expenses Only"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Selectors for Payer, Category, and Custom Date Inputs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.85rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            {/* Payer Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <label style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.8rem", fontWeight: 600 }}>
                Payer:
              </label>
              <select
                value={payerFilter}
                onChange={(e) => setPayerFilter(e.target.value)}
                style={{
                  background: "#18092e",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "0.4rem 0.75rem",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {availablePayers.map((p) => (
                  <option key={p} value={p}>
                    {p === "ALL" ? "All Payers" : p}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <label style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.8rem", fontWeight: 600 }}>
                Category:
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  background: "#18092e",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "0.4rem 0.75rem",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: "220px",
                }}
              >
                {allFilterCategories.map((c) => (
                  <option key={c} value={c}>
                    {c === "ALL" ? "All Categories" : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Dates Inputs (shown if periodFilter === "CUSTOM") */}
            {periodFilter === "CUSTOM" && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                <label style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.8rem", fontWeight: 600 }}>
                  From:
                </label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  style={{
                    background: "#18092e",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    padding: "0.35rem 0.6rem",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    outline: "none",
                  }}
                />
                <label style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.8rem", fontWeight: 600 }}>
                  To:
                </label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  style={{
                    background: "#18092e",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    padding: "0.35rem 0.6rem",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {/* Reset Filters button */}
            {isFilteredActive && (
              <button
                onClick={handleResetFilters}
                title="Reset all filters back to default"
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#f87171",
                  padding: "0.38rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Row 3: Active Filter Status Strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.6rem",
              fontSize: "0.8rem",
              color: "rgba(255, 255, 255, 0.6)",
              paddingTop: "0.5rem",
            }}
          >
            <div>
              Showing <span style={{ color: "#ffd700", fontWeight: 800 }}>{filteredMetrics.count}</span> matching {filteredMetrics.count === 1 ? "record" : "records"}
              {payerFilter !== "ALL" && <span> • Payer: <strong style={{ color: "#ffffff" }}>{payerFilter}</strong></span>}
              {categoryFilter !== "ALL" && <span> • Category: <strong style={{ color: "#ffffff" }}>{categoryFilter}</strong></span>}
              {periodFilter === "CUSTOM" && (customDateFrom || customDateTo) && (
                <span> • Range: <strong style={{ color: "#ffffff" }}>{customDateFrom || "Start"} to {customDateTo || "End"}</strong></span>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", fontWeight: 700 }}>
              <span style={{ color: "#10b981" }}>Inflow: +{formatCurrency(filteredMetrics.inflow)}</span>
              <span style={{ color: "#ef4444" }}>Outflow: -{formatCurrency(filteredMetrics.expense)}</span>
              <span style={{ color: filteredMetrics.net >= 0 ? "#ffd700" : "#f87171" }}>
                Net: {formatCurrency(filteredMetrics.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "left" }}>
                <th style={{ padding: "0.85rem 1rem", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, fontSize: "0.78rem" }}>DATE</th>
                <th style={{ padding: "0.85rem 1rem", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, fontSize: "0.78rem" }}>TYPE</th>
                <th style={{ padding: "0.85rem 1rem", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, fontSize: "0.78rem" }}>CATEGORY</th>
                <th style={{ padding: "0.85rem 1rem", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, fontSize: "0.78rem" }}>NOTE / DESCRIPTION</th>
                <th style={{ padding: "0.85rem 1rem", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, fontSize: "0.78rem" }}>PAYER</th>
                <th style={{ padding: "0.85rem 1rem", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, fontSize: "0.78rem", textAlign: "right" }}>AMOUNT</th>
                <th style={{ padding: "0.85rem 1rem", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, fontSize: "0.78rem", textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {displayedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => {
                  const isInc = tx.transaction_type === "INCOME";
                  return (
                    <tr
                      key={tx.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      <td style={{ padding: "1rem", color: "rgba(255, 255, 255, 0.75)", whiteSpace: "nowrap" }}>
                        {tx.transaction_date}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "0.25rem 0.6rem",
                            borderRadius: "6px",
                            background: isInc ? "rgba(16, 185, 129, 0.18)" : "rgba(239, 68, 68, 0.18)",
                            color: isInc ? "#34d399" : "#f87171",
                            border: isInc ? "1px solid rgba(52, 211, 153, 0.3)" : "1px solid rgba(248, 113, 113, 0.3)",
                          }}
                        >
                          {isInc ? "INCOME" : "EXPENSE"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", color: "#ffffff", fontWeight: 600 }}>{tx.category}</td>
                      <td style={{ padding: "1rem", color: "rgba(255, 255, 255, 0.7)" }}>
                        {tx.description || <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>-</span>}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "rgba(255, 255, 255, 0.85)",
                            padding: "0.25rem 0.55rem",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                          }}
                        >
                          {tx.payer_name}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          textAlign: "right",
                          fontWeight: 800,
                          color: isInc ? "#10b981" : "#ef4444",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isInc ? "+" : "-"}{formatCurrency(tx.amount)}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.45rem" }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(tx)}
                            title="Edit transaction"
                            style={{
                              background: "rgba(56, 189, 248, 0.12)",
                              border: "1px solid rgba(56, 189, 248, 0.35)",
                              color: "#38bdf8",
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            title="Delete transaction"
                            style={{
                              background: "rgba(239, 68, 68, 0.12)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              color: "#ef4444",
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem 1rem", textAlign: "center", color: "rgba(255, 255, 255, 0.4)" }}>
                    No transactions found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {displayedTransactions.length > 0 && (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              fontSize: "0.85rem",
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            {/* Left info & Page Size */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap" }}>
              <div>
                Showing{" "}
                <span style={{ color: "#ffd700", fontWeight: 700 }}>
                  {(currentPage - 1) * pageSize + 1}
                </span>
                {" – "}
                <span style={{ color: "#ffd700", fontWeight: 700 }}>
                  {Math.min(currentPage * pageSize, displayedTransactions.length)}
                </span>{" "}
                of{" "}
                <span style={{ color: "#ffffff", fontWeight: 700 }}>
                  {displayedTransactions.length}
                </span>{" "}
                records
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.8rem" }}>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    background: "#18092e",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right page buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous page"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: currentPage === 1 ? "rgba(255, 255, 255, 0.3)" : "#ffffff",
                  padding: "0.35rem 0.65rem",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Prev</span>
              </button>

              {getPageNumbers().map((item, idx) => {
                if (item === "...") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      style={{
                        padding: "0 0.4rem",
                        color: "rgba(255, 255, 255, 0.4)",
                        fontWeight: 700,
                        userSelect: "none",
                      }}
                    >
                      ...
                    </span>
                  );
                }

                const pageNum = Number(item);
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      minWidth: "32px",
                      height: "32px",
                      padding: "0 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: isActive ? 800 : 600,
                      cursor: "pointer",
                      background: isActive
                        ? "linear-gradient(135deg, #ffd700, #f59e0b)"
                        : "rgba(255, 255, 255, 0.08)",
                      border: isActive ? "none" : "1px solid rgba(255, 255, 255, 0.12)",
                      color: isActive ? "#000000" : "#ffffff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next page"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: currentPage === totalPages ? "rgba(255, 255, 255, 0.3)" : "#ffffff",
                  padding: "0.35rem 0.65rem",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span>Next</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECORD TRANSACTION MODAL */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div className="finance-modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ color: "#ffffff", fontSize: "1.35rem", fontWeight: 800 }}>
                {editingId
                  ? "Edit Transaction Record"
                  : modalType === "INCOME"
                  ? "Deposit to Treasury"
                  : "Record Expense Deduction"}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  cursor: "pointer",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Type selector toggle */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "0.3rem",
                borderRadius: "12px",
                marginBottom: "1.5rem",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setModalType("INCOME");
                  setCategory("Treasury Deposit");
                }}
                style={{
                  background: modalType === "INCOME" ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
                  color: modalType === "INCOME" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                  border: "none",
                  padding: "0.6rem",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                + Income / Deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType("EXPENSE");
                  setCategory("Food & Groceries");
                }}
                style={{
                  background: modalType === "EXPENSE" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "transparent",
                  color: modalType === "EXPENSE" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                  border: "none",
                  padding: "0.6rem",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                - Expense Deduction
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {/* Amount */}
              <div>
                <label style={{ display: "block", color: "rgba(255, 255, 255, 0.8)", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  AMOUNT (LAK ₭) *
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(0, 0, 0, 0.35)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      padding: "0.75rem 1rem",
                      color: "#ffffff",
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "rgba(255, 255, 255, 0.5)",
                      fontWeight: 700,
                    }}
                  >
                    ₭ LAK
                  </span>
                </div>
              </div>

              {/* Category */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <label style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.82rem", fontWeight: 700 }}>
                    CATEGORY *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCategory(!isAddingNewCategory);
                      setNewCategoryInput("");
                    }}
                    style={{
                      background: "rgba(255, 215, 0, 0.12)",
                      border: "1px solid rgba(255, 215, 0, 0.3)",
                      color: "#ffd700",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "6px",
                    }}
                  >
                    {isAddingNewCategory ? "Choose Existing" : "+ Add Custom Category"}
                  </button>
                </div>

                {isAddingNewCategory ? (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Enter new category (e.g. Pet Care, Merit, Parents Support...)"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewCategory();
                        }
                      }}
                      style={{
                        flex: 1,
                        background: "rgba(0, 0, 0, 0.35)",
                        border: "1px solid #ffd700",
                        borderRadius: "10px",
                        padding: "0.75rem 1rem",
                        color: "#ffffff",
                        fontSize: "0.95rem",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNewCategory()}
                      disabled={!newCategoryInput.trim()}
                      style={{
                        background: newCategoryInput.trim() ? "linear-gradient(135deg, #ffd700, #f59e0b)" : "rgba(255, 255, 255, 0.1)",
                        color: newCategoryInput.trim() ? "#000000" : "rgba(255, 255, 255, 0.4)",
                        border: "none",
                        padding: "0.75rem 1.1rem",
                        borderRadius: "10px",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: newCategoryInput.trim() ? "pointer" : "not-allowed",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "__NEW_CATEGORY__") {
                        setIsAddingNewCategory(true);
                        setNewCategoryInput("");
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    style={{
                      width: "100%",
                      background: "#18092e",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      padding: "0.75rem 1rem",
                      color: "#ffffff",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__NEW_CATEGORY__" style={{ color: "#ffd700", fontWeight: 700 }}>
                      + Create New Category...
                    </option>
                  </select>
                )}

                {customCategoriesForType.length > 0 && !isAddingNewCategory && (
                  <div style={{ marginTop: "0.6rem" }}>
                    <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.75rem", marginBottom: "0.35rem" }}>
                      Custom Categories (Click × to delete):
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {customCategoriesForType.map((cat) => (
                        <span
                          key={cat}
                          style={{
                            background: "rgba(255, 215, 0, 0.1)",
                            border: "1px solid rgba(255, 215, 0, 0.25)",
                            color: "#ffd700",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          {cat}
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomCategory(cat)}
                            title={`Remove category "${cat}"`}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              fontWeight: 800,
                              fontSize: "0.85rem",
                              lineHeight: 1,
                              padding: "0 0.15rem",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payer */}
              <div>
                <label style={{ display: "block", color: "rgba(255, 255, 255, 0.8)", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  PAYER / BENEFICIARY *
                </label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: payerName === "Other" ? "0.5rem" : "0" }}>
                  {PAYER_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPayerName(p)}
                      style={{
                        background: payerName === p ? "linear-gradient(135deg, #ffd700, #f59e0b)" : "rgba(255, 255, 255, 0.08)",
                        color: payerName === p ? "#000000" : "#ffffff",
                        border: "none",
                        padding: "0.45rem 0.9rem",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {payerName === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom payer name"
                    value={customPayer}
                    onChange={(e) => setCustomPayer(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(0, 0, 0, 0.35)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      padding: "0.65rem 1rem",
                      color: "#ffffff",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  />
                )}
              </div>

              {/* Transaction Date */}
              <div>
                <label style={{ display: "block", color: "rgba(255, 255, 255, 0.8)", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  DATE *
                </label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Description / Note */}
              <div>
                <label style={{ display: "block", color: "rgba(255, 255, 255, 0.8)", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  NOTE / PURPOSE (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly electricity, Lotus supermarket, school tuition..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "rgba(255, 255, 255, 0.8)",
                    border: "none",
                    padding: "0.85rem",
                    borderRadius: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1.5,
                    background:
                      modalType === "INCOME"
                        ? "linear-gradient(135deg, #10b981, #059669)"
                        : "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#ffffff",
                    border: "none",
                    padding: "0.85rem",
                    borderRadius: "12px",
                    fontWeight: 700,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow:
                      modalType === "INCOME"
                        ? "0 4px 20px rgba(16, 185, 129, 0.35)"
                        : "0 4px 20px rgba(239, 68, 68, 0.35)",
                  }}
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingId
                    ? "Update Transaction"
                    : modalType === "INCOME"
                    ? "Confirm Deposit"
                    : "Record Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOOGLE SHEETS SYNC MODAL */}
      {isSheetModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            className="finance-modal-content"
            style={{
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#4ade80",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                    <line x1="8" y1="17" x2="16" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ color: "#ffffff", fontSize: "1.25rem", fontWeight: 800 }}>
                    Google Sheets Synchronization
                  </h3>
                  <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.8rem" }}>
                    Real-time linking and automated export to your Google Spreadsheet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSheetModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  cursor: "pointer",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Tabs: Settings vs Instructions */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "0.3rem",
                borderRadius: "12px",
                marginBottom: "1.25rem",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveGuideTab("settings")}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: activeGuideTab === "settings" ? "rgba(99, 102, 241, 0.25)" : "transparent",
                  color: activeGuideTab === "settings" ? "#a5b4fc" : "rgba(255, 255, 255, 0.5)",
                }}
              >
                Configuration
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab("instructions")}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: activeGuideTab === "instructions" ? "rgba(99, 102, 241, 0.25)" : "transparent",
                  color: activeGuideTab === "instructions" ? "#a5b4fc" : "rgba(255, 255, 255, 0.5)",
                }}
              >
                Setup Guide & Script
              </button>
            </div>

            {/* Status Feedback Banner */}
            {sheetStatusMessage && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  marginBottom: "1.25rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background:
                    sheetStatusMessage.type === "success"
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                  border:
                    sheetStatusMessage.type === "success"
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid rgba(239, 68, 68, 0.4)",
                  color: sheetStatusMessage.type === "success" ? "#34d399" : "#f87171",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{sheetStatusMessage.text}</span>
                <button
                  type="button"
                  onClick={() => setSheetStatusMessage(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* TAB 1: CONFIGURATION */}
            {activeGuideTab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", color: "rgba(255, 255, 255, 0.8)", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                    Google Spreadsheet Link (Direct View)
                  </label>
                  <input
                    type="url"
                    value={inputSheetUrl}
                    onChange={(e) => setInputSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#ffffff",
                      fontSize: "0.9rem",
                    }}
                  />
                  <p style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "0.75rem", marginTop: "0.3rem" }}>
                    Enables the "Open Google Sheet" button directly in Transaction History for instant access.
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", color: "rgba(255, 255, 255, 0.8)", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                    Google Apps Script Webhook URL
                  </label>
                  <input
                    type="url"
                    value={inputWebhookUrl}
                    onChange={(e) => setInputWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#ffffff",
                      fontSize: "0.9rem",
                    }}
                  />
                  <p style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "0.75rem", marginTop: "0.3rem" }}>
                    The Web App URL deployed from your Google Sheet Apps Script.
                  </p>
                </div>

                {/* Auto-Sync Switch */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.85rem 1rem",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div style={{ color: "#ffffff", fontSize: "0.9rem", fontWeight: 700 }}>
                      Automatic Real-time Sync
                    </div>
                    <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.75rem" }}>
                      Automatically sync every new income or expense transaction to Google Sheets when saved
                    </div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: "48px", height: "26px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={inputAutoSync}
                      onChange={(e) => setInputAutoSync(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: inputAutoSync ? "#6366f1" : "rgba(255, 255, 255, 0.2)",
                        borderRadius: "26px",
                        transition: "0.3s",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          content: '""',
                          height: "20px",
                          width: "20px",
                          left: inputAutoSync ? "24px" : "3px",
                          bottom: "3px",
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "0.3s",
                        }}
                      />
                    </span>
                  </label>
                </div>

                {/* Button Controls */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={handleSaveSheetConfig}
                    disabled={isSavingSheetConfig}
                    style={{
                      flex: 1,
                      padding: "0.75rem 1.25rem",
                      background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      border: "none",
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: isSavingSheetConfig ? "not-allowed" : "pointer",
                      opacity: isSavingSheetConfig ? 0.7 : 1,
                    }}
                  >
                    {isSavingSheetConfig ? "Saving..." : "Save Configuration"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSheetConnection}
                    disabled={isTestingSheet || !inputWebhookUrl.trim()}
                    style={{
                      padding: "0.75rem 1.15rem",
                      background: "rgba(59, 130, 246, 0.15)",
                      border: "1px solid rgba(59, 130, 246, 0.4)",
                      borderRadius: "10px",
                      color: "#60a5fa",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: isTestingSheet || !inputWebhookUrl.trim() ? "not-allowed" : "pointer",
                      opacity: !inputWebhookUrl.trim() ? 0.5 : 1,
                    }}
                  >
                    {isTestingSheet ? "Testing..." : "Test Connection"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncAllToSheet}
                    disabled={isSyncingAll || !sheetConfig.webhook_url}
                    style={{
                      padding: "0.75rem 1.15rem",
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      borderRadius: "10px",
                      color: "#34d399",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: isSyncingAll || !sheetConfig.webhook_url ? "not-allowed" : "pointer",
                      opacity: !sheetConfig.webhook_url ? 0.5 : 1,
                    }}
                  >
                    {isSyncingAll ? "Syncing..." : "Sync All Records"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SETUP GUIDE & SCRIPT */}
            {activeGuideTab === "instructions" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "1rem",
                    fontSize: "0.85rem",
                    color: "rgba(255, 255, 255, 0.8)",
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#ffffff", marginBottom: "0.5rem" }}>
                    Quick 4-Step Setup Guide
                  </div>
                  <ol style={{ paddingLeft: "1.25rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <li>
                      Create a new Google Sheet at <strong style={{ color: "#a5b4fc" }}>sheets.google.com</strong> or open your existing sheet.
                    </li>
                    <li>
                      In Google Sheet top menu, click <strong>Extensions (ส่วนขยาย)</strong> &rarr; <strong>Apps Script</strong>.
                    </li>
                    <li>
                      Replace everything in the code editor with the script below, then press <strong>Save (Ctrl+S)</strong>.
                    </li>
                    <li>
                      Click <strong>Deploy (ทำให้ใช้งานได้)</strong> &rarr; <strong>New deployment (การทำให้ใช้งานได้ใหม่)</strong>:
                      <ul style={{ paddingLeft: "1rem", marginTop: "0.2rem" }}>
                        <li>Type: <strong>Web app (เว็บแอป)</strong></li>
                        <li>Execute as: <strong>Me (ฉัน)</strong></li>
                        <li>Who has access: <strong>Anyone (ทุกคน)</strong></li>
                      </ul>
                      Click <strong>Deploy</strong> &rarr; Copy the generated <strong>Web app URL</strong> and paste it into the Configuration tab!
                    </li>
                  </ol>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "0.8rem", fontWeight: 700 }}>
                      Google Apps Script Code (Ready to Copy)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.35rem 0.75rem",
                        borderRadius: "8px",
                        background: copiedScript ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.2)",
                        border: copiedScript ? "1px solid rgba(16, 185, 129, 0.5)" : "1px solid rgba(99, 102, 241, 0.4)",
                        color: copiedScript ? "#34d399" : "#a5b4fc",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {copiedScript ? "Copied to Clipboard!" : "Copy Script"}
                    </button>
                  </div>
                  <pre
                    style={{
                      background: "rgba(0, 0, 0, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "10px",
                      padding: "0.85rem",
                      fontSize: "0.76rem",
                      color: "#e2e8f0",
                      maxHeight: "220px",
                      overflowY: "auto",
                      fontFamily: "monospace",
                      lineHeight: 1.45,
                    }}
                  >
                    <code>{GOOGLE_APPS_SCRIPT_CODE}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
