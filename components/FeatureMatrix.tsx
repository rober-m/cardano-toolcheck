"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  Category,
  Feature,
  Tool,
  TestData,
  CellStatus,
  UpstreamCiStatus,
} from "@/lib/types";
import { getClaimedCellStatus, type CellGrade } from "@/lib/cell-status";
import { groupColor } from "./FeatureBadge";

// Renders the graded dot for a single cell. `ciHint` is the tool's own upstream CI
// status; it only affects the "untested" state, where a green upstream CI adds a
// faint fill inside the dashed ring — a secondary hint, NOT our verified grade.
function CellDot({
  grade,
  color,
  ciHint,
}: {
  grade: CellGrade | null;
  color: string;
  ciHint?: UpstreamCiStatus;
}) {
  // Tool does not claim this feature — dim "not offered" dot (original look).
  if (grade === null) {
    return <span className="inline-block h-3 w-3 rounded-full bg-edge/40" />;
  }

  const base = "inline-block h-3 w-3 rounded-full";
  switch (grade.status) {
    case "full":
      return <span className={base} style={{ backgroundColor: color }} />;
    case "half":
      return (
        <span
          className={base}
          style={{
            background: `linear-gradient(90deg, ${color} 0 50%, transparent 50% 100%)`,
            border: `1px solid ${color}`,
          }}
        />
      );
    case "empty":
      return (
        <span
          className={base}
          style={{ backgroundColor: "transparent", border: "1.5px solid var(--color-fail)" }}
        />
      );
    case "untested":
      return (
        <span
          className={base}
          style={{
            backgroundColor:
              ciHint === "passing" ? `color-mix(in srgb, ${color} 22%, transparent)` : "transparent",
            border: `1.5px dashed ${color}`,
          }}
        />
      );
  }
}

const STATUS_LABEL: Record<CellStatus, string> = {
  full: "verified — all tests pass",
  half: "partial — more than half pass",
  empty: "failing — half or fewer pass",
  untested: "claimed, not yet tested",
};

function cellTooltip(
  toolName: string,
  feature: Feature,
  grade: CellGrade | null,
  ci?: UpstreamCiStatus,
): string {
  if (grade === null) return `${toolName} — ${feature.label}: not offered`;
  if (grade.status === "untested") {
    const ciNote =
      ci === "passing"
        ? " · the project's own CI is green (not verified by us)"
        : ci === "failing"
          ? " · the project's own CI is failing"
          : "";
    return `${toolName} — ${feature.label}: ${STATUS_LABEL.untested}${ciNote}`;
  }
  const counts = grade.total > 0 ? ` (${grade.passed}/${grade.total} tests)` : "";
  const when = grade.lastRun ? `, last run ${grade.lastRun.slice(0, 10)}` : "";
  return `${toolName} — ${feature.label}: ${STATUS_LABEL[grade.status]}${counts}${when}`;
}

// A single legend swatch. Reuses an on-chain group color for the shape samples.
function LegendItem({ node, label }: { node: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
      {node}
      {label}
    </span>
  );
}

export function FeatureMatrix({
  tools,
  features,
  categories,
  testResults,
  ciByTool,
}: {
  tools: Tool[];
  features: Feature[];
  categories: Category[];
  testResults: TestData;
  ciByTool: Record<string, UpstreamCiStatus>;
}) {
  const groupNames = useMemo(
    () => Array.from(new Set(features.map((f) => f.group))),
    [features],
  );

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeGroups, setActiveGroups] = useState<Set<string>>(
    new Set(groupNames),
  );
  const [testedOnly, setTestedOnly] = useState(false);

  const visibleFeatures = features.filter((f) => activeGroups.has(f.group));
  const visibleTools = tools
    .filter((t) => categoryFilter === "all" || t.category === categoryFilter)
    .filter((t) => !testedOnly || testResults.results[t.id] !== undefined);

  const toggleGroup = (g: string) =>
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  // A neutral color for legend samples that don't belong to a group.
  const sample = "var(--color-grp-off-chain)";

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            Category
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-edge bg-surface-light px-2 py-1.5 text-sm text-ink focus:border-accent/60 focus:outline-none"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={testedOnly}
              onChange={(e) => setTestedOnly(e.target.checked)}
              className="accent-accent"
            />
            Tools with tests only
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {groupNames.map((g) => {
            const on = activeGroups.has(g);
            const color = groupColor(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGroup(g)}
                className="rounded-md border px-2 py-1 text-xs font-medium capitalize transition-opacity"
                style={{
                  borderColor: color,
                  color: on ? "#fff" : color,
                  backgroundColor: on
                    ? color
                    : `color-mix(in srgb, ${color} 14%, transparent)`,
                  opacity: on ? 1 : 0.7,
                }}
              >
                {g.replace("-", " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <LegendItem
          node={<CellDot grade={{ status: "full", passed: 1, total: 1, lastRun: null }} color={sample} />}
          label="Verified (all pass)"
        />
        <LegendItem
          node={<CellDot grade={{ status: "half", passed: 1, total: 2, lastRun: null }} color={sample} />}
          label="Partial (>50%)"
        />
        <LegendItem
          node={<CellDot grade={{ status: "empty", passed: 0, total: 2, lastRun: null }} color={sample} />}
          label="Failing (<50%)"
        />
        <LegendItem
          node={<CellDot grade={{ status: "untested", passed: 0, total: 0, lastRun: null }} color={sample} />}
          label="Claimed, untested"
        />
        <LegendItem
          node={
            <CellDot
              grade={{ status: "untested", passed: 0, total: 0, lastRun: null }}
              color={sample}
              ciHint="passing"
            />
          }
          label="Untested · upstream CI green"
        />
        <LegendItem
          node={<CellDot grade={null} color={sample} />}
          label="Not offered"
        />
      </div>

      {/* Matrix */}
      <div className="mt-4 overflow-x-auto scroll-thin rounded-xl border border-edge">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-edge bg-surface-light p-3 text-left font-semibold">
                Tool
              </th>
              {visibleFeatures.map((f) => {
                const color = groupColor(f.group);
                return (
                  <th
                    key={f.id}
                    title={f.description}
                    className="border-b border-edge bg-surface-light p-2 align-bottom"
                    style={{ borderTop: `2px solid ${color}` }}
                  >
                    <div className="mx-auto h-28 w-6 [writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-xs text-ink-muted">
                      {f.short}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleTools.map((t) => (
              <tr key={t.id} className="hover:bg-surface-light/40">
                <th className="sticky left-0 z-10 border-r border-edge bg-surface p-3 text-left font-medium">
                  <Link
                    href={`/tools/${t.id}`}
                    className="whitespace-nowrap hover:text-accent"
                  >
                    {t.name}
                  </Link>
                </th>
                {visibleFeatures.map((f) => {
                  const claims = t.features.includes(f.id);
                  const grade = getClaimedCellStatus(testResults, t.id, f.id, claims);
                  const color = groupColor(f.group);
                  const ci = ciByTool[t.id];
                  return (
                    <td
                      key={f.id}
                      className="border-t border-edge/40 p-2 text-center"
                      title={cellTooltip(t.name, f, grade, ci)}
                    >
                      <CellDot grade={grade} color={color} ciHint={ci} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        Showing {visibleTools.length} tools × {visibleFeatures.length} features.
        Each dot is graded by automated feature tests — scroll horizontally to see
        all capabilities, and hover a cell for the pass/fail detail.
      </p>
    </div>
  );
}
