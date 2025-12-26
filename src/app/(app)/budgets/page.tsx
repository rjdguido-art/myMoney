import { requireOnboardedUser } from "@/lib/onboarding";

const plans = [
  { name: "Housing", allocated: 2200, used: 1950 },
  { name: "Food & Dining", allocated: 750, used: 520 },
  { name: "Transportation", allocated: 320, used: 140 },
  { name: "Investments", allocated: 650, used: 650 },
];

export default async function BudgetsPage() {
  await requireOnboardedUser();
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Budgets</h1>
          <p className="text-muted">
            Allocate intentionally, track drift, and protect your runway.
          </p>
        </div>
        <button className="pill border-border/80 bg-card text-ink hover:border-emerald-500/50">
          Create budget plan
        </button>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-6 shadow-[0_12px_32px_rgba(13,56,95,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Current plan</p>
            <h2 className="text-lg font-semibold text-ink">May · Monthly</h2>
          </div>
          <span className="pill bg-emerald-500 text-white border-transparent">
            Tracking 4 categories
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const pct = Math.min(
              120,
              Math.round((plan.used / plan.allocated) * 100),
            );
            return (
              <div
                key={plan.name}
                className="rounded-xl border border-border/70 bg-white/80 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink">{plan.name}</p>
                  <p className="text-sm text-muted">
                    ${plan.used} / ${plan.allocated}
                  </p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-border/60">
                  <div
                    className={`h-full rounded-full ${
                      pct > 100
                        ? "bg-gradient-to-r from-navy-700 to-emerald-700"
                        : "bg-gradient-to-r from-emerald-500 to-sky-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted">{pct}% of allocation</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
