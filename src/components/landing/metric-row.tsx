type MetricRowProps = {
  label: string;
  value: string;
  trend?: string;
};

export function MetricRow({ label, value, trend }: MetricRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </dt>
      <dd className="text-lg font-semibold text-foreground">{value}</dd>
      {trend ? (
        <p className="text-xs font-medium text-muted">{trend}</p>
      ) : null}
    </div>
  );
}
