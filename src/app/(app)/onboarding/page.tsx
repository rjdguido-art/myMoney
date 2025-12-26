"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Frequency =
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "SEMIMONTHLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

type DeductionRow = { id: string; name: string; amount: string; isPercent: boolean };
type BillRow = { id: string; name: string; amount: string; dueDate: string; frequency: Frequency };
type VariableRow = { id: string; category: string; amount: string };
type GoalRow = { id: string; name: string; targetAmount: string; targetDate: string };
type DebtRow = { id: string; name: string; principal: string; interestRate: string; minimumPayment: string; dueDay: string };

const frequencyOptions: Frequency[] = [
  "MONTHLY",
  "SEMIMONTHLY",
  "BIWEEKLY",
  "WEEKLY",
];

const currencyOptions = ["USD", "EUR", "GBP", "CAD", "AUD"];
const timezoneOptions = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Singapore"];

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");

  const [payCadence, setPayCadence] = useState<Frequency>("BIWEEKLY");
  const [payInterval, setPayInterval] = useState(1);
  const [payAnchor, setPayAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const [netPay, setNetPay] = useState("");

  const [deductions, setDeductions] = useState<DeductionRow[]>([
    { id: uid(), name: "Taxes", amount: "0", isPercent: true },
  ]);
  const [bills, setBills] = useState<BillRow[]>([
    {
      id: uid(),
      name: "Rent",
      amount: "0",
      dueDate: new Date().toISOString().slice(0, 10),
      frequency: "MONTHLY",
    },
  ]);
  const [variableSpending, setVariableSpending] = useState<VariableRow[]>([
    { id: uid(), category: "Groceries", amount: "0" },
  ]);
  const [savingsGoals, setSavingsGoals] = useState<GoalRow[]>([
    { id: uid(), name: "Emergency fund", targetAmount: "1000", targetDate: "" },
  ]);
  const [debts, setDebts] = useState<DebtRow[]>([
    { id: uid(), name: "Credit card", principal: "0", interestRate: "19.99", minimumPayment: "50", dueDay: "1" },
  ]);

  const steps = useMemo(
    () => [
      { title: "Currency & timezone", description: "Set defaults for money and scheduling." },
      { title: "Pay schedule", description: "Tell us how and when you get paid." },
      { title: "Deductions & paycuts", description: "Capture fixed or percent-based deductions." },
      { title: "Fixed bills", description: "Recurring bills with amounts and due dates." },
      { title: "Variable spending", description: "Estimate flexible categories to track drift." },
      { title: "Goals", description: "Savings targets and debt obligations." },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const res = await fetch("/api/onboarding");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (cancelled) return;
      if (data.onboarded) {
        router.replace("/dashboard");
        return;
      }
      setCurrency(data.currency ?? "USD");
      setTimezone(data.timezone ?? "UTC");
      setLoading(false);
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const progress = ((step + 1) / steps.length) * 100;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload = {
      currency,
      timezone,
      paySchedule: {
        cadence: payCadence,
        interval: payInterval,
        anchorDate: payAnchor,
        netPay: Number(netPay || 0),
      },
      deductions: deductions
        .filter((d) => d.name.trim())
        .map((d) => ({
          name: d.name.trim(),
          amount: Number(d.amount || 0),
          isPercent: d.isPercent,
        })),
      bills: bills
        .filter((b) => b.name.trim())
        .map((b) => ({
          name: b.name.trim(),
          amount: Number(b.amount || 0),
          dueDate: b.dueDate,
          frequency: b.frequency,
        })),
      variableSpending: variableSpending
        .filter((v) => v.category.trim())
        .map((v) => ({ category: v.category.trim(), amount: Number(v.amount || 0) })),
      goals: {
        savings: savingsGoals
          .filter((g) => g.name.trim())
          .map((g) => ({
            name: g.name.trim(),
            targetAmount: Number(g.targetAmount || 0),
            targetDate: g.targetDate || undefined,
          })),
        debts: debts
          .filter((d) => d.name.trim())
          .map((d) => ({
            name: d.name.trim(),
            principal: Number(d.principal || 0),
            interestRate: Number(d.interestRate || 0),
            minimumPayment: Number(d.minimumPayment || 0),
            dueDay: d.dueDay ? Number(d.dueDay) : undefined,
          })),
      },
    };

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save onboarding");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        Loading onboarding...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="pill bg-white/80 text-emerald-700 border-emerald-500/30">Guided setup</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Onboarding wizard</h1>
          <p className="text-muted">
            Six quick steps to capture cashflow rules, fixed bills, and goals. We will keep drafts locally until you submit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-border/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted">
            Step {step + 1} / {steps.length}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, idx) => (
          <div
            key={s.title}
            className={`rounded-xl border px-4 py-3 text-sm ${
              idx === step
                ? "border-emerald-500 bg-white shadow-[0_10px_28px_rgba(34,197,143,0.18)]"
                : "border-border/70 bg-card"
            }`}
          >
            <p className="font-semibold text-ink">{s.title}</p>
            <p className="text-muted">{s.description}</p>
          </div>
        ))}
      </div>

      <div className="card p-8 space-y-6">
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-ink">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              >
                {currencyOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-ink">Frequency</label>
              <select
                value={payCadence}
                onChange={(e) => setPayCadence(e.target.value as Frequency)}
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              >
                {frequencyOptions.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">Interval</label>
              <input
                type="number"
                min={1}
                value={payInterval}
                onChange={(e) => setPayInterval(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">Next pay date</label>
              <input
                type="date"
                value={payAnchor}
                onChange={(e) => setPayAnchor(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">Net pay</label>
              <input
                type="number"
                value={netPay}
                onChange={(e) => setNetPay(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                placeholder="1500"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {deductions.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-xl border border-border/70 bg-white/80 p-4 md:grid-cols-4"
              >
                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm text-ink">Name</label>
                  <input
                    value={row.name}
                    onChange={(e) =>
                      setDeductions((items) =>
                        items.map((item) =>
                          item.id === row.id ? { ...item, name: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-ink">Amount</label>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(e) =>
                      setDeductions((items) =>
                        items.map((item) =>
                          item.id === row.id ? { ...item, amount: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-ink">Type</label>
                  <select
                    value={row.isPercent ? "percent" : "fixed"}
                    onChange={(e) =>
                      setDeductions((items) =>
                        items.map((item) =>
                          item.id === row.id ? { ...item, isPercent: e.target.value === "percent" } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percent">Percent</option>
                  </select>
                </div>
                <div className="flex items-end justify-end">
                  {deductions.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-emerald-700 underline"
                      onClick={() =>
                        setDeductions((items) => items.filter((item) => item.id !== row.id))
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="pill border-border/80 bg-card text-ink hover:border-emerald-500/50"
              onClick={() =>
                setDeductions((items) => [...items, { id: uid(), name: "", amount: "0", isPercent: false }])
              }
            >
              Add deduction
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {bills.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-xl border border-border/70 bg-white/80 p-4 md:grid-cols-5"
              >
                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm text-ink">Name</label>
                  <input
                    value={row.name}
                    onChange={(e) =>
                      setBills((items) =>
                        items.map((item) =>
                          item.id === row.id ? { ...item, name: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-ink">Amount</label>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(e) =>
                      setBills((items) =>
                        items.map((item) =>
                          item.id === row.id ? { ...item, amount: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-ink">Due date</label>
                  <input
                    type="date"
                    value={row.dueDate}
                    onChange={(e) =>
                      setBills((items) =>
                        items.map((item) =>
                          item.id === row.id ? { ...item, dueDate: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-ink">Frequency</label>
                  <select
                    value={row.frequency}
                    onChange={(e) =>
                      setBills((items) =>
                        items.map((item) =>
                          item.id === row.id
                            ? { ...item, frequency: e.target.value as Frequency }
                            : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  >
                    {frequencyOptions.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-end">
                  {bills.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-emerald-700 underline"
                      onClick={() => setBills((items) => items.filter((item) => item.id !== row.id))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="pill border-border/80 bg-card text-ink hover:border-emerald-500/50"
              onClick={() =>
                setBills((items) => [
                  ...items,
                  {
                    id: uid(),
                    name: "",
                    amount: "0",
                    dueDate: new Date().toISOString().slice(0, 10),
                    frequency: "MONTHLY",
                  },
                ])
              }
            >
              Add bill
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            {variableSpending.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-xl border border-border/70 bg-white/80 p-4 md:grid-cols-3"
              >
                <div className="space-y-1">
                  <label className="text-sm text-ink">Category</label>
                  <input
                    value={row.category}
                    onChange={(e) =>
                      setVariableSpending((items) =>
                        items.map((item) =>
                          item.id === row.id ? { ...item, category: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-ink">Amount</label>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(e) =>
                      setVariableSpending((items) =>
                        items.map((item) =>
                          item.id === row.id ? { ...item, amount: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end justify-end">
                  {variableSpending.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-emerald-700 underline"
                      onClick={() =>
                        setVariableSpending((items) => items.filter((item) => item.id !== row.id))
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="pill border-border/80 bg-card text-ink hover:border-emerald-500/50"
              onClick={() =>
                setVariableSpending((items) => [...items, { id: uid(), category: "", amount: "0" }])
              }
            >
              Add category
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-ink">Savings goals</h3>
              {savingsGoals.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-3 rounded-xl border border-border/70 bg-white/80 p-4 md:grid-cols-3"
                >
                  <div className="space-y-1">
                    <label className="text-sm text-ink">Name</label>
                    <input
                      value={row.name}
                      onChange={(e) =>
                        setSavingsGoals((items) =>
                          items.map((item) =>
                            item.id === row.id ? { ...item, name: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-ink">Target amount</label>
                    <input
                      type="number"
                      value={row.targetAmount}
                      onChange={(e) =>
                        setSavingsGoals((items) =>
                          items.map((item) =>
                            item.id === row.id ? { ...item, targetAmount: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-ink">Target date</label>
                    <input
                      type="date"
                      value={row.targetDate}
                      onChange={(e) =>
                        setSavingsGoals((items) =>
                          items.map((item) =>
                            item.id === row.id ? { ...item, targetDate: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end justify-end md:col-span-3">
                    {savingsGoals.length > 1 && (
                      <button
                        type="button"
                        className="text-sm text-emerald-700 underline"
                        onClick={() =>
                          setSavingsGoals((items) => items.filter((item) => item.id !== row.id))
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="pill border-border/80 bg-card text-ink hover:border-emerald-500/50"
                onClick={() =>
                  setSavingsGoals((items) => [
                    ...items,
                    { id: uid(), name: "", targetAmount: "0", targetDate: "" },
                  ])
                }
              >
                Add savings goal
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-ink">Debts</h3>
              {debts.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-3 rounded-xl border border-border/70 bg-white/80 p-4 md:grid-cols-5"
                >
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm text-ink">Name</label>
                    <input
                      value={row.name}
                      onChange={(e) =>
                        setDebts((items) =>
                          items.map((item) =>
                            item.id === row.id ? { ...item, name: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-ink">Principal</label>
                    <input
                      type="number"
                      value={row.principal}
                      onChange={(e) =>
                        setDebts((items) =>
                          items.map((item) =>
                            item.id === row.id ? { ...item, principal: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-ink">Interest %</label>
                    <input
                      type="number"
                      value={row.interestRate}
                      onChange={(e) =>
                        setDebts((items) =>
                          items.map((item) =>
                            item.id === row.id ? { ...item, interestRate: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-ink">Minimum payment</label>
                    <input
                      type="number"
                      value={row.minimumPayment}
                      onChange={(e) =>
                        setDebts((items) =>
                          items.map((item) =>
                            item.id === row.id ? { ...item, minimumPayment: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-ink">Due day (1-31)</label>
                    <input
                      type="number"
                      value={row.dueDay}
                      onChange={(e) =>
                        setDebts((items) =>
                          items.map((item) =>
                            item.id === row.id ? { ...item, dueDay: e.target.value } : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end justify-end md:col-span-5">
                    {debts.length > 1 && (
                      <button
                        type="button"
                        className="text-sm text-emerald-700 underline"
                        onClick={() => setDebts((items) => items.filter((item) => item.id !== row.id))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="pill border-border/80 bg-card text-ink hover:border-emerald-500/50"
                onClick={() =>
                  setDebts((items) => [
                    ...items,
                    {
                      id: uid(),
                      name: "",
                      principal: "0",
                      interestRate: "0",
                      minimumPayment: "0",
                      dueDay: "",
                    },
                  ])
                }
              >
                Add debt
              </button>
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="pill border-border/80 bg-card text-ink disabled:opacity-60"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(34,197,143,0.32)] hover:brightness-105"
            >
              Next step
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="pill bg-gradient-to-r from-emerald-500 to-sky-500 text-white border-transparent shadow-[0_12px_30px_rgba(34,197,143,0.35)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Finish & go to dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
