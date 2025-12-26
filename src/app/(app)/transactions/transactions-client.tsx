"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SerializableTransaction } from "@/lib/transactions";

type AccountOption = { id: string; name: string; currency?: string };
type CategoryOption = { id: string; name: string; type: string };

type Filters = {
  from: string;
  to: string;
  categoryId: string;
  accountId: string;
  search: string;
};

type SplitLine = {
  id: string;
  categoryId: string;
  amount: string;
  note: string;
};

type FormState = {
  description: string;
  notes: string;
  amount: string;
  postedAt: string;
  accountId: string;
  categoryId: string;
  splits: SplitLine[];
};

type TransactionResponse = {
  transactions: SerializableTransaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
};

const statusTone: Record<string, string> = {
  CLEARED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  PENDING: "bg-navy-500/10 text-navy-700 border-navy-500/30",
  SETTLED: "bg-ink/5 text-ink border-border",
};

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatAmount(amount: number, currency?: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return formatter.format(amount);
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function emptyForm(defaultAccount?: string): FormState {
  return {
    description: "",
    notes: "",
    amount: "",
    postedAt: new Date().toISOString().slice(0, 10),
    accountId: defaultAccount ?? "",
    categoryId: "",
    splits: [],
  };
}

export function TransactionsClient({
  initialTransactions,
  accounts: initialAccounts,
  categories: initialCategories,
}: {
  initialTransactions: SerializableTransaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [categories, setCategories] = useState(initialCategories);
  const [filters, setFilters] = useState<Filters>({
    from: "",
    to: "",
    categoryId: "",
    accountId: "",
    search: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SerializableTransaction | null>(null);
  const [formState, setFormState] = useState<FormState>(
    emptyForm(initialAccounts[0]?.id),
  );
  const [submitting, setSubmitting] = useState(false);
  const mounted = useRef(false);

  const splitTotal = useMemo(
    () =>
      formState.splits.reduce(
        (sum, split) => sum + (Number(split.amount) || 0),
        0,
      ),
    [formState.splits],
  );

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === formState.accountId),
    [accounts, formState.accountId],
  );

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      void refreshTransactions();
    }, 250);
    return () => clearTimeout(timer);
  }, [refreshTransactions]);

  const refreshTransactions = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.accountId) params.set("accountId", filters.accountId);
    if (filters.search) params.set("search", filters.search);

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load transactions");
      }
      const data = (await res.json()) as TransactionResponse;
      setTransactions(data.transactions);
      setAccounts(data.accounts);
      setCategories(data.categories);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load transactions";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleSubmit = async () => {
    setError(null);
    const numericAmount = Number(formState.amount);
    if (!formState.description.trim()) {
      setError("Merchant is required.");
      return;
    }
    if (!formState.accountId) {
      setError("Account is required.");
      return;
    }
    if (!formState.postedAt) {
      setError("Date is required.");
      return;
    }
    if (Number.isNaN(numericAmount)) {
      setError("Amount must be a number.");
      return;
    }
    if (formState.splits.length) {
      const difference = Math.abs(splitTotal - numericAmount);
      if (difference > 0.01) {
        setError("Split totals must equal the transaction amount.");
        return;
      }
    }

    const payload = {
      description: formState.description,
      notes: formState.notes || null,
      amount: numericAmount,
      postedAt: formState.postedAt,
      status: editing?.status ?? "CLEARED",
      accountId: formState.accountId,
      categoryId: formState.categoryId || null,
      splits: formState.splits
        .filter((line) => line.amount)
        .map((line) => ({
          categoryId: line.categoryId || null,
          amount: Number(line.amount),
          note: line.note || null,
        })),
    };

    setSubmitting(true);
    setError(null);

    try {
      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Unable to save transaction");
      }

      await refreshTransactions();
      setShowForm(false);
      setEditing(null);
      setFormState(emptyForm(accounts[0]?.id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save transaction";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this transaction?")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to delete transaction");
      }
      await refreshTransactions();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete transaction";
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

  const startEdit = (tx: SerializableTransaction) => {
    setEditing(tx);
    setFormState({
      description: tx.description ?? "",
      notes: tx.notes ?? "",
      amount: String(tx.amount),
      postedAt: tx.postedAt.slice(0, 10),
      accountId: tx.account.id,
      categoryId: tx.category?.id ?? "",
      splits: tx.splits.map((split) => ({
        id: split.id,
        categoryId: split.category?.id ?? "",
        amount: String(split.amount),
        note: split.note ?? "",
      })),
    });
    setShowForm(true);
  };

  const addSplitLine = () => {
    setFormState((prev) => ({
      ...prev,
      splits: [
        ...prev.splits,
        { id: crypto.randomUUID(), categoryId: "", amount: "", note: "" },
      ],
    }));
  };

  const removeSplitLine = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      splits: prev.splits.filter((line) => line.id !== id),
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Transactions</h1>
          <p className="text-muted">
            Filter, add, split, and clean every inflow and outflow in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="pill border-border/80 bg-card text-ink hover:border-emerald-500/50"
            onClick={startCreate}
          >
            Quick add
          </button>
          <button className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_28px_rgba(34,197,143,0.35)] hover:brightness-105">
            Import CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-[0_12px_32px_rgba(13,56,95,0.08)]">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <label className="text-sm text-muted">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, from: e.target.value }))
              }
              className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, to: e.target.value }))
              }
              className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">Category</label>
            <select
              value={filters.categoryId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, categoryId: e.target.value }))
              }
              className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">Account</label>
            <select
              value={filters.accountId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, accountId: e.target.value }))
              }
              className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">Merchant or note</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search..."
              className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_12px_32px_rgba(13,56,95,0.08)]">
        <div className="grid grid-cols-7 bg-surface px-6 py-3 text-sm font-medium text-muted">
          <p>Merchant</p>
          <p>Category</p>
          <p className="text-right">Amount</p>
          <p>Account</p>
          <p>Date</p>
          <p className="text-right">Status</p>
          <p className="text-right">Actions</p>
        </div>
        <div className="divide-y divide-border/70">
          {transactions.length === 0 ? (
            <div className="px-6 py-6 text-sm text-muted">
              No transactions match these filters.
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-7 items-start gap-2 px-6 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {tx.description || "Untitled"}
                  </p>
                  {tx.notes ? (
                    <p className="text-xs text-muted">Note: {tx.notes}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-muted">
                    {tx.splits.length
                      ? `Split across ${tx.splits.length} categories`
                      : tx.category?.name ?? "Uncategorized"}
                  </p>
                  {tx.splits.length ? (
                    <p className="text-xs text-muted">
                      {tx.splits
                        .map((split) => {
                          const name = split.category?.name ?? "Uncategorized";
                          return `${name} (${formatAmount(split.amount, tx.currency)})`;
                        })
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
                <p className="text-right font-semibold text-ink">
                  {formatAmount(tx.amount, tx.currency)}
                </p>
                <p className="text-muted">{tx.account.name}</p>
                <p className="text-muted">{formatDate(tx.postedAt)}</p>
                <div className="flex justify-end">
                  <span
                    className={`pill border ${statusTone[tx.status] ?? ""} text-xs font-semibold`}
                  >
                    {tx.status.toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-lg border border-border/80 px-3 py-1 text-xs text-ink hover:border-emerald-500/50"
                    onClick={() => startEdit(tx)}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-700 hover:border-red-400"
                    onClick={() => void handleDelete(tx.id)}
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
                  {editing ? "Edit transaction" : "Quick add"}
                </p>
                <h2 className="text-xl font-semibold text-ink">
                  {editing?.description ?? "New transaction"}
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
                <label className="text-sm text-muted">Date</label>
                <input
                  type="date"
                  value={formState.postedAt}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      postedAt: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Merchant</label>
                <input
                  type="text"
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder="Coffee shop, rent, paycheck..."
                />
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
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm text-muted">Note</label>
                <textarea
                  value={formState.notes}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder="Optional notes"
                />
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
            </div>

            <div className="mt-6 space-y-3 rounded-xl border border-border/70 bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Splits</p>
                  <p className="text-xs text-muted">
                    Optional: distribute across multiple categories
                  </p>
                </div>
                <button
                  onClick={addSplitLine}
                  className="text-sm text-emerald-700 hover:underline"
                >
                  Add split line
                </button>
              </div>
              {formState.splits.length === 0 ? (
                <p className="text-xs text-muted">
                  No splits added. The entire amount will stay on the selected category.
                </p>
              ) : (
                <div className="space-y-3">
                  {formState.splits.map((split) => (
                    <div
                      key={split.id}
                      className="grid gap-3 md:grid-cols-[2fr_1fr_2fr_auto]"
                    >
                      <select
                        value={split.categoryId}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            splits: prev.splits.map((line) =>
                              line.id === split.id
                                ? { ...line, categoryId: e.target.value }
                                : line,
                            ),
                          }))
                        }
                        className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={split.amount}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            splits: prev.splits.map((line) =>
                              line.id === split.id
                                ? { ...line, amount: e.target.value }
                                : line,
                            ),
                          }))
                        }
                        placeholder="0.00"
                        className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={split.note}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            splits: prev.splits.map((line) =>
                              line.id === split.id
                                ? { ...line, note: e.target.value }
                                : line,
                            ),
                          }))
                        }
                        placeholder="Note"
                        className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        onClick={() => removeSplitLine(split.id)}
                        className="text-xs text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
                    <p className="text-muted">
                      Split total:{" "}
                      {formatAmount(
                        splitTotal,
                        selectedAccount?.currency ?? accounts[0]?.currency,
                      )}
                    </p>
                    <p
                      className={
                        Math.abs(splitTotal - Number(formState.amount || 0)) < 0.01
                          ? "text-emerald-700"
                          : "text-red-700"
                      }
                    >
                      {Math.abs(splitTotal - Number(formState.amount || 0)) < 0.01
                        ? "Ready to save"
                        : "Split total must match amount"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-muted">
                {submitting ? "Saving..." : "Validation handled server-side with zod"}
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
                  {editing ? "Save changes" : "Add transaction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
