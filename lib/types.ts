// TypeScript interfaces for every JSON data shape under /data.
// These mirror the spec's data model (section 2).

export type Maturity =
  | "production"
  | "active"
  | "experimental"
  | "legacy"
  | "deprecated";

export type HealthStatus = "healthy" | "warning" | "failing" | "unknown";

// Conclusion of a tool's OWN latest CI run on its default branch. A maintenance
// signal, distinct from feature verification (see the feature-test matrix).
export type UpstreamCiStatus = "passing" | "failing" | "unknown";

export type FeatureGroup =
  | "on-chain"
  | "off-chain"
  | "wallet"
  | "low-level"
  | "infrastructure"
  | "scalability"
  | "data"
  | "quality";

export interface HealthCheckConfig {
  type: string;
  repo: string | null;
  additionalChecks: string[];
}

export interface Tool {
  id: string;
  name: string;
  tagline: string;
  website: string;
  repo: string | null;
  logo: string | null;
  maintainer: string;
  category: string;
  subcategory?: string | null;
  languages: string[];
  maturity: Maturity;
  features: string[];
  llmDescription: string;
  whenToUse: string;
  skipUntil: string;
  dependsOn: string[];
  optionalDeps: string[];
  usedBy: string[];
  providers: string[] | null;
  smartContractCompat: string[] | null;
  isRecommendedDefault: boolean;
  recommendedFor: string;
  notRecommendedFor: string;
  healthCheck: HealthCheckConfig;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  llmContext: string;
  order: number;
}

export interface Feature {
  id: string;
  label: string;
  short: string;
  group: FeatureGroup;
  description: string;
}

export interface CompatibilityNote {
  sdk?: string;
  provider?: string;
  "smart-contract"?: string;
  note: string;
}

// Matrix cell values are either a boolean or a status string like "beta".
export type CompatCell = boolean | string;

export interface Compatibility {
  sdkProviderMatrix: Record<string, Record<string, CompatCell>>;
  sdkLanguageMatrix: Record<string, Record<string, CompatCell>>;
  notes: CompatibilityNote[];
}

export interface HealthCheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface HealthResult {
  status: HealthStatus;
  lastRelease: string | null;
  latestVersion: string | null;
  daysSinceRelease: number | null;
  npmDownloadsWeekly: number | null;
  githubStars: number | null;
  openIssues: number | null;
  upstreamCi?: UpstreamCiStatus;
  checks: HealthCheckResult[];
}

export interface HealthData {
  lastRun: string;
  results: Record<string, HealthResult>;
}

// ─── Feature tests ───

// A single test's outcome. `pass`/`fail` count toward a cell's grade; `skip`
// (depth not run this time) and `error` (setup/env failure) do NOT count, so a
// missing devnet never flips a verified cell red.
export type TestStatus = "pass" | "fail" | "skip" | "error";

// `offline` tests run cheaply with no network; `devnet` tests need a local
// Dockerized Cardano network and run only in the dedicated CI job.
export type TestDepth = "offline" | "devnet";

// Grade of one (tool, feature) matrix cell that the tool claims.
//   full     – every counted test passed
//   half     – more than half passed
//   empty    – tested, but half or fewer passed
//   untested – tool claims the feature but no counted tests exist yet
export type CellStatus = "full" | "half" | "empty" | "untested";

export interface TestCaseResult {
  id: string;
  features: string[];
  depth: TestDepth;
  status: TestStatus;
  durationMs?: number;
  detail: string;
}

export interface ToolTestResult {
  lastRun: string;
  depthsRun: TestDepth[];
  tests: TestCaseResult[];
}

export interface TestData {
  lastRun: string;
  results: Record<string, ToolTestResult>;
}
