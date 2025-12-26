import { redirect } from "next/navigation";
import { CategoryType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildForecast } from "@/lib/forecastEngine";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(0)}`;
  }
}

function formatDate(input: Date | null) {
  if (!input) return "—";
  return input.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [user, budgetPlan, monthTransactions, forecast] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, currency: true },
    }),
    prisma.budgetPlan.findFirst({
      where: {
        userId,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      include: {
        items: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { periodStart: "desc" },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        postedAt: { gte: monthStart, lte: monthEnd },
      },
      include: {
        category: { select: { id: true, name: true, type: true } },
        splits: {
          include: { category: { select: { id: true, name: true, type: true } } },
        },
      },
    }),
    buildForecast({ userId, now }),
  ]);

  const currency = user?.currency ?? "USD";
  const budgetCategoryIds = new Set(
    (budgetPlan?.items ?? [])
      .map((item) => item.categoryId)
      .filter(Boolean) as string[],
  );

  const categoryTotals = new Map<string, { name: string; total: number }>();
  const budgetSpendByCategory = new Map<string, number>();
  let monthSpent = 0;

  const addLine = (
    amount: unknown,
    category?: { id?: string | null; name?: string | null; type?: CategoryType | null },
  ) => {
    if (category?.type && category.type !== CategoryType.EXPENSE) return;
    const value = toNumber(amount);
    if (value <= 0) return;
    monthSpent += value;
    const label = category?.name ?? "Uncategorized";
    const existing = categoryTotals.get(label) ?? { name: label, total: 0 };
    existing.total += value;
    categoryTotals.set(label, existing);
    if (category?.id && budgetCategoryIds.has(category.id)) {
      budgetSpendByCategory.set(
        category.id,
        (budgetSpendByCategory.get(category.id) ?? 0) + value,
      );
    }
  };

  for (const tx of monthTransactions) {
    if (tx.splits.length) {
      tx.splits.forEach((split) => addLine(split.amount, split.category ?? undefined));
    } else {
      addLine(tx.amount, tx.category ?? undefined);
    }
  }

  const budgetTotal = budgetPlan
    ? budgetPlan.items.reduce((sum, item) => sum + toNumber(item.amount), 0)
    : 0;
  const budgetSpent = budgetPlan
    ? budgetPlan.items.reduce((sum, item) => {
        if (item.categoryId) {
          return sum + (budgetSpendByCategory.get(item.categoryId) ?? 0);
        }
        return sum;
      }, 0)
    : 0;
  const budgetRemaining = Math.max(0, Number((budgetTotal - budgetSpent).toFixed(0)));
  const budgetUsedPct = budgetTotal
    ? Math.min(120, Math.round((budgetSpent / budgetTotal) * 100))
    : 0;

  const topCategories = Array.from(categoryTotals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      share: monthSpent ? Math.round((item.total / monthSpent) * 100) : 0,
    }));

  const billsBeforePay = [...forecast.billsDue].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
  );

  const friendlyName = user?.name ? user.name.split(" ")[0] : "there";

  return (
    <div className="space-y-10">
      <header className="grid gap-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-card to-sky-500/10 p-8">
        <p className="pill inline-flex w-fit items-center gap-2 border-emerald-500/40 bg-white/80 text-emerald-700">
          Forecast engine live
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-ink">
              Welcome back, {friendlyName}. Your cash map is ready.
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted">
              This dashboard blends your pay schedule, bills, recurring rules, and live
              transactions to surface what is safe to spend before the next paycheck.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/40 bg-white/80 px-4 py-3 text-sm text-ink shadow-[0_12px_32px_rgba(34,197,143,0.24)]">
            <p className="text-muted">Next payday</p>
            <p className="text-lg font-semibold text-ink">
              {formatDate(forecast.nextPayDate)} · {forecast.daysUntilPay}{" "}
              {forecast.daysUntilPay === 1 ? "day" : "days"} out
            </p>
            <p className="text-xs text-muted">
              Pay period {formatDate(forecast.periodStart)} → {formatDate(forecast.periodEnd)}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-[0_12px_30px_rgba(13,56,95,0.08)]">
          <p className="text-sm text-muted">Month spent</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(monthSpent, currency)}
          </p>
          <p className="mt-2 text-sm text-muted">
            Current month burn across expense categories.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-[0_12px_30px_rgba(13,56,95,0.08)]">
          <p className="text-sm text-muted">Remaining budget</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {budgetTotal
              ? formatCurrency(budgetRemaining, currency)
              : "No active plan"}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/60">
            <div
              className={`h-full rounded-full ${
                budgetUsedPct > 100
                  ? "bg-gradient-to-r from-navy-700 to-emerald-700"
                  : "bg-gradient-to-r from-emerald-500 to-sky-500"
              }`}
              style={{ width: `${budgetTotal ? budgetUsedPct : 8}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {budgetPlan ? `${budgetPlan.name} · ${budgetUsedPct}% used` : "Link a budget to track drift"}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-[0_12px_30px_rgba(13,56,95,0.08)]">
          <p className="text-sm text-muted">Safe to spend</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(forecast.safeToSpend, currency)}
          </p>
          <p className="mt-2 text-xs text-muted">
            Net pay ({formatCurrency(forecast.netPay, currency)}) minus bills, recurring rules,
            pending transactions, and spend this period.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-[0_12px_30px_rgba(13,56,95,0.08)]">
          <p className="text-sm text-muted">Daily allowance</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(forecast.dailyAllowance, currency)}
          </p>
          <p className="mt-2 text-xs text-muted">
            {forecast.daysUntilPay} days until payday; keep pace to stay solvent.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5 rounded-2xl border border-border/70 bg-white/80 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Category heatmap</p>
              <h2 className="text-lg font-semibold text-ink">Top categories this month</h2>
            </div>
            <span className="pill">{topCategories.length || 0} tracked</span>
          </div>

          {topCategories.length ? (
            <div className="space-y-3">
              {topCategories.map((cat) => (
                <div
                  key={cat.name}
                  className="rounded-xl border border-border/70 bg-card/80 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-ink">{cat.name}</p>
                    <p className="text-sm text-muted">
                      {formatCurrency(cat.total, currency)} · {cat.share}% of spend
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                      style={{ width: `${Math.max(8, cat.share)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-card/70 p-4 text-sm text-muted">
              No expense transactions logged this month yet.
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Before next payday</p>
              <h2 className="text-lg font-semibold text-ink">Bills coming due</h2>
            </div>
            <span className="pill">{billsBeforePay.length} scheduled</span>
          </div>
          <div className="space-y-3">
            {billsBeforePay.length ? (
              billsBeforePay.map((bill) => (
                <div
                  key={`${bill.id}-${bill.dueDate.toISOString()}`}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-white/80 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-ink">{bill.name}</p>
                    <p className="text-sm text-muted">{formatDate(bill.dueDate)}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">
                    {formatCurrency(bill.amount, currency)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 bg-card/70 p-3 text-sm text-muted">
                No bills between now and payday.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Forecast engine</p>
              <h2 className="text-lg font-semibold text-ink">Paycheck outlook</h2>
            </div>
            <span className="pill">
              {formatCurrency(forecast.netPay, currency)} pay-in
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Bills locked", value: forecast.totals.bills },
              { label: "Recurring rules", value: forecast.totals.recurring },
              { label: "Pending spend", value: forecast.totals.pending },
              { label: "Already spent", value: forecast.totals.spent },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/70 bg-white/80 p-4"
              >
                <p className="text-sm text-muted">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {formatCurrency(item.value, currency)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            SafeToSpend and DailyAllowance include pay schedule cadence, fixed bills,
            recurring rules, plus posted and pending transactions inside this pay period.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-6">
          <p className="text-sm text-muted">Budget snapshot</p>
          <h2 className="text-lg font-semibold text-ink">
            {budgetPlan ? budgetPlan.name : "No budget plan active"}
          </h2>
          <div className="rounded-xl border border-border/70 bg-white/80 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">Allocated</p>
              <p className="text-sm font-semibold text-ink">
                {formatCurrency(budgetTotal, currency)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-muted">Used</p>
              <p className="text-sm font-semibold text-ink">
                {formatCurrency(budgetSpent, currency)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-muted">Remaining</p>
              <p className="text-sm font-semibold text-ink">
                {formatCurrency(budgetRemaining, currency)}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/60">
              <div
                className={`h-full rounded-full ${
                  budgetUsedPct > 100
                    ? "bg-gradient-to-r from-navy-700 to-emerald-700"
                    : "bg-gradient-to-r from-emerald-500 to-sky-500"
                }`}
                style={{ width: `${budgetTotal ? budgetUsedPct : 6}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted">
            We track every expense against the active plan to surface drift and free cash.
          </p>
        </div>
      </section>
    </div>
  );
}
