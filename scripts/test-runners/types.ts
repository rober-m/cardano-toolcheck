// Shared types for the feature-test harness. These live under scripts/ (which is
// excluded from the Next/TS build and run via tsx), so they intentionally mirror —
// rather than import — the app-facing shapes in lib/types.ts. Keep the two in sync:
// the per-tool JSON written here is what lib/data.ts reads.

export type TestStatus = "pass" | "fail" | "skip" | "error";
export type TestDepth = "offline" | "devnet";
export type Ecosystem = "node" | "pytest" | "cargo" | "aiken" | "jvm" | "docker";

// One declared test in a tool's tool.test.json.
export interface TestDescriptorCase {
  id: string;
  features: string[];
  depth: TestDepth;
  // How the runner maps this descriptor to an actual native test case. Meaning is
  // ecosystem-specific (e.g. a test name/id, or a reserved token like "build").
  match?: string;
  description?: string;
}

export interface RunnerSpec {
  install?: string; // optional preflight command; non-zero => tool's tests become "error"
  command?: string; // native test command, run via `sh -c` with cwd = tests/<toolId>
  // How the runner parses `command` output; ecosystem runners pick a sensible default.
  resultFormat?:
    | "junit-xml"
    | "tap"
    | "json-lines"
    | "aiken-json"
    | "pytest-json"
    | "exit-code";
}

// The full tests/<toolId>/tool.test.json shape.
export interface ToolTestDescriptor {
  toolId: string;
  ecosystem: Ecosystem;
  runner: RunnerSpec;
  tests: TestDescriptorCase[];
}

// One test's outcome, as written to data/test-results/<toolId>.json.
export interface TestCaseResult {
  id: string;
  features: string[];
  depth: TestDepth;
  status: TestStatus;
  durationMs?: number;
  detail: string;
}

export interface RunContext {
  toolDir: string; // absolute path to tests/<toolId>
  depth: "offline" | "devnet" | "all";
  devnetEnabled: boolean; // TEST_DEVNET=1
}

// Every ecosystem runner implements this signature.
export type Runner = (
  descriptor: ToolTestDescriptor,
  ctx: RunContext,
) => Promise<TestCaseResult[]>;
