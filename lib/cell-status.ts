// Grades one (tool, feature) matrix cell from test results.
//
// This module is intentionally pure (no Node/fs imports) so it bundles into the
// client-side FeatureMatrix component as well as running during static export.
import type { CellStatus, TestData } from "./types";

// Detail returned alongside the status so the matrix can build a tooltip.
export interface CellGrade {
  status: CellStatus;
  passed: number;
  total: number; // number of counted (pass/fail) tests for this cell
  lastRun: string | null;
}

// Returns the grade for a cell the tool CLAIMS, or `null` when the tool does not
// claim the feature (the matrix renders the existing dim "not offered" dot for
// that case). Only `pass`/`fail` tests are counted; `skip`/`error` are ignored.
export function getClaimedCellStatus(
  results: TestData,
  toolId: string,
  featureId: string,
  toolClaimsFeature: boolean,
): CellGrade | null {
  if (!toolClaimsFeature) return null;

  const tool = results.results[toolId];
  const counted = (tool?.tests ?? []).filter(
    (t) =>
      t.features.includes(featureId) &&
      (t.status === "pass" || t.status === "fail"),
  );

  if (counted.length === 0) {
    return { status: "untested", passed: 0, total: 0, lastRun: tool?.lastRun ?? null };
  }

  const passed = counted.filter((t) => t.status === "pass").length;
  const ratio = passed / counted.length;
  const status: CellStatus = ratio === 1 ? "full" : ratio > 0.5 ? "half" : "empty";

  return { status, passed, total: counted.length, lastRun: tool?.lastRun ?? null };
}

// Count of cells across the whole matrix that are verified (full). Used for the
// home-page stats strip.
export function countVerifiedCells(
  results: TestData,
  tools: { id: string; features: string[] }[],
): number {
  let n = 0;
  for (const t of tools) {
    for (const f of t.features) {
      const grade = getClaimedCellStatus(results, t.id, f, true);
      if (grade?.status === "full") n++;
    }
  }
  return n;
}
