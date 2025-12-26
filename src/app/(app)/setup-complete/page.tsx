import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/onboarding";
import { Frequency } from "@prisma/client";

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

const cadenceLabels: Record<Frequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  SEMIMONTHLY: "Semimonthly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export default async function SetupCompletePage() {
  const user = await requireOnboardedUser();
  const userId = user.id;
  const currency = user.currency ?? "USD";

  const [paySchedule, budgetPlan, bills, goals] = await Promise.all([
    prisma.paySchedule.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.budgetPlan.findFirst({
      where: { userId },
      include: { items: { include: { category: true } } },
      orderBy: { periodStart: "desc" },
    }),
    prisma.bill.findMany({
      where: { userId },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalBudget = budgetPlan?.items.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-6">
      <div className="w-full space-y-8 rounded-2xl border border-border/70 bg-card p-10 shadow-[0_14px_36px_rgba(5,63,43,0.1)]">
        <div className="space-y-3">
          <p className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(34,197,143,0.32)]">
            Setup complete
          </p>
          <h1 className="text-3xl font-semibold text-ink">
            Nice work, {user.name ? user.name.split(" ")[0] : "there"}!
          </h1>
          <p className="text-muted">
            Your plan is ready. Here is a quick summary of what we just set up.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-white/80 p-5 space-y-2">
            <h2 className="text-lg font-semibold text-ink">Pay schedule</h2>
            {paySchedule ? (
              <div className="text-sm text-muted space-y-1">
                <p>
                  {cadenceLabels[paySchedule.cadence]} cadence with{" "}
                  {formatCurrency(Number(paySchedule.netPay), currency)} net pay.
                </p>
                <p>
                  Next payday:{" "}
                  {paySchedule.nextPayDate?.toLocaleDateString("en-US") ?? "Not scheduled"}.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">No pay schedule found yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-white/80 p-5 space-y-2">
            <h2 className="text-lg font-semibold text-ink">Budget plan</h2>
            {budgetPlan ? (
              <div className="text-sm text-muted space-y-1">
                <p>
                  {budgetPlan.name} with {budgetPlan.items.length} categories and a total target of{" "}
                  {formatCurrency(Number(totalBudget ?? 0), currency)}.
                </p>
                <p className="text-xs">
                  Top categories:{" "}
                  {budgetPlan.items
                    .slice(0, 3)
                    .map((item) => item.category?.name ?? "Uncategorized")
                    .join(", ") || "None"}
                  .
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">No budget plan created yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-white/80 p-5 space-y-2">
            <h2 className="text-lg font-semibold text-ink">Bills</h2>
            {bills.length ? (
              <ul className="text-sm text-muted space-y-1">
                {bills.map((bill) => (
                  <li key={bill.id}>
                    {bill.name} - {formatCurrency(Number(bill.amount), currency)} due{" "}
                    {bill.dueDate.toLocaleDateString("en-US")}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No bills added yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-white/80 p-5 space-y-2">
            <h2 className="text-lg font-semibold text-ink">Savings goals</h2>
            {goals.length ? (
              <ul className="text-sm text-muted space-y-1">
                {goals.map((goal) => (
                  <li key={goal.id}>
                    {goal.name} - {formatCurrency(Number(goal.targetAmount), currency)} target
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No goals added yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="pill inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-sky-500 text-white border-transparent shadow-[0_12px_32px_rgba(34,197,143,0.35)] hover:brightness-105 transition"
          >
            View dashboard
          </Link>
          <Link
            href="/transactions"
            className="pill inline-flex items-center gap-2 border border-border/80 bg-white/80 text-ink hover:bg-card"
          >
            Add a transaction
          </Link>
          <Link
            href="/guide"
            className="pill inline-flex items-center gap-2 border border-border/80 bg-white/80 text-ink hover:bg-card"
          >
            Read the guide
          </Link>
        </div>
      </div>
    </div>
  );
}
