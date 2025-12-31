type MetricRowProps = {
  label: string;
  value: string;
  trend?: string;
};

export function MetricRow({ label, value, trend }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span>{value}</span>
        {trend ? (
          <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
            {trend}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
