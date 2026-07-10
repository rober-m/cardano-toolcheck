import type { HealthStatus } from "@/lib/types";

const STATUS_META: Record<
  HealthStatus,
  { color: string; label: string }
> = {
  healthy: { color: "bg-health-healthy", label: "Healthy" },
  warning: { color: "bg-health-warning", label: "Needs attention" },
  failing: { color: "bg-health-failing", label: "Failing" },
  unknown: { color: "bg-health-unknown", label: "Unknown" },
};

export function HealthIndicator({
  status,
  detail,
  showLabel = false,
  size = "md",
}: {
  status: HealthStatus;
  detail?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const meta = STATUS_META[status];
  const dot = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={detail ? `${meta.label} — ${detail}` : meta.label}
    >
      <span className={`inline-block rounded-full ${dot} ${meta.color}`} />
      {showLabel && (
        <span className="text-xs text-ink-muted">{meta.label}</span>
      )}
    </span>
  );
}

export { STATUS_META };
