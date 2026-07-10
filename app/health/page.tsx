import type { Metadata } from "next";
import {
  getAllTools,
  getHealthForTool,
  getHealthLastRun,
  getCategoryById,
} from "@/lib/data";
import { HealthTable, type HealthRow } from "@/components/HealthTable";

export const metadata: Metadata = {
  title: "Health Dashboard",
  description:
    "Automated maintenance health checks for every Cardano tool — release recency, downloads, stars, and status.",
};

export default function HealthPage() {
  const lastRun = new Date(getHealthLastRun());

  const rows: HealthRow[] = getAllTools()
    .map((t) => {
      const health = getHealthForTool(t.id);
      if (!health) return null;
      return {
        id: t.id,
        name: t.name,
        category: getCategoryById(t.category)?.name ?? t.category,
        maturity: t.maturity,
        health,
      };
    })
    .filter((r): r is HealthRow => r !== null);

  const summary = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.health.status] = (acc[r.health.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Health Dashboard</h1>
          <p className="mt-1 max-w-3xl text-ink-muted">
            Automated checks verify each tool is actively maintained — release
            recency, package publishes, and reachability. A green dot means we
            recently confirmed it&apos;s alive.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* External CI badge — a plain <img> is intentional (no optimization
              in a static export, and next/image can't process a remote SVG). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Health check workflow status"
            src="https://github.com/cardano-community/cardano-toolcheck/actions/workflows/health-check.yml/badge.svg"
            className="h-5"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-ink-muted">
        <span>
          Last run:{" "}
          <span className="text-ink">
            {lastRun.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </span>
        <span className="text-health-healthy">
          {summary.healthy ?? 0} healthy
        </span>
        <span className="text-health-warning">
          {summary.warning ?? 0} warning
        </span>
        <span className="text-health-failing">
          {summary.failing ?? 0} failing
        </span>
        {summary.unknown ? (
          <span className="text-health-unknown">{summary.unknown} unknown</span>
        ) : null}
      </div>

      <div className="mt-8">
        <HealthTable rows={rows} />
      </div>

      <p className="mt-6 text-xs text-ink-muted">
        Results are written by <code>scripts/health-check.ts</code> on a weekly
        GitHub Actions schedule and committed back to{" "}
        <code>data/health-results.json</code>. The data shown here is a
        representative seed dataset.
      </p>
    </div>
  );
}
