// Small shared helpers for the ecosystem runners: subprocess execution and
// depth partitioning. Node built-ins only.
import { spawnSync } from "node:child_process";
import type {
  RunContext,
  TestCaseResult,
  TestDescriptorCase,
} from "./types";

export interface ExecResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

// Run a shell command string with a timeout, capturing stdout/stderr. Never throws.
export function execShell(
  command: string,
  cwd: string,
  timeoutMs = 300_000,
  env?: NodeJS.ProcessEnv,
): ExecResult {
  const res = spawnSync("sh", ["-c", command], {
    cwd,
    timeout: timeoutMs,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: env ?? process.env,
  });
  return {
    code: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    timedOut: res.error != null && (res.error as NodeJS.ErrnoException).code === "ETIMEDOUT",
  };
}

// Truncate long tool output for the `detail` field.
export function truncate(s: string, max = 300): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max) + "…" : t;
}

// Build a TestCaseResult from a descriptor case + outcome.
export function result(
  t: TestDescriptorCase,
  status: TestCaseResult["status"],
  detail: string,
  durationMs?: number,
): TestCaseResult {
  return { id: t.id, features: t.features, depth: t.depth, status, detail, durationMs };
}

// Split a descriptor's tests into those to run now vs. those to mark "skip" given
// the requested depth. Offline tests always run; devnet tests run only when depth
// includes devnet AND the devnet is actually enabled (TEST_DEVNET=1).
export function partitionByDepth(
  tests: TestDescriptorCase[],
  ctx: RunContext,
): { toRun: TestDescriptorCase[]; skipped: TestCaseResult[] } {
  const toRun: TestDescriptorCase[] = [];
  const skipped: TestCaseResult[] = [];
  const wantDevnet = ctx.depth === "devnet" || ctx.depth === "all";
  const wantOffline = ctx.depth === "offline" || ctx.depth === "all";

  for (const t of tests) {
    if (t.depth === "offline") {
      if (wantOffline) toRun.push(t);
      else skipped.push(result(t, "skip", "offline depth not requested"));
    } else {
      if (wantDevnet && ctx.devnetEnabled) toRun.push(t);
      else
        skipped.push(
          result(
            t,
            "skip",
            ctx.devnetEnabled ? "devnet depth not requested" : "devnet not enabled (TEST_DEVNET unset)",
          ),
        );
    }
  }
  return { toRun, skipped };
}

// Mark all of a tool's tests as "error" — used when a preflight/setup step fails so
// one broken toolchain doesn't crash the whole run (and doesn't flip cells red).
export function allError(
  tests: TestDescriptorCase[],
  detail: string,
): TestCaseResult[] {
  return tests.map((t) => result(t, "error", detail));
}
