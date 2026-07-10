"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { HealthResult, HealthStatus, Tool } from "@/lib/types";
import { HealthIndicator } from "./HealthIndicator";

export interface HealthRow {
  id: string;
  name: string;
  category: string;
  maturity: Tool["maturity"];
  health: HealthResult;
}

type SortKey =
  | "name"
  | "status"
  | "daysSinceRelease"
  | "githubStars"
  | "npmDownloadsWeekly";

const STATUS_RANK: Record<HealthStatus, number> = {
  failing: 0,
  warning: 1,
  unknown: 2,
  healthy: 3,
};

function SortableTh({
  label,
  sortKey,
  activeKey,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  asc: boolean;
  onSort: (k: SortKey) => void;
}) {
  return (
    <th className="border-b border-edge p-3 text-left">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 font-semibold hover:text-accent"
      >
        {label}
        {activeKey === sortKey && (
          <span className="text-xs">{asc ? "▲" : "▼"}</span>
        )}
      </button>
    </th>
  );
}

export function HealthTable({ rows }: { rows: HealthRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [asc, setAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<HealthStatus | "all">("all");

  const sorted = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? rows
        : rows.filter((r) => r.health.status === statusFilter);

    const dir = asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "status":
          return (
            (STATUS_RANK[a.health.status] - STATUS_RANK[b.health.status]) * dir
          );
        case "daysSinceRelease":
          return (
            ((a.health.daysSinceRelease ?? Infinity) -
              (b.health.daysSinceRelease ?? Infinity)) *
            dir
          );
        case "githubStars":
          return (
            ((a.health.githubStars ?? -1) - (b.health.githubStars ?? -1)) * dir
          );
        case "npmDownloadsWeekly":
          return (
            ((a.health.npmDownloadsWeekly ?? -1) -
              (b.health.npmDownloadsWeekly ?? -1)) *
            dir
          );
      }
    });
  }, [rows, sortKey, asc, statusFilter]);

  const setSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.health.status] = (c[r.health.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const FILTERS: (HealthStatus | "all")[] = [
    "all",
    "healthy",
    "warning",
    "failing",
    "unknown",
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
              statusFilter === f
                ? "border-accent bg-accent/15 text-accent"
                : "border-edge text-ink-muted hover:text-ink"
            }`}
          >
            {f} ({counts[f] ?? 0})
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto scroll-thin rounded-xl border border-edge">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-light">
            <tr>
              <SortableTh label="Tool" sortKey="name" activeKey={sortKey} asc={asc} onSort={setSort} />
              <SortableTh label="Status" sortKey="status" activeKey={sortKey} asc={asc} onSort={setSort} />
              <th className="border-b border-edge p-3 text-left font-semibold">
                Latest
              </th>
              <SortableTh label="Days since release" sortKey="daysSinceRelease" activeKey={sortKey} asc={asc} onSort={setSort} />
              <SortableTh label="Stars" sortKey="githubStars" activeKey={sortKey} asc={asc} onSort={setSort} />
              <SortableTh label="npm / wk" sortKey="npmDownloadsWeekly" activeKey={sortKey} asc={asc} onSort={setSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-surface-light/40">
                <td className="border-t border-edge/40 p-3">
                  <Link
                    href={`/tools/${r.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="border-t border-edge/40 p-3">
                  <HealthIndicator
                    status={r.health.status}
                    showLabel
                    size="sm"
                    detail={
                      r.health.checks.find((c) => !c.passed)?.detail ?? undefined
                    }
                  />
                </td>
                <td className="border-t border-edge/40 p-3 text-ink-muted">
                  {r.health.latestVersion ? `v${r.health.latestVersion}` : "—"}
                </td>
                <td className="border-t border-edge/40 p-3 text-ink-muted">
                  {r.health.daysSinceRelease ?? "—"}
                </td>
                <td className="border-t border-edge/40 p-3 text-ink-muted">
                  {r.health.githubStars?.toLocaleString() ?? "—"}
                </td>
                <td className="border-t border-edge/40 p-3 text-ink-muted">
                  {r.health.npmDownloadsWeekly?.toLocaleString() ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
