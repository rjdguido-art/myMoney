"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Language = "en" | "es";
type PayFrequency = "WEEKLY" | "BIWEEKLY" | "SEMIMONTHLY" | "MONTHLY";
type BillFrequency = "WEEKLY" | "MONTHLY";

type BillRow = {
  id: string;
  name: string;
  amount: string;
  dueDay: string;
  frequency: BillFrequency;
};

type DebtRow = { id: string; name: string; minimumPayment: string };
type BudgetRow = { id: string; category: string; amount: string };

type Props = {
  initialCurrency: string;
  initialLanguage: Language;
  name: string | null;
};

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

const defaultBudgets = [
  "Groceries",
  "Transport",
  "Eating out",
  "Shopping",
  "Entertainment",
  "Other",
];

const copy = {
  en: {
    welcome: "Welcome",
    intro: "Let’s build a starter spending plan for you.",
    steps: [
      { title: "Basics", description: "Preferred language and currency." },
      { title: "Paycheck", description: "How often you get paid." },
      { title: "Fixed bills", description: "Recurring bills and due days." },
      { title: "Savings", description: "Set a savings target per paycheck." },
      { title: "Debt", description: "Optional minimum payments." },
      { title: "Budgets", description: "Monthly targets by category." },
      { title: "Review", description: "Confirm your plan." },
    ],
    labels: {
      language: "Preferred language",
      currency: "Currency",
      payFrequency: "Pay frequency",
      takeHome: "Take-home pay per paycheck",
      billsTitle: "Add fixed bills",
      billName: "Bill name",
      billAmount: "Amount",
      billDueDay: "Due day (1-31)",
      billFrequency: "Frequency",
      addBill: "Add bill",
      savingsMode: "Savings goal",
      savingsAmount: "Amount per paycheck",
      savingsPercent: "Percent per paycheck",
      debtsTitle: "Debt payments (optional)",
      debtName: "Debt name",
      debtMin: "Minimum monthly payment",
      addDebt: "Add debt",
      budgetsTitle: "Monthly category targets",
      category: "Category",
      target: "Target",
      addCategory: "Add category",
      summaryTitle: "Plan summary",
      confirm: "Confirm & Create Plan",
      next: "Next",
      back: "Back",
      edit: "Edit",
    },
  },
  es: {
    welcome: "Bienvenido",
    intro: "Vamos a crear tu plan de gastos inicial.",
    steps: [
      { title: "Basicos", description: "Idioma y moneda preferidos." },
      { title: "Pago", description: "Con que frecuencia cobras." },
      { title: "Gastos fijos", description: "Facturas recurrentes y vencimientos." },
      { title: "Ahorro", description: "Meta de ahorro por pago." },
      { title: "Deudas", description: "Pagos minimos opcionales." },
      { title: "Presupuestos", description: "Objetivos mensuales por categoria." },
      { title: "Resumen", description: "Confirma tu plan." },
    ],
    labels: {
      language: "Idioma preferido",
      currency: "Moneda",
      payFrequency: "Frecuencia de pago",
      takeHome: "Ingreso neto por pago",
      billsTitle: "Agregar gastos fijos",
      billName: "Nombre",
      billAmount: "Monto",
      billDueDay: "Dia de vencimiento (1-31)",
      billFrequency: "Frecuencia",
      addBill: "Agregar gasto",
      savingsMode: "Meta de ahorro",
      savingsAmount: "Monto por pago",
      savingsPercent: "Porcentaje por pago",
      debtsTitle: "Pagos de deuda (opcional)",
      debtName: "Nombre de deuda",
      debtMin: "Pago minimo mensual",
      addDebt: "Agregar deuda",
      budgetsTitle: "Objetivos mensuales por categoria",
      category: "Categoria",
      target: "Objetivo",
      addCategory: "Agregar categoria",
      summaryTitle: "Resumen del plan",
      confirm: "Confirmar y crear plan",
      next: "Siguiente",
      back: "Atras",
      edit: "Editar",
    },
  },
};

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function OnboardingClient({ initialCurrency, initialLanguage, name }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [currency, setCurrency] = useState(initialCurrency);
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("BIWEEKLY");
  const [takeHomePay, setTakeHomePay] = useState("");
  const [bills, setBills] = useState<BillRow[]>([
    { id: uid(), name: "", amount: "", dueDay: "", frequency: "MONTHLY" },
  ]);
  const [savingsMode, setSavingsMode] = useState<"amount" | "percent">("amount");
  const [savingsValue, setSavingsValue] = useState("");
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>(
    defaultBudgets.map((category) => ({ id: uid(), category, amount: "" })),
  );

  const text = copy[language];
  const steps = useMemo(() => text.steps, [text.steps]);
  const progress = ((step + 1) / steps.length) * 100;

  const nextStep = () => {
    if (step === 1 && toNumber(takeHomePay) <= 0) {
      setError(language === "es" ? "Ingresa tu ingreso neto." : "Enter your take-home pay.");
      return;
    }
    if (
      step === 2 &&
      bills.some(
        (bill) =>
          bill.name.trim() &&
          (toNumber(bill.amount) <= 0 || !Number(bill.dueDay)),
      )
    ) {
      setError(
        language === "es"
          ? "Completa monto y dia de vencimiento."
          : "Complete amount and due day for each bill.",
      );
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const updateBill = (id: string, field: keyof BillRow, value: string) => {
    setBills((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const updateDebt = (id: string, field: keyof DebtRow, value: string) => {
    setDebts((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const updateBudget = (id: string, field: keyof BudgetRow, value: string) => {
    setBudgets((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const payload = {
      preferredLanguage: language,
      currency,
      payFrequency,
      takeHomePay: toNumber(takeHomePay),
      bills: bills
        .filter((bill) => bill.name.trim())
        .map((bill) => ({
          name: bill.name.trim(),
          amount: toNumber(bill.amount),
          dueDay: Number(bill.dueDay),
          frequency: bill.frequency,
        })),
      savings:
        savingsValue.trim() !== ""
          ? { mode: savingsMode, value: toNumber(savingsValue) }
          : undefined,
      debts: debts
        .filter((debt) => debt.name.trim())
        .map((debt) => ({
          name: debt.name.trim(),
          minimumPayment: toNumber(debt.minimumPayment),
        })),
      budgets: budgets
        .filter((budget) => budget.category.trim())
        .map((budget) => ({
          category: budget.category.trim(),
          amount: toNumber(budget.amount),
        })),
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="pill bg-white/80 text-emerald-700 border-emerald-500/30">
            {text.welcome}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            {text.welcome}
            {name ? `, ${name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-muted">{text.intro}</p>
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
              <label className="text-sm text-ink">{text.labels.language}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="es">Espanol</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">{text.labels.currency}</label>
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
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-ink">{text.labels.payFrequency}</label>
              <select
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              >
                {payFrequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label[language]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">{text.labels.takeHome}</label>
              <input
                value={takeHomePay}
                onChange={(e) => setTakeHomePay(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">{text.labels.billsTitle}</h2>
              <p className="text-sm text-muted">
                {language === "es"
                  ? "Agrega facturas fijas para calcular tu disponibilidad."
                  : "Add fixed bills to calculate your availability."}
              </p>
            </div>
            {bills.map((bill) => (
              <div key={bill.id} className="grid gap-3 md:grid-cols-4">
                <input
                  value={bill.name}
                  onChange={(e) => updateBill(bill.id, "name", e.target.value)}
                  className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={text.labels.billName}
                />
                <input
                  value={bill.amount}
                  onChange={(e) => updateBill(bill.id, "amount", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={text.labels.billAmount}
                />
                <input
                  value={bill.dueDay}
                  onChange={(e) => updateBill(bill.id, "dueDay", e.target.value)}
                  type="number"
                  min="1"
                  max="31"
                  className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={text.labels.billDueDay}
                />
                <select
                  value={bill.frequency}
                  onChange={(e) =>
                    updateBill(bill.id, "frequency", e.target.value as BillFrequency)
                  }
                  className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
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
              className="pill border-border/70 bg-white/80 text-ink hover:border-emerald-500/50"
            >
              {text.labels.addBill}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-ink">{text.labels.savingsMode}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSavingsMode("amount")}
                  className={`pill ${savingsMode === "amount" ? "bg-emerald-500 text-white border-transparent" : "bg-white/80 text-ink border-border/70"}`}
                >
                  {text.labels.savingsAmount}
                </button>
                <button
                  type="button"
                  onClick={() => setSavingsMode("percent")}
                  className={`pill ${savingsMode === "percent" ? "bg-emerald-500 text-white border-transparent" : "bg-white/80 text-ink border-border/70"}`}
                >
                  {text.labels.savingsPercent}
                </button>
              </div>
            </div>
            <input
              value={savingsValue}
              onChange={(e) => setSavingsValue(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              placeholder={savingsMode === "amount" ? "0.00" : "0"}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">{text.labels.debtsTitle}</h2>
            </div>
            {debts.length === 0 && (
              <p className="text-sm text-muted">
                {language === "es"
                  ? "Si no tienes deudas, puedes omitir este paso."
                  : "If you have no debts, you can skip this step."}
              </p>
            )}
            {debts.map((debt) => (
              <div key={debt.id} className="grid gap-3 md:grid-cols-2">
                <input
                  value={debt.name}
                  onChange={(e) => updateDebt(debt.id, "name", e.target.value)}
                  className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={text.labels.debtName}
                />
                <input
                  value={debt.minimumPayment}
                  onChange={(e) => updateDebt(debt.id, "minimumPayment", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={text.labels.debtMin}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDebts((rows) => [
                  ...rows,
                  { id: uid(), name: "", minimumPayment: "" },
                ])
              }
              className="pill border-border/70 bg-white/80 text-ink hover:border-emerald-500/50"
            >
              {text.labels.addDebt}
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">{text.labels.budgetsTitle}</h2>
              <p className="text-sm text-muted">
                {language === "es"
                  ? "Ajusta los nombres y montos segun tus habitos."
                  : "Edit names and amounts to match your habits."}
              </p>
            </div>
            {budgets.map((budget) => (
              <div key={budget.id} className="grid gap-3 md:grid-cols-2">
                <input
                  value={budget.category}
                  onChange={(e) => updateBudget(budget.id, "category", e.target.value)}
                  className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={text.labels.category}
                />
                <input
                  value={budget.amount}
                  onChange={(e) => updateBudget(budget.id, "amount", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder={text.labels.target}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setBudgets((rows) => [
                  ...rows,
                  { id: uid(), category: "", amount: "" },
                ])
              }
              className="pill border-border/70 bg-white/80 text-ink hover:border-emerald-500/50"
            >
              {text.labels.addCategory}
            </button>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">{text.labels.summaryTitle}</h2>
            <div className="grid gap-3 rounded-xl border border-border/70 bg-white/80 p-4 text-sm text-muted">
              <p>
                {text.labels.language}: <span className="text-ink">{language}</span>
              </p>
              <p>
                {text.labels.currency}: <span className="text-ink">{currency}</span>
              </p>
              <p>
                {text.labels.payFrequency}:{" "}
                <span className="text-ink">
                  {payFrequencyOptions.find((option) => option.value === payFrequency)
                    ?.label[language] ?? payFrequency}
                </span>
              </p>
              <p>
                {text.labels.takeHome}: <span className="text-ink">{takeHomePay || "0"}</span>
              </p>
              <p>
                {text.labels.billsTitle}:{" "}
                <span className="text-ink">
                  {bills.filter((bill) => bill.name.trim()).length}
                </span>
              </p>
              <p>
                {text.labels.savingsMode}:{" "}
                <span className="text-ink">
                  {savingsMode === "amount"
                    ? text.labels.savingsAmount
                    : text.labels.savingsPercent}{" "}
                  {savingsValue || "0"}
                </span>
              </p>
              <p>
                {text.labels.debtsTitle}:{" "}
                <span className="text-ink">
                  {debts.filter((debt) => debt.name.trim()).length}
                </span>
              </p>
              <p>
                {text.labels.budgetsTitle}:{" "}
                <span className="text-ink">
                  {budgets.filter((budget) => budget.category.trim()).length}
                </span>
              </p>
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="pill border-border/70 bg-white/80 text-ink disabled:opacity-50"
          >
            {text.labels.back}
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="pill bg-emerald-500 text-white border-transparent shadow-[0_12px_32px_rgba(34,197,143,0.32)] hover:brightness-105"
            >
              {text.labels.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="pill bg-emerald-500 text-white border-transparent shadow-[0_12px_32px_rgba(34,197,143,0.32)] hover:brightness-105 disabled:opacity-70"
            >
              {submitting ? "Saving..." : text.labels.confirm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
