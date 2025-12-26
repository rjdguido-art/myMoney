"use client";

import { useCallback, useMemo, useState } from "react";
import type { BillStatus, Frequency } from "@prisma/client";

type AccountOption = { id: string; name: string; currency?: string };
type CategoryOption = { id: string; name: string; type: string };

type SerializableBill = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  dueDate: string;
  frequency: Frequency;
  status: BillStatus;
  autopay: boolean;
  reminderDays: number;
  account: { id: string; name: string } | null;
  category: { id: string; name: string; type: string } | null;
};

type FormState = {
  name: string;
  amount: string;
  dueDate: string;
  frequency: Frequency;
  status: BillStatus;
  autopay: boolean;
  reminderDays: string;
  accountId: string;
  categoryId: string;
};

type ApiResponse = {
  bills: SerializableBill[];
  accounts: AccountOption[];
  categories: CategoryOption[];
};

const statusTone: Record<BillStatus, string> = {
  PENDING: "bg-ink/5 text-ink border-border",
  SCHEDULED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  PAID: "bg-sky-500/10 text-navy-700 border-navy-500/30",
  OVERDUE: "bg-red-500/10 text-red-700 border-red-400/40",
};

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount: number, currency?: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function emptyForm(defaultAccount?: string): FormState {
  return {
    name: "",
    amount: "",
    dueDate: new Date().toISOString().slice(0, 10),
    frequency: "MONTHLY",
    status: "PENDING",
    autopay: false,
    reminderDays: "3",
    accountId: defaultAccount ?? "",
    categoryId: "",
  };
}

export function BillsClient({
  initialBills,
  accounts: initialAccounts,
  categories: initialCategories,
}: {
  initialBills: SerializableBill[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [bills, setBills] = useState(initialBills);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [categories, setCategories] = useState(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SerializableBill | null>(null);
  const [formState, setFormState] = useState<FormState>(
    emptyForm(initialAccounts[0]?.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === formState.accountId),
    [accounts, formState.accountId],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bills", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load bills");
      }
      const data = (await res.json()) as ApiResponse;
      setBills(data.bills);
      setAccounts(data.accounts);
      setCategories(data.categories);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load bills";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    setError(null);
    const numericAmount = Number(formState.amount);
    if (!formState.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (Number.isNaN(numericAmount)) {
      setError("Amount must be numeric.");
      return;
    }
    if (!formState.dueDate) {
      setError("Due date is required.");
      return;
    }
    const reminderDays = Number(formState.reminderDays || 0);
    if (Number.isNaN(reminderDays) || reminderDays < 0) {
      setError("Reminder days must be zero or positive.");
      return;
    }

    const payload = {
      name: formState.name,
      amount: numericAmount,
      currency: selectedAccount?.currency ?? "USD",
      dueDate: formState.dueDate,
      frequency: formState.frequency,
      status: formState.status,
      autopay: formState.autopay,
      reminderDays,
      accountId: formState.accountId || null,
      categoryId: formState.categoryId || null,
    };

    setSubmitting(true);
    try {
      const url = editing ? `/api/bills/${editing.id}` : "/api/bills";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Unable to save bill");
      }
      await refresh();
      setShowForm(false);
      setEditing(null);
      setFormState(emptyForm(accounts[0]?.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save bill";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this bill?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to delete bill");
      }
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete bill";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const startCreate = () => {
    setEditing(null);
    setFormState(emptyForm(accounts[0]?.id));
    setShowForm(true);
  };

  const startEdit = (bill: SerializableBill) => {
    setEditing(bill);
    setFormState({
      name: bill.name,
      amount: String(bill.amount),
      dueDate: bill.dueDate.slice(0, 10),
      frequency: bill.frequency,
      status: bill.status,
      autopay: bill.autopay,
      reminderDays: String(bill.reminderDays),
      accountId: bill.account?.id ?? "",
      categoryId: bill.category?.id ?? "",
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Bills</h1>
          <p className="text-muted">
            Stay ahead of due dates and automate recurring payments with reminders.
          </p>
        </div>
        <button
          className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_28px_rgba(34,197,143,0.35)] hover:brightness-105"
          onClick={startCreate}
        >
          Add bill
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_12px_32px_rgba(13,56,95,0.08)]">
        <div className="grid grid-cols-7 bg-surface px-6 py-3 text-sm font-medium text-muted">
          <p>Name</p>
          <p>Due date</p>
          <p className="text-right">Amount</p>
          <p>Frequency</p>
          <p>Reminder</p>
          <p>Autopay</p>
          <p className="text-right">Actions</p>
        </div>
        <div className="divide-y divide-border/70">
          {bills.length === 0 ? (
            <div className="px-6 py-6 text-sm text-muted">
              No bills added yet. Create one to get reminders.
            </div>
          ) : (
            bills.map((bill) => (
              <div
                key={bill.id}
                className="grid grid-cols-7 items-center gap-2 px-6 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold text-ink">{bill.name}</p>
                  <p className="text-xs text-muted">
                    {bill.category?.name ?? "Uncategorized"}
                  </p>
                </div>
                <p className="text-muted">{formatDate(bill.dueDate)}</p>
                <p className="text-right font-semibold text-ink">
                  {formatMoney(bill.amount, bill.currency)}
                </p>
                <p className="text-muted">{bill.frequency}</p>
                <p className="text-muted">{bill.reminderDays} days before</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    {bill.autopay ? "Enabled" : "Manual"}
                  </span>
                  <span
                    className={`pill border text-xs font-semibold ${statusTone[bill.status]}`}
                  >
                    {bill.status.toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-lg border border-border/80 px-3 py-1 text-xs text-ink hover:border-emerald-500/50"
                    onClick={() => startEdit(bill)}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-700 hover:border-red-400"
                    onClick={() => void handleDelete(bill.id)}
                    disabled={submitting}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {loading ? (
          <div className="px-6 py-3 text-sm text-muted">Loading...</div>
        ) : null}
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur">
          <div className="w-full max-w-3xl rounded-2xl border border-border/70 bg-card p-6 shadow-[0_16px_40px_rgba(5,63,43,0.16)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">
                  {editing ? "Edit bill" : "Add bill"}
                </p>
                <h2 className="text-xl font-semibold text-ink">
                  {editing?.name ?? "New bill"}
                </h2>
              </div>
              <button
                className="text-sm text-muted hover:text-ink"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setFormState(emptyForm(accounts[0]?.id));
                }}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm text-muted">Name</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder="Rent, internet, subscription..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Amount</label>
                <input
                  type="number"
                  value={formState.amount}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Due date</label>
                <input
                  type="date"
                  value={formState.dueDate}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Frequency</label>
                <select
                  value={formState.frequency}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      frequency: e.target.value as Frequency,
                    }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Biweekly</option>
                  <option value="SEMIMONTHLY">Semimonthly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Reminder days</label>
                <input
                  type="number"
                  min={0}
                  value={formState.reminderDays}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      reminderDays: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Status</label>
                <select
                  value={formState.status}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: e.target.value as BillStatus,
                    }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                >
                  <option value="PENDING">Pending</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Account</label>
                <select
                  value={formState.accountId}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      accountId: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Category</label>
                <select
                  value={formState.categoryId}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="autopay"
                  type="checkbox"
                  checked={formState.autopay}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, autopay: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border/80 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="autopay" className="text-sm text-ink">
                  Autopay enabled
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-muted">
                {submitting ? "Saving..." : "Reminders use the reminderDays lead time."}
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg border border-border/80 px-4 py-2 text-sm text-ink hover:border-emerald-500/50"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    setFormState(emptyForm(accounts[0]?.id));
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(34,197,143,0.35)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {editing ? "Save changes" : "Add bill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
