// Generic command runner shared by the node/pytest/cargo/jvm ecosystems.
//
// It runs the descriptor's `runner.command` in tests/<toolId>, parses the native
// output into cases, then maps each declared descriptor test to those cases by
// `match` (a substring of the native test name; falls back to the descriptor id).
// A descriptor test passes iff at least one native case matches and none of the
// matching cases failed. When the format yields no per-case data at all, we fall
// back to the process exit code.
import type { Runner, TestCaseResult, TestDescriptorCase } from "./types";
import { execShell, partitionByDepth, result, truncate, type ExecResult } from "./util";
import { parseByFormat, type NativeCase } from "../test-parsers";

export function makeRunner(defaultFormat: string, timeoutMs = 900_000): Runner {
  return async (desc, ctx) => {
    const { toRun, skipped } = partitionByDepth(desc.tests, ctx);
    const results: TestCaseResult[] = [...skipped];
    if (toRun.length === 0) return results;

    if (!desc.runner.command) {
      for (const t of toRun) results.push(result(t, "error", "no runner.command in descriptor"));
      return results;
    }

    const started = Date.now();
    const exec = execShell(desc.runner.command, ctx.toolDir, timeoutMs);
    const elapsed = Date.now() - started;
    const cases = parseByFormat(desc.runner.resultFormat ?? defaultFormat, exec.stdout);

    for (const t of toRun) results.push(mapCase(t, cases, exec, elapsed));
    return results;
  };
}

function mapCase(
  t: TestDescriptorCase,
  cases: NativeCase[],
  exec: ExecResult,
  elapsed: number,
): TestCaseResult {
  const key = t.match ?? t.id;
  const matching = cases.filter((c) => c.name.includes(key));

  if (matching.length === 0) {
    // No structured cases parsed at all → grade by exit code.
    if (cases.length === 0) {
      if (exec.timedOut) return result(t, "error", "command timed out", elapsed);
      const ok = exec.code === 0;
      return result(
        t,
        ok ? "pass" : "fail",
        ok ? "command exited 0" : `exit ${exec.code}: ${truncate(exec.stderr || exec.stdout)}`,
        elapsed,
      );
    }
    return result(t, "error", `no native test matching "${key}"`, elapsed);
  }

  const failed = matching.filter((c) => !c.passed);
  return failed.length === 0
    ? result(t, "pass", `${matching.length} case(s) passed for "${key}"`, elapsed)
    : result(
        t,
        "fail",
        `${failed.length}/${matching.length} failed: ${failed.map((c) => c.name).join(", ")}`,
        elapsed,
      );
}
