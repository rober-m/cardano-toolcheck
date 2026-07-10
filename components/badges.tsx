import type { Maturity } from "@/lib/types";

const MATURITY_META: Record<Maturity, { label: string; className: string }> = {
  production: {
    label: "Production",
    className: "bg-health-healthy/15 text-health-healthy border-health-healthy/30",
  },
  active: {
    label: "Active",
    className: "bg-grp-off-chain/15 text-grp-off-chain border-grp-off-chain/30",
  },
  experimental: {
    label: "Experimental",
    className: "bg-health-warning/15 text-health-warning border-health-warning/30",
  },
  legacy: {
    label: "Legacy",
    className: "bg-grp-low-level/15 text-grp-low-level border-grp-low-level/30",
  },
  deprecated: {
    label: "Deprecated",
    className: "bg-health-failing/15 text-health-failing border-health-failing/30",
  },
};

export function MaturityBadge({ maturity }: { maturity: Maturity }) {
  const meta = MATURITY_META[maturity] ?? {
    label: maturity,
    className: "bg-surface-lighter text-ink-muted border-edge",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function CategoryBadge({
  name,
  icon,
  color,
}: {
  name: string;
  icon?: string;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={
        color
          ? { borderColor: `${color}55`, color, backgroundColor: `${color}1a` }
          : undefined
      }
    >
      {icon && <span aria-hidden>{icon}</span>}
      {name}
    </span>
  );
}
