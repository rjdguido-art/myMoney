import { requireOnboardedUser } from "@/lib/onboarding";

export default async function SettingsPage() {
  await requireOnboardedUser();
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Settings</h1>
          <p className="text-muted">
            Manage account preferences, connections, and notifications.
          </p>
        </div>
        <button className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(34,197,143,0.32)] hover:brightness-105">
          Save changes
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-6 shadow-[0_12px_32px_rgba(13,56,95,0.08)]">
          <div>
            <p className="pill bg-white/80 text-emerald-700 border-emerald-500/30">
              Profile
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">Identity</h2>
            <p className="text-muted">Name, email, and timezone.</p>
          </div>
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-ink">Full name</label>
              <input
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                placeholder="Casey Money"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">Email</label>
              <input
                className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                placeholder="you@example.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-ink">Timezone</label>
              <select className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none">
                <option>UTC</option>
                <option>ET (UTC-5)</option>
                <option>PT (UTC-8)</option>
              </select>
            </div>
          </form>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-6 shadow-[0_12px_32px_rgba(13,56,95,0.08)]">
          <div>
            <p className="pill bg-white/80 text-navy-700 border-navy-500/30">
              Notifications
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">
              Alerts & automation
            </h2>
            <p className="text-muted">Stay in control with timely nudges.</p>
          </div>
          <div className="space-y-4">
            {[
              "Large transaction alerts",
              "Upcoming bill reminders",
              "Weekly spending summary",
            ].map((item) => (
              <label
                key={item}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-white/80 px-4 py-3 text-sm text-ink"
              >
                <span>{item}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-6 shadow-[0_12px_32px_rgba(13,56,95,0.08)] lg:col-span-2">
          <div>
            <p className="pill bg-white/80 text-emerald-700 border-emerald-500/30">
              Navigation guide
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">What you can do</h2>
            <p className="text-muted">
              Quick map of the core workspaces so you can move fast.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Dashboard", detail: "Cashflow forecast and safe-to-spend." },
              { title: "Transactions", detail: "Review, split, and categorize activity." },
              { title: "Budgets", detail: "Set category targets and track progress." },
              { title: "Bills", detail: "Track recurring bills and due dates." },
              { title: "Insights", detail: "See trends and category breakdowns." },
              { title: "Settings", detail: "Update your preferences and rules." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/70 bg-white/80 p-4 text-sm"
              >
                <p className="font-semibold text-ink">{item.title}</p>
                <p className="text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
