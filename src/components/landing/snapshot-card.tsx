import type { ReactNode } from "react";

type SnapshotBill = {
  name: string;
  amount: string;
};

type SnapshotCardProps = {
  label: string;
  title: string;
  pill: string;
  cashFlowAmount: string;
  cashFlowDelta: string;
  bills: SnapshotBill[];
  budgetPulseCopy: string;
  budgetPulsePercent: number;
};

type SnapshotSectionProps = {
  title: string;
  children: ReactNode;
};

function SnapshotSection({ title, children }: SnapshotSectionProps) {
  return (
    <section
      className="space-y-4 rounded-[var(--radius-card)] border border-border/70 bg-card/90 p-4 transition hover:shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-2"
      aria-labelledby={`snapshot-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <h3
        id={`snapshot-${title.replace(/\s+/g, "-").toLowerCase()}`}
        className="text-xs font-semibold uppercase tracking-[0.3em] text-muted"
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

type BillsListProps = {
  bills: SnapshotBill[];
};

function BillsList({ bills }: BillsListProps) {
  return (
    <ul className="space-y-3 text-sm text-foreground">
      {bills.map((bill) => (
        <li key={bill.name} className="flex items-center justify-between gap-3">
          <span className="font-medium">{bill.name}</span>
          <span className="font-semibold text-foreground">{bill.amount}</span>
        </li>
      ))}
    </ul>
  );
}

type ProgressBarProps = {
  value: number;
  label: string;
};

function ProgressBar({ value, label }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-2">
      <div
        className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface"
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-[var(--radius-pill)] bg-gradient-to-r from-primary/90 via-accent/70 to-success/70"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
    </div>
  );
}

export function SnapshotCard({
  label,
  title,
  pill,
  cashFlowAmount,
  cashFlowDelta,
  bills,
  budgetPulseCopy,
  budgetPulsePercent,
}: SnapshotCardProps) {
  return (
    <section
      id="snapshot"
      className="rounded-[var(--radius-card)] border border-border/60 bg-card/90 p-6 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-2"
      aria-labelledby="snapshot-title"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">{label}</p>
          <h2 id="snapshot-title" className="text-2xl font-semibold text-foreground">
            {title}
          </h2>
        </div>
        <span className="rounded-[var(--radius-pill)] border border-border/70 bg-surface px-3 py-1 text-xs font-medium text-muted">
          {pill}
        </span>
      </header>

      <div className="mt-6 space-y-5">
        <SnapshotSection title="Cash flow">
          <div className="space-y-2">
            <p className="text-3xl font-semibold text-foreground">{cashFlowAmount}</p>
            <p className="text-sm text-muted">{cashFlowDelta}</p>
          </div>
        </SnapshotSection>

        <SnapshotSection title="Upcoming bills">
          <BillsList bills={bills} />
        </SnapshotSection>

        <SnapshotSection title="Budget pulse">
          <p className="text-sm text-muted">{budgetPulseCopy}</p>
          <ProgressBar value={budgetPulsePercent} label={`${budgetPulsePercent}% used`} />
        </SnapshotSection>
      </div>
    </section>
  );
}
