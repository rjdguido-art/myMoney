"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const QUICK_ADD_EVENT = "open-quick-transaction";

type AccountOption = { id: string; name: string; currency?: string };
type CategoryOption = { id: string; name: string; type: string };

type FormState = {
  description: string;
  amount: string;
  postedAt: string;
  accountId: string;
  categoryId: string;
  notes: string;
};

function emptyForm(defaultAccount?: string): FormState {
  return {
    description: "",
    amount: "",
    postedAt: new Date().toISOString().slice(0, 10),
    accountId: defaultAccount ?? "",
    categoryId: "",
    notes: "",
  };
}

export function QuickAddTransactionModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [formState, setFormState] = useState<FormState>(emptyForm());

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions/meta", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load accounts and categories");
      }
      const data = (await res.json()) as {
        accounts: AccountOption[];
        categories: CategoryOption[];
      };
      setAccounts(data.accounts);
      setCategories(data.categories);
      setFormState((prev) => ({
        ...prev,
        accountId: prev.accountId || data.accounts[0]?.id || "",
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      if (!accounts.length && !loading) {
        void loadMeta();
      }
    };
    window.addEventListener(QUICK_ADD_EVENT, handler);
    return () => window.removeEventListener(QUICK_ADD_EVENT, handler);
  }, [accounts.length, loadMeta, loading]);

  const closeModal = () => {
    setOpen(false);
    setError(null);
  };

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit = useMemo(() => {
    return (
      formState.description.trim().length > 0 &&
      Number(formState.amount) > 0 &&
      Boolean(formState.postedAt) &&
      Boolean(formState.accountId)
    );
  }, [formState]);

  const handleSubmit = async () => {
    setError(null);
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
    if (Number(formState.amount) <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        description: formState.description.trim(),
        amount: Number(formState.amount),
        postedAt: formState.postedAt,
        accountId: formState.accountId,
        categoryId: formState.categoryId || null,
        notes: formState.notes.trim() || null,
      };
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to save transaction");
      }
      setFormState(emptyForm(formState.accountId));
      setOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save transaction";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Quick add transaction</h2>
            <p className="text-sm text-muted">
              Add a single expense or income without leaving your current page.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-sm border border-slate-200/70 px-3 py-1 text-sm text-ink hover:bg-card"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-border/60" />
            <div className="h-10 w-full rounded bg-border/60" />
            <div className="h-10 w-full rounded bg-border/60" />
            <div className="h-10 w-full rounded bg-border/60" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {accounts.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-white p-4 text-sm text-muted">
                Add an account during onboarding to start recording transactions.
              </div>
            ) : null}
            <div className="space-y-1">
              <label className="text-sm text-ink">Merchant</label>
              <input
                value={formState.description}
                onChange={(event) => updateField("description", event.target.value)}
                className="w-full rounded-sm border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                placeholder="Coffee Shop"
                title="Used to label and categorize this transaction."
              />
              <p className="text-xs text-muted">Helps you recognize the transaction later.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm text-ink">Amount</label>
                <input
                  value={formState.amount}
                  onChange={(event) => updateField("amount", event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-sm border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder="0.00"
                  title="Used to track spending and budget usage."
                />
                <p className="text-xs text-muted">This powers safe-to-spend and budget totals.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-ink">Date</label>
                <input
                  value={formState.postedAt}
                  onChange={(event) => updateField("postedAt", event.target.value)}
                  type="date"
                  className="w-full rounded-sm border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  title="Determines which pay period and month this counts toward."
                />
                <p className="text-xs text-muted">Keeps reports accurate by period.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm text-ink">Account</label>
                <select
                  value={formState.accountId}
                  onChange={(event) => updateField("accountId", event.target.value)}
                  className="w-full rounded-sm border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  title="Links the transaction to the account balance."
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted">Required to keep balances in sync.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-ink">Category</label>
                <select
                  value={formState.categoryId}
                  onChange={(event) => updateField("categoryId", event.target.value)}
                  className="w-full rounded-sm border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  title="Improves budgeting and insights, but you can leave it blank."
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted">Optional, but great for insights.</p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-ink">Notes</label>
              <textarea
                value={formState.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="w-full rounded-sm border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                placeholder="Optional context"
                rows={3}
                title="Add extra detail for future reference."
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="pill border-border/80 bg-white text-ink hover:bg-card"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="pill bg-emerald-500 text-white border-transparent shadow-[0_12px_30px_rgba(34,197,143,0.35)] hover:brightness-105 disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Save transaction"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function openQuickAddTransaction() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUICK_ADD_EVENT));
  }
}
