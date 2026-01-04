import Link from "next/link";
import { Ban, Download, ShieldCheck } from "lucide-react";
import { MetricRow } from "@/components/landing/metric-row";

type HeroMetric = {
  label: string;
  value: string;
  trend?: string;
};

type HeroLeftProps = {
  title: string;
  description: string;
  metrics: HeroMetric[];
  sectionId?: string;
  onSignIn?: () => void;
  onSignUp?: () => void;
};

export function HeroLeft({
  title,
  description,
  metrics,
  sectionId,
  onSignIn,
  onSignUp,
}: HeroLeftProps) {
  return (
    <section id={sectionId} className="space-y-8" aria-labelledby="hero-title">
      <div className="space-y-4">
        <h1
          id="hero-title"
          className="text-4xl font-semibold text-white sm:text-5xl lg:text-6xl"
        >
          {title}
        </h1>
        <p className="max-w-xl text-base text-white/80 sm:text-lg">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {onSignUp ? (
          <button
            type="button"
            onClick={onSignUp}
            className="inline-flex items-center rounded-[var(--radius-pill)] bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            Get started
          </button>
        ) : (
          <Link
            href="/signup"
            className="inline-flex items-center rounded-[var(--radius-pill)] bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            Get started
          </Link>
        )}
        {onSignIn ? (
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center text-sm font-semibold text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            Sign in
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-semibold text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        )}
      </div>
      <div
        className="flex flex-wrap items-center gap-4 text-xs font-medium uppercase tracking-[0.2em] text-white/70"
        aria-label="Trust highlights"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          Privacy-first
        </div>
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          Export anytime
        </div>
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          No ads
        </div>
      </div>
      <dl className="grid gap-5 rounded-[var(--radius-card)] border border-border/60 bg-card/80 p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2 sm:gap-6">
        {metrics.map((metric) => (
          <MetricRow
            key={metric.label}
            label={metric.label}
            value={metric.value}
            trend={metric.trend}
          />
        ))}
      </dl>
    </section>
  );
}
