const insights = [
  {
    title: "Spending velocity",
    detail: "You are pacing 6% under your monthly target. Biggest delta: Dining (-$120 vs plan).",
  },
  {
    title: "Income stability",
    detail:
      "Three paychecks on schedule this quarter. PaySchedule: Bi-weekly · Next hit in 4 days.",
  },
  {
    title: "Cash runway",
    detail: "Based on burn of $5.4k/mo across accounts, you have 7.4 months of runway.",
  },
  {
    title: "Debt paydown",
    detail:
      "You are on track to clear credit balance by October if you keep $750/mo toward debt service.",
  },
];

export default function InsightsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Insights</h1>
          <p className="text-muted">
            Quick reads and automation-ready recommendations built from your data.
          </p>
        </div>
        <button className="pill border-border/80 bg-card text-ink hover:border-emerald-500/50">
          Export report
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_10px_26px_rgba(5,63,43,0.08)]"
          >
            <p className="text-sm font-semibold text-emerald-700 uppercase tracking-[0.08em]">
              Insight
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">
              {insight.title}
            </h2>
            <p className="mt-2 text-muted">{insight.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
