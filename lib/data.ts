// Typed accessors over the JSON data files. All data is imported at build time
// (no runtime fetching) so these run during static generation.
import toolsData from "@/data/tools.json";
import categoriesData from "@/data/categories.json";
import featuresData from "@/data/features.json";
import compatibilityData from "@/data/compatibility.json";
import healthData from "@/data/health-results.json";
import testData from "@/data/test-results.json";

import type {
  Tool,
  Category,
  Feature,
  Compatibility,
  HealthData,
  HealthResult,
  TestData,
  ToolTestResult,
  UpstreamCiStatus,
} from "./types";
import { countVerifiedCells } from "./cell-status";

export const tools = toolsData as Tool[];
export const categories = (categoriesData as Category[])
  .slice()
  .sort((a, b) => a.order - b.order);
export const features = featuresData as Feature[];
export const compatibility = compatibilityData as Compatibility;
export const health = healthData as HealthData;
export const testResults = testData as TestData;

// ─── Tools ───
export function getAllTools(): Tool[] {
  return tools;
}

export function getAllToolIds(): string[] {
  return tools.map((t) => t.id);
}

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id);
}

export function getToolsByCategory(categoryId: string): Tool[] {
  return tools.filter((t) => t.category === categoryId);
}

export function getToolsByFeature(featureId: string): Tool[] {
  return tools.filter((t) => t.features.includes(featureId));
}

export function getRecommendedTools(): Tool[] {
  return tools.filter((t) => t.isRecommendedDefault);
}

// Resolve a list of tool ids into the subset of tools that actually exist.
// Several ids referenced in dependsOn/usedBy (e.g. "db-sync") may or may not
// have a full tool entry; callers can still show the raw id when missing.
export function resolveToolIds(ids: string[]): Tool[] {
  return ids
    .map((id) => getToolById(id))
    .filter((t): t is Tool => t !== undefined);
}

// ─── Categories ───
export function getAllCategories(): Category[] {
  return categories;
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

// ─── Features ───
export function getAllFeatures(): Feature[] {
  return features;
}

export function getFeatureById(id: string): Feature | undefined {
  return features.find((f) => f.id === id);
}

export function getFeaturesByGroup(): Record<string, Feature[]> {
  const grouped: Record<string, Feature[]> = {};
  for (const f of features) {
    (grouped[f.group] ??= []).push(f);
  }
  return grouped;
}

// ─── Health ───
export function getHealthForTool(id: string): HealthResult | undefined {
  return health.results[id];
}

export function getHealthLastRun(): string {
  return health.lastRun;
}

// Map of toolId → upstream CI status (the project's own CI on its default branch).
// Used as a faint secondary hint on matrix cells we haven't tested ourselves.
export function getUpstreamCiByTool(): Record<string, UpstreamCiStatus> {
  const out: Record<string, UpstreamCiStatus> = {};
  for (const [id, r] of Object.entries(health.results)) {
    out[id] = r.upstreamCi ?? "unknown";
  }
  return out;
}

// ─── Feature tests ───
export function getTestsForTool(id: string): ToolTestResult | undefined {
  return testResults.results[id];
}

export function getTestLastRun(): string {
  return testResults.lastRun;
}

// ─── Derived stats for the home page ───
export function getStats() {
  const healthyCount = Object.values(health.results).filter(
    (r) => r.status === "healthy",
  ).length;
  return {
    toolCount: tools.length,
    categoryCount: categories.length,
    featureCount: features.length,
    healthyCount,
    verifiedCellCount: countVerifiedCells(testResults, tools),
  };
}

// Distinct surface languages across all tools (for the catalog language filter).
export function getAllLanguages(): string[] {
  const set = new Set<string>();
  for (const t of tools) for (const l of t.languages) set.add(l);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
