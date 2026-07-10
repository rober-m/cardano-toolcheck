import type { Feature, FeatureGroup } from "@/lib/types";

// Maps a feature group to its theme color (matches the CSS @theme tokens).
const GROUP_COLOR: Record<FeatureGroup, string> = {
  "on-chain": "var(--color-grp-on-chain)",
  "off-chain": "var(--color-grp-off-chain)",
  wallet: "var(--color-grp-wallet)",
  "low-level": "var(--color-grp-low-level)",
  infrastructure: "var(--color-grp-infrastructure)",
  scalability: "var(--color-grp-scalability)",
  data: "var(--color-grp-data)",
  quality: "var(--color-grp-quality)",
};

export function groupColor(group: string): string {
  return GROUP_COLOR[group as FeatureGroup] ?? "var(--color-ink-muted)";
}

export function FeatureBadge({
  feature,
  useShort = false,
}: {
  feature: Feature;
  useShort?: boolean;
}) {
  const color = groupColor(feature.group);
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{ borderColor: `${color}`, color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
      title={feature.description}
    >
      {useShort ? feature.short : feature.label}
    </span>
  );
}
