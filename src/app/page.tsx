import { HeroLeft } from "@/components/landing/hero-left";
import { Navbar } from "@/components/landing/navbar";
import { SnapshotCard } from "@/components/landing/snapshot-card";

const heroMetrics = [
  { label: "Views to explore", value: "3" },
  { label: "Bills tracked", value: "Unlimited" },
  { label: "Weekly check-in", value: "5 min", trend: "Auto" },
  { label: "Safe-to-spend", value: "$1,420", trend: "+12%" },
];

const upcomingBills = [
  { name: "Rent", amount: "$1,280" },
  { name: "Utilities", amount: "$180" },
  { name: "Subscriptions", amount: "$42" },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-aurora">
      <div className="relative z-10">
        <Navbar />

        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:px-10">
          <HeroLeft
            sectionId="hero"
            title="Make money feel local, clear, calm."
            description="A peaceful landing spot for budgets, bills, and insights that keeps every household decision steady and obvious."
            metrics={heroMetrics}
          />
          <SnapshotCard
            label="Snapshot"
            title="This week"
            pill="Live preview"
            cashFlowAmount="$2,480"
            cashFlowDelta="Up $260 compared to last week."
            bills={upcomingBills}
            budgetPulseCopy="Groceries are steady. Dining out is nudging above plan."
            budgetPulsePercent={78}
          />
        </div>

        <section
          id="cta"
          className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 pb-20 lg:flex-row lg:items-center lg:justify-between lg:px-10"
          aria-label="Get started"
        >
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Ready to build your home view?</h2>
            <p className="mt-2 text-sm text-muted">
              Start with the free plan, then grow into shared budgets and automated bill flow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/signup"
              className="inline-flex items-center rounded-[var(--radius-pill)] bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              Get started
            </a>
            <a
              href="/login"
              className="inline-flex items-center text-sm font-semibold text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              Sign in
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
