import { CategoryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/onboarding";

type LineCategory = { id?: string | null; name?: string | null; type?: CategoryType | null };
type WeeklyBucket = { start: Date; label: string; income: number; expense: number };

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount >= 1000 ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(0)}`;
  }
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay(); // Sunday as 0
  const diff = (day + 6) % 7; // convert to Monday start
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short" });
}

function sparklinePoints(values: number[], width: number, height: number) {
  if (!values.length) return "";
  const max = Math.max(...values, 0.01);
  return values
    .map((value, idx) => {
      const x =
        values.length === 1 ? width / 2 : (idx / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");
}

export default async function InsightsPage() {
  const user = await requireOnboardedUser();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const cashflowStart = new Date(now);
  cashflowStart.setDate(cashflowStart.getDate() - 42);
  const rangeStart = cashflowStart < trendStart ? cashflowStart : trendStart;
  const rangeEnd = monthEnd;

  const userId = user.id;
  const [transactions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        postedAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        amount: true,
        postedAt: true,
        category: { select: { id: true, name: true, type: true } },
        splits: {
          select: {
            amount: true,
            category: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { postedAt: "asc" },
    }),
  ]);

  const currency = user.currency ?? "USD";
  const monthCategoryTotals = new Map<string, { name: string; total: number }>();
  const weeklyBuckets = new Map<string, WeeklyBucket>();
  const monthWindows = Array.from({ length: 3 }, (_, idx) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (2 - idx), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: monthLabel(start) };
  });
  const trendByCategory = new Map<string, { name: string; values: number[] }>();

  const ensureWeeklyBucket = (date: Date) => {
    const start = startOfWeek(date);
    const key = start.toISOString();
    if (!weeklyBuckets.has(key)) {
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      weeklyBuckets.set(key, { start, label, income: 0, expense: 0 });
    }
    return weeklyBuckets.get(key)!;
  };

  const ingestLine = (amount: unknown, category: LineCategory, postedAt: Date) => {
    const type = category?.type ?? CategoryType.EXPENSE;
    if (type === CategoryType.TRANSFER) return;
    const value = Math.abs(toNumber(amount));
    if (!value) return;

    if (type === CategoryType.EXPENSE && postedAt >= monthStart && postedAt <= monthEnd) {
      const name = category?.name ?? "Uncategorized";
      const existing = monthCategoryTotals.get(name) ?? { name, total: 0 };
      existing.total += value;
      monthCategoryTotals.set(name, existing);
    }

    if (postedAt >= cashflowStart) {
      const bucket = ensureWeeklyBucket(postedAt);
      if (type === CategoryType.INCOME) {
        bucket.income += value;
      } else if (type === CategoryType.EXPENSE) {
        bucket.expense += value;
      }
    }

    if (type === CategoryType.EXPENSE && postedAt >= trendStart) {
      const monthIdx = monthWindows.findIndex(
        (window) => postedAt >= window.start && postedAt <= window.end,
      );
      if (monthIdx >= 0) {
        const name = category?.name ?? "Uncategorized";
        const existing = trendByCategory.get(name) ?? {
          name,
          values: Array.from({ length: monthWindows.length }, () => 0),
        };
        existing.values[monthIdx] += value;
        trendByCategory.set(name, existing);
      }
    }
  };

  for (const tx of transactions) {
    if (tx.splits.length) {
      tx.splits.forEach((split) => ingestLine(split.amount, split.category ?? {}, tx.postedAt));
    } else {
      ingestLine(tx.amount, tx.category ?? {}, tx.postedAt);
    }
  }

  const monthSpendTotal = Array.from(monthCategoryTotals.values()).reduce(
    (sum, cat) => sum + cat.total,
    0,
  );
  const topCategories = Array.from(monthCategoryTotals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map((cat) => ({
      ...cat,
      share: monthSpendTotal ? Math.round((cat.total / monthSpendTotal) * 100) : 0,
    }));

  const weeklySeries = Array.from(weeklyBuckets.values()).sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const maxWeekly = weeklySeries.reduce(
    (max, bucket) => Math.max(max, bucket.income, bucket.expense),
    0,
  );

  const trendCandidates = Array.from(trendByCategory.values()).sort(
    (a, b) => b.values.reduce((s, v) => s + v, 0) - a.values.reduce((s, v) => s + v, 0),
  );
  const trendSeries = trendCandidates.slice(0, 4);
  const maxTrendValue = trendSeries.reduce(
    (max, cat) => Math.max(max, ...cat.values),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="pill inline-flex bg-white/80 text-emerald-700">Insights</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            Spending intelligence and cashflow trends.
          </h1>
          <p className="text-muted">
            Month-to-date category burn, weekly cashflow pace, and a 3-month trendline.
          </p>
        </div>
        <div className="rounded-md border border-border/80 bg-white px-4 py-3 text-sm text-ink shadow-sm">
          <p className="text-muted">Month spend</p>
          <p className="text-lg font-semibold text-ink">
            {formatCurrency(monthSpendTotal, currency)}
          </p>
          <p className="text-xs text-muted">Expense categories only</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">This month</p>
              <h2 className="text-lg font-semibold text-ink">Spend by category</h2>
            </div>
            <span className="pill">
              {topCategories.length} tracked · {monthLabel(monthStart)}
            </span>
          </div>
          {topCategories.length ? (
            <div className="space-y-3">
              {topCategories.map((cat) => (
                <div
                  key={cat.name}
                  className="rounded-md border border-border/80 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-ink">{cat.name}</p>
                    <p className="text-sm text-muted">
                      {formatCurrency(cat.total, currency)} · {cat.share}%
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-sm bg-surface">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-navy-600"
                      style={{
                        width: `${Math.max(8, cat.share)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-white p-4 text-sm text-muted">
              No expense activity this month yet.
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Last 6 weeks</p>
              <h2 className="text-lg font-semibold text-ink">Cashflow (income vs expenses)</h2>
            </div>
            <span className="pill">
              {weeklySeries.length} weeks
            </span>
          </div>
          {weeklySeries.length ? (
            <div className="grid grid-cols-6 gap-2">
              {weeklySeries.map((bucket) => {
                const incomeHeight = maxWeekly ? Math.round((bucket.income / maxWeekly) * 100) : 0;
                const expenseHeight = maxWeekly ? Math.round((bucket.expense / maxWeekly) * 100) : 0;
                return (
                  <div key={bucket.label} className="flex flex-col items-center gap-2">
                    <div className="flex h-36 w-full flex-col justify-end rounded-md border border-border/80 bg-white p-1">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-b from-emerald-500 to-sky-500"
                        style={{ height: `${incomeHeight}%` }}
                        title={`Income ${formatCurrency(bucket.income, currency)}`}
                      />
                      <div
                        className="mt-1 w-full rounded-b-md bg-gradient-to-b from-navy-500 to-navy-700"
                        style={{ height: `${expenseHeight}%` }}
                        title={`Expenses ${formatCurrency(bucket.expense, currency)}`}
                      />
                    </div>
                    <p className="text-xs text-muted">{bucket.label}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-white p-4 text-sm text-muted">
              Cashflow data will appear once you have posted transactions in the last six weeks.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border/80 bg-white p-3">
              <p className="text-xs text-muted">Avg weekly income</p>
              <p className="text-base font-semibold text-ink">
                {formatCurrency(
                  weeklySeries.reduce((sum, w) => sum + w.income, 0) /
                    (weeklySeries.length || 1),
                  currency,
                )}
              </p>
            </div>
            <div className="rounded-md border border-border/80 bg-white p-3">
              <p className="text-xs text-muted">Avg weekly expenses</p>
              <p className="text-base font-semibold text-ink">
                {formatCurrency(
                  weeklySeries.reduce((sum, w) => sum + w.expense, 0) /
                    (weeklySeries.length || 1),
                  currency,
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Expense cadence</p>
            <h2 className="text-lg font-semibold text-ink">
              Trend line · last 3 months by category
            </h2>
          </div>
          <span className="pill">
            {monthWindows.map((m) => m.label).join(" · ")}
          </span>
        </div>
        {trendSeries.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {trendSeries.map((cat) => {
              const points = sparklinePoints(cat.values, 120, 50);
              return (
                <div
                  key={cat.name}
                  className="space-y-2 rounded-md border border-border/80 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-ink">{cat.name}</p>
                    <p className="text-sm text-muted">
                      {formatCurrency(cat.values[cat.values.length - 1] ?? 0, currency)}
                    </p>
                  </div>
                  <svg viewBox="0 0 120 50" className="h-12 w-full text-emerald-600">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      points={points}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {cat.values.map((value, idx) => {
                      const x =
                        cat.values.length === 1
                          ? 60
                          : (idx / (cat.values.length - 1)) * 120;
                      const y =
                        maxTrendValue > 0
                          ? 50 - (value / maxTrendValue) * 42
                          : 49;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r={3}
                          fill="currentColor"
                          opacity={0.8}
                        />
                      );
                    })}
                  </svg>
                  <div className="flex justify-between text-xs text-muted">
                    {monthWindows.map((m) => (
                      <span key={m.label}>{m.label}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-white p-4 text-sm text-muted">
            Not enough history to plot a 3-month trend yet.
          </div>
        )}
      </div>
    </div>
  );
}
