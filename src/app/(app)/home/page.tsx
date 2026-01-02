import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/argo/card";
import { ArgoShell } from "@/components/argo/ArgoBackground";

export default function HomeCommandPage() {
  return (
    <ArgoShell>
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--card)]/80 shadow-[0_10px_26px_rgba(13,19,22,0.18)]">
            <Image
              src="/argo-logo.png"
              alt="ArgoBucks"
              width={48}
              height={48}
              className="h-full w-full scale-[1.08] object-cover"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
              ArgoBucks
            </p>
            <p className="text-lg font-semibold text-[color:var(--text)]">
              Command Home
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)]/80 text-sm font-semibold text-[color:var(--text)] shadow-[0_10px_24px_rgba(13,19,22,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(155,205,198,0.25)]"
          aria-label="Open profile"
        >
          AB
        </button>
      </header>

      <section className="mt-8">
        <Card elevation="lg" className="bg-[color:var(--card)]/92">
          <CardHeader>
            <CardTitle>Today’s signal</CardTitle>
            <CardDescription>
              Your cash flow is steady and your biggest bills are already covered.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-2">
              <p className="text-sm text-[color:var(--muted)]">Available to spend</p>
              <p className="text-3xl font-semibold text-[color:var(--text)]">$2,184</p>
              <p className="text-sm text-[color:var(--muted)]">
                Up $260 compared to last week. Groceries and utilities are on plan.
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)]/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Next checkpoint
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
                Paycheck arrives in 3 days
              </p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Keep dining under $120 to stay green.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card elevation="md" interactive>
          <CardHeader>
            <CardTitle>Available to Spend</CardTitle>
            <CardDescription>After bills and savings.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[color:var(--text)]">$1,020</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">Safe for the next 10 days.</p>
          </CardContent>
        </Card>

        <Card elevation="md" interactive>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
            <CardDescription>Spending vs. budget.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[color:var(--text)]">72% used</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Groceries are steady, transport slightly below plan.
            </p>
          </CardContent>
        </Card>

        <Card elevation="md" interactive>
          <CardHeader>
            <CardTitle>Next Event</CardTitle>
            <CardDescription>Upcoming bill or alert.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[color:var(--text)]">Rent · Sep 1</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">$1,280 scheduled.</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Link
          href="/chat"
          className="flex items-center justify-between gap-4 rounded-full border border-[color:var(--border)] bg-[color:var(--card)]/85 px-5 py-4 text-sm text-[color:var(--muted)] shadow-[0_14px_32px_rgba(13,19,22,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(155,205,198,0.24)]"
        >
          <span className="text-[color:var(--muted)]">Ask Argo AI to summarize your week...</span>
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg)]/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--text)]">
            Command
          </span>
        </Link>
      </section>
    </ArgoShell>
  );
}
