const highlights = [
  {
    label: "Total balance",
    value: "$24,870",
    change: "+4.2% vs last month",
    tone: "text-emerald-700 bg-emerald-500/10",
  },
  {
    label: "Monthly spend",
    value: "$5,420",
    change: "-3.1% vs last month",
    tone: "text-navy-700 bg-navy-500/10",
  },
  {
    label: "Cash runway",
    value: "7.4 months",
    change: "steady",
    tone: "text-muted bg-card",
  },
];

const budgets = [
  { name: "Essentials", spent: 1620, cap: 2400 },
  { name: "Lifestyle", spent: 740, cap: 1200 },
  { name: "Savings", spent: 820, cap: 1000 },
];

const bills = [
  { name: "Rent", due: "Due in 4 days", amount: "$1,950" },
  { name: "Internet", due: "Due in 9 days", amount: "$85" },
  { name: "Utilities", due: "Due in 12 days", amount: "$140" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <header className="grid gap-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-card to-sky-500/10 p-8">
        <p className="pill inline-flex w-fit items-center gap-2 border-emerald-500/40 bg-white/80 text-emerald-700">
          Personal finance OS
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-ink">
              Welcome back, keep your money moving with intention.
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted">
              Track cash, upcoming bills, budgets, and goals from a single,
              opinionated cockpit.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="pill bg-emerald-500 text-white border-transparent shadow-[0_12px_28px_rgba(34,197,143,0.35)] hover:brightness-105">
              Add account
            </button>
            <button className="pill border-border/80 bg-card text-ink hover:border-emerald-500/50">
              Start automation
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-[0_12px_30px_rgba(13,56,95,0.08)]"
          >
            <p className="text-sm text-muted">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{item.value}</p>
            <p className={`mt-2 text-sm ${item.tone}`}>{item.change}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 rounded-2xl border border-border/70 bg-white/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Budgets</h2>
            <span className="pill">Monthly · May</span>
          </div>
          <div className="space-y-4">
            {budgets.map((bucket) => {
              const progress = Math.min(
                100,
                Math.round((bucket.spent / bucket.cap) * 100),
              );
              return (
                <div key={bucket.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-ink">{bucket.name}</p>
                    <p className="text-sm text-muted">
                      ${bucket.spent} / ${bucket.cap} · {progress}%
                    </p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-border/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Upcoming bills</h2>
            <span className="pill">Auto-pay ready</span>
          </div>
          <div className="space-y-3">
            {bills.map((bill) => (
              <div
                key={bill.name}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-white/80 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-ink">{bill.name}</p>
                  <p className="text-sm text-muted">{bill.due}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-700">
                  {bill.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
