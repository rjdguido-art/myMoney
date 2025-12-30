"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { t, tJSON, type Locale } from "@/lib/i18n";

type PayFrequency = "WEEKLY" | "BIWEEKLY" | "SEMIMONTHLY" | "MONTHLY";
type BillFrequency = "WEEKLY" | "MONTHLY";

type DeductionRow = { id: string; name: string; amount: string };
type BillRow = {
  id: string;
  name: string;
  amount: string;
  dueDay: string;
  frequency: BillFrequency;
};
type BudgetRow = { id: string; category: string; amount: string };
type GoalRow = { id: string; name: string; targetAmount: string };
type DebtRow = { id: string; name: string; minimumPayment: string };

type Props = {
  initialCurrency: string;
  initialLanguage: Locale;
  initialTimezone: string;
  name: string | null;
};

const STORAGE_KEY = "onboardingDraft";

const currencyOptions = ["USD", "EUR", "GBP", "CAD", "AUD"];

const payFrequencyOptions: { value: PayFrequency; label: { en: string; es: string } }[] = [
  { value: "WEEKLY", label: { en: "Weekly", es: "Semanal" } },
  { value: "BIWEEKLY", label: { en: "Biweekly", es: "Quincenal" } },
  { value: "SEMIMONTHLY", label: { en: "Semimonthly", es: "Quincenal fijo" } },
  { value: "MONTHLY", label: { en: "Monthly", es: "Mensual" } },
];

const billFrequencyOptions: { value: BillFrequency; label: { en: string; es: string } }[] = [
  { value: "MONTHLY", label: { en: "Monthly", es: "Mensual" } },
  { value: "WEEKLY", label: { en: "Weekly", es: "Semanal" } },
];

const fallbackTimezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const defaultBudgets = [
  "Groceries",
  "Transport",
  "Eating out",
  "Shopping",
  "Entertainment",
  "Other",
];

const basicsSchema = z.object({
  preferredLanguage: z.enum(["en", "es"]),
  currency: z.string().min(1),
  timezone: z.string().min(1),
});

const paycheckSchema = z.object({
  payFrequency: z.enum(["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"]),
  takeHomePay: z.number().positive(),
});

const deductionSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
});

const billSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDay: z.number().int().min(1).max(31),
  frequency: z.enum(["WEEKLY", "MONTHLY"]),
});

const budgetSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
});

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
});

const debtSchema = z.object({
  name: z.string().min(1),
  minimumPayment: z.number().positive(),
});

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTimezoneOptions() {
  try {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      return (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf(
        "timeZone",
      );
    }
  } catch {
    return fallbackTimezones;
  }
  return fallbackTimezones;
}

function getResolvedTimezone() {
  try {
    if (typeof Intl !== "undefined") {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  } catch {
    return null;
  }
  return null;
}

type DraftState = {
  step: number;
  language: Locale;
  currency: string;
  timezone: string;
  payFrequency: PayFrequency;
  takeHomePay: string;
  deductions: DeductionRow[];
  bills: BillRow[];
  budgets: BudgetRow[];
  goals: GoalRow[];
  debts: DebtRow[];
};

export function OnboardingClient({
  initialCurrency,
  initialLanguage,
  initialTimezone,
  name,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [language, setLanguage] = useState<Locale>(initialLanguage);
  const [currency, setCurrency] = useState(initialCurrency);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("BIWEEKLY");
  const [takeHomePay, setTakeHomePay] = useState("");
  const [deductions, setDeductions] = useState<DeductionRow[]>([
    { id: uid(), name: "", amount: "" },
  ]);
  const [bills, setBills] = useState<BillRow[]>([
    { id: uid(), name: "", amount: "", dueDay: "", frequency: "MONTHLY" },
  ]);
  const [budgets, setBudgets] = useState<BudgetRow[]>(
    defaultBudgets.map((category) => ({ id: uid(), category, amount: "" })),
  );
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);

  const steps = useMemo(
    () =>
      tJSON(
        "onboarding.steps",
        language,
        [] as Array<{ title: string; description: string }>,
      ),
    [language],
  );
  const labels = useMemo(
    () => tJSON("onboarding.labels", language, {} as Record<string, string>),
    [language],
  );
  const tips = useMemo(
    () => tJSON("onboarding.tips", language, {} as Record<string, string>),
    [language],
  );
  const errors = useMemo(
    () => tJSON("onboarding.errors", language, {} as Record<string, string>),
    [language],
  );
  const helpers = useMemo(
    () => tJSON("onboarding.helpers", language, {} as Record<string, string>),
    [language],
  );
  const progress = ((step + 1) / steps.length) * 100;
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const resolved = getResolvedTimezone();
        if (resolved && initialTimezone === "UTC") {
          setTimezone(resolved);
        }
      } else {
        const draft = JSON.parse(stored) as DraftState;
        if (draft) {
          setStep(Number.isFinite(draft.step) ? draft.step : 0);
          setLanguage(draft.language ?? initialLanguage);
          setCurrency(draft.currency ?? initialCurrency);
          setTimezone(draft.timezone ?? initialTimezone);
          setPayFrequency(draft.payFrequency ?? "BIWEEKLY");
          setTakeHomePay(draft.takeHomePay ?? "");
          setDeductions(
            draft.deductions?.length ? draft.deductions : [{ id: uid(), name: "", amount: "" }],
          );
          setBills(
            draft.bills?.length
              ? draft.bills
              : [{ id: uid(), name: "", amount: "", dueDay: "", frequency: "MONTHLY" }],
          );
          setBudgets(
            draft.budgets?.length
              ? draft.budgets
              : defaultBudgets.map((category) => ({ id: uid(), category, amount: "" })),
          );
          setGoals(draft.goals ?? []);
          setDebts(draft.debts ?? []);
        }
      }
    } catch {
      // Ignore invalid drafts.
    }
    setHydrated(true);
  }, [initialCurrency, initialLanguage, initialTimezone]);

  const showSkeleton = !hydrated;

  useEffect(() => {
    const draft: DraftState = {
      step,
      language,
      currency,
      timezone,
      payFrequency,
      takeHomePay,
      deductions,
      bills,
      budgets,
      goals,
      debts,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [
    step,
    language,
    currency,
    timezone,
    payFrequency,
    takeHomePay,
    deductions,
    bills,
    budgets,
    goals,
    debts,
  ]);

  const validateStep = () => {
    if (step === 0) {
      const result = basicsSchema.safeParse({
        preferredLanguage: language,
        currency,
        timezone,
      });
      if (!result.success) {
        setError(errors.basics);
        return false;
      }
    }

    if (step === 1) {
      const result = paycheckSchema.safeParse({
        payFrequency,
        takeHomePay: toNumber(takeHomePay),
      });
      if (!result.success) {
        setError(errors.paycheck);
        return false;
      }
    }

    if (step === 2) {
      const trimmed = deductions
        .filter((row) => row.name.trim())
        .map((row) => ({ name: row.name.trim(), amount: toNumber(row.amount) }));
      const result = z.array(deductionSchema).safeParse(trimmed);
      if (!result.success) {
        setError(errors.deductions);
        return false;
      }
    }

    if (step === 3) {
      const trimmed = bills
        .filter((row) => row.name.trim())
        .map((row) => ({
          name: row.name.trim(),
          amount: toNumber(row.amount),
          dueDay: Number(row.dueDay),
          frequency: row.frequency,
        }));
      const result = z.array(billSchema).safeParse(trimmed);
      if (!result.success) {
        setError(errors.bills);
        return false;
      }
    }

    if (step === 4) {
      const trimmed = budgets
        .filter((row) => row.category.trim() && toNumber(row.amount) > 0)
        .map((row) => ({ category: row.category.trim(), amount: toNumber(row.amount) }));
      const result = z.array(budgetSchema).min(1).safeParse(trimmed);
      if (!result.success) {
        setError(errors.budgets);
        return false;
      }
    }

    if (step === 5) {
      const trimmed = goals
        .filter((row) => row.name.trim())
        .map((row) => ({ name: row.name.trim(), targetAmount: toNumber(row.targetAmount) }));
      const result = z.array(goalSchema).safeParse(trimmed);
      if (!result.success) {
        setError(errors.goals);
        return false;
      }
    }

    if (step === 6) {
      const trimmed = debts
        .filter((row) => row.name.trim())
        .map((row) => ({ name: row.name.trim(), minimumPayment: toNumber(row.minimumPayment) }));
      const result = z.array(debtSchema).safeParse(trimmed);
      if (!result.success) {
        setError(errors.debts);
        return false;
      }
    }

    setError(null);
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const skipStep = () => {
    setError(null);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const updateDeduction = (id: string, field: keyof DeductionRow, value: string) => {
    setDeductions((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const updateBill = (id: string, field: keyof BillRow, value: string) => {
    setBills((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const updateBudget = (id: string, field: keyof BudgetRow, value: string) => {
    setBudgets((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const updateGoal = (id: string, field: keyof GoalRow, value: string) => {
    setGoals((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const updateDebt = (id: string, field: keyof DebtRow, value: string) => {
    setDebts((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const payload = {
      preferredLanguage: language,
      currency,
      timezone,
      payFrequency,
      takeHomePay: toNumber(takeHomePay),
      deductions: deductions
        .filter((deduction) => deduction.name.trim())
        .map((deduction) => ({
          name: deduction.name.trim(),
          amount: toNumber(deduction.amount),
        })),
      bills: bills
        .filter((bill) => bill.name.trim())
        .map((bill) => ({
          name: bill.name.trim(),
          amount: toNumber(bill.amount),
          dueDay: Number(bill.dueDay),
          frequency: bill.frequency,
        })),
      budgets: budgets
        .filter((budget) => budget.category.trim() && toNumber(budget.amount) > 0)
        .map((budget) => ({
          category: budget.category.trim(),
          amount: toNumber(budget.amount),
        })),
      savingsGoals: goals
        .filter((goal) => goal.name.trim())
        .map((goal) => ({
          name: goal.name.trim(),
          targetAmount: toNumber(goal.targetAmount),
        })),
      debts: debts
        .filter((debt) => debt.name.trim())
        .map((debt) => ({
          name: debt.name.trim(),
          minimumPayment: toNumber(debt.minimumPayment),
        })),
    };

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? errors.save);
      setSubmitting(false);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    router.push("/setup-complete");
  };

  const isSkippableStep = new Set([2, 3, 5, 6]).has(step);

  return (
    <div className="space-y-8">
      {showSkeleton ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-40 rounded-sm bg-surface" />
          <div className="h-10 w-2/3 rounded bg-border/60" />
          <div className="h-4 w-1/2 rounded bg-border/60" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-28 rounded-md bg-surface" />
            <div className="h-28 rounded-md bg-surface" />
          </div>
          <div className="h-64 rounded-lg bg-surface" />
        </div>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="pill bg-white/80 text-emerald-700 border-emerald-500/30">
            {t("onboarding.welcome", language)}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            {t("onboarding.welcome", language)}
            {name ? `, ${name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-muted">{t("onboarding.intro", language)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-40 overflow-hidden rounded-sm bg-surface">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted">
            {t("onboarding.labels.stepLabel", language, {
              current: step + 1,
              total: steps.length,
            })}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, idx) => (
          <div
            key={s.title}
            className={`rounded-md border px-4 py-3 text-sm ${
              idx === step
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-border/80 bg-white"
            }`}
          >
            <p className="font-semibold text-ink">{s.title}</p>
            <p className="text-muted">{s.description}</p>
          </div>
        ))}
      </div>

      <div className={`card p-8 space-y-6 relative ${showSkeleton ? "opacity-60 pointer-events-none" : ""}`}>
        {submitting ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-md border border-border/80 bg-white px-4 py-3 text-sm text-ink shadow-sm">
              <span className="h-4 w-4 animate-spin rounded-sm border-2 border-emerald-500 border-t-transparent" />
              {labels.saving}
            </div>
          </div>
        ) : null}
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-ink">{labels.language}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Locale)}
                className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                title={helpers.language}
              >
                <option value="en">{t("nav.languageEnglish", language)}</option>
                <option value="es">{t("nav.languageSpanish", language)}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">{labels.currency}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                title={helpers.currency}
              >
                {currencyOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-ink">{labels.timezone}</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                title={helpers.timezone}
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-ink">{labels.payFrequency}</label>
              <select
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}
                className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                title={helpers.payFrequency}
              >
                {payFrequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label[language]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">{labels.takeHome}</label>
              <input
                value={takeHomePay}
                onChange={(e) => setTakeHomePay(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                placeholder="0.00"
                title={helpers.takeHome}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">{labels.deductionsTitle}</h2>
              <p className="text-sm text-muted">{tips.deductions}</p>
            </div>
            {deductions.map((deduction) => (
              <div key={deduction.id} className="grid gap-3 md:grid-cols-2">
                <input
                  value={deduction.name}
                  onChange={(e) => updateDeduction(deduction.id, "name", e.target.value)}
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.deductionName}
                  title={helpers.deductionName}
                />
                <input
                  value={deduction.amount}
                  onChange={(e) => updateDeduction(deduction.id, "amount", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.deductionAmount}
                  title={helpers.deductionAmount}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDeductions((rows) => [...rows, { id: uid(), name: "", amount: "" }])
              }
              className="pill border-border/80 bg-white text-ink hover:border-emerald-500/50"
            >
              {labels.addDeduction}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">{labels.billsTitle}</h2>
              <p className="text-sm text-muted">{tips.bills}</p>
            </div>
            {bills.map((bill) => (
              <div key={bill.id} className="grid gap-3 md:grid-cols-4">
                <input
                  value={bill.name}
                  onChange={(e) => updateBill(bill.id, "name", e.target.value)}
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.billName}
                  title={helpers.billName}
                />
                <input
                  value={bill.amount}
                  onChange={(e) => updateBill(bill.id, "amount", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.billAmount}
                  title={helpers.billAmount}
                />
                <input
                  value={bill.dueDay}
                  onChange={(e) => updateBill(bill.id, "dueDay", e.target.value)}
                  type="number"
                  min="1"
                  max="31"
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.billDueDay}
                  title={helpers.billDueDay}
                />
                <select
                  value={bill.frequency}
                  onChange={(e) =>
                    updateBill(bill.id, "frequency", e.target.value as BillFrequency)
                  }
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  title={helpers.billFrequency}
                >
                  {billFrequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label[language]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setBills((rows) => [
                  ...rows,
                  { id: uid(), name: "", amount: "", dueDay: "", frequency: "MONTHLY" },
                ])
              }
              className="pill border-border/80 bg-white text-ink hover:border-emerald-500/50"
            >
              {labels.addBill}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">{labels.budgetsTitle}</h2>
              <p className="text-sm text-muted">{tips.budgets}</p>
            </div>
            {budgets.map((budget) => (
              <div key={budget.id} className="grid gap-3 md:grid-cols-2">
                <input
                  value={budget.category}
                  onChange={(e) => updateBudget(budget.id, "category", e.target.value)}
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.category}
                  title={helpers.category}
                />
                <input
                  value={budget.amount}
                  onChange={(e) => updateBudget(budget.id, "amount", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.target}
                  title={helpers.target}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setBudgets((rows) => [...rows, { id: uid(), category: "", amount: "" }])
              }
              className="pill border-border/80 bg-white text-ink hover:border-emerald-500/50"
            >
              {labels.addCategory}
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">{labels.goalsTitle}</h2>
              <p className="text-sm text-muted">{tips.goals}</p>
            </div>
            {goals.map((goal) => (
              <div key={goal.id} className="grid gap-3 md:grid-cols-2">
                <input
                  value={goal.name}
                  onChange={(e) => updateGoal(goal.id, "name", e.target.value)}
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.goalName}
                  title={helpers.goalName}
                />
                <input
                  value={goal.targetAmount}
                  onChange={(e) => updateGoal(goal.id, "targetAmount", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.goalTarget}
                  title={helpers.goalTarget}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setGoals((rows) => [...rows, { id: uid(), name: "", targetAmount: "" }])
              }
              className="pill border-border/80 bg-white text-ink hover:border-emerald-500/50"
            >
              {labels.addGoal}
            </button>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">{labels.debtsTitle}</h2>
              <p className="text-sm text-muted">{tips.debts}</p>
            </div>
            {debts.map((debt) => (
              <div key={debt.id} className="grid gap-3 md:grid-cols-2">
                <input
                  value={debt.name}
                  onChange={(e) => updateDebt(debt.id, "name", e.target.value)}
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.debtName}
                  title={helpers.debtName}
                />
                <input
                  value={debt.minimumPayment}
                  onChange={(e) => updateDebt(debt.id, "minimumPayment", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={labels.debtMin}
                  title={helpers.debtMin}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDebts((rows) => [...rows, { id: uid(), name: "", minimumPayment: "" }])
              }
              className="pill border-border/80 bg-white text-ink hover:border-emerald-500/50"
            >
              {labels.addDebt}
            </button>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">{labels.summaryTitle}</h2>
            <div className="grid gap-3 rounded-md border border-border/80 bg-white p-4 text-sm text-muted">
              <p>
                {labels.language}: <span className="text-ink">{language}</span>
              </p>
              <p>
                {labels.currency}: <span className="text-ink">{currency}</span>
              </p>
              <p>
                {labels.timezone}: <span className="text-ink">{timezone}</span>
              </p>
              <p>
                {labels.payFrequency}:{" "}
                <span className="text-ink">
                  {payFrequencyOptions.find((option) => option.value === payFrequency)
                    ?.label[language] ?? payFrequency}
                </span>
              </p>
              <p>
                {labels.takeHome}: <span className="text-ink">{takeHomePay || "0"}</span>
              </p>
              <p>
                {labels.deductionsTitle}:{" "}
                <span className="text-ink">
                  {deductions.filter((row) => row.name.trim()).length}
                </span>
              </p>
              <p>
                {labels.billsTitle}:{" "}
                <span className="text-ink">
                  {bills.filter((bill) => bill.name.trim()).length}
                </span>
              </p>
              <p>
                {labels.budgetsTitle}:{" "}
                <span className="text-ink">
                  {
                    budgets.filter(
                      (budget) => budget.category.trim() && toNumber(budget.amount) > 0,
                    ).length
                  }
                </span>
              </p>
              <p>
                {labels.goalsTitle}:{" "}
                <span className="text-ink">
                  {goals.filter((goal) => goal.name.trim()).length}
                </span>
              </p>
              <p>
                {labels.debtsTitle}:{" "}
                <span className="text-ink">
                  {debts.filter((debt) => debt.name.trim()).length}
                </span>
              </p>
            </div>
            <p className="text-sm text-muted">
              {tips.guidePrompt}{" "}
              <Link href="/guide" className="text-emerald-700 hover:underline">
                {tips.guideLink}
              </Link>
            </p>
          </div>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="pill border-border/80 bg-white text-ink disabled:opacity-50"
          >
            {labels.back}
          </button>
          <div className="flex items-center gap-4">
            {isSkippableStep && step < steps.length - 1 ? (
              <button
                type="button"
                onClick={skipStep}
                className="text-sm text-emerald-700 hover:underline"
              >
                {labels.skip}
              </button>
            ) : null}
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="pill bg-emerald-500 text-white border-transparent shadow-[0_12px_32px_rgba(121,211,198,0.32)] hover:brightness-105"
              >
                {labels.next}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="pill bg-emerald-500 text-white border-transparent shadow-[0_12px_32px_rgba(121,211,198,0.32)] hover:brightness-105 disabled:opacity-70"
              >
                {submitting ? labels.saving : labels.confirm}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
