// Aiken ecosystem runner.
//
// Aiken is special: `aiken check` runs the project's `test` blocks and, when
// stdout is not a TTY, prints a JSON summary; `aiken build` compiles validators to
// UPLC and emits a CIP-57 plutus.json blueprint. So a descriptor test maps to one
// of three assertions via its `match`:
//   match "build"      -> `aiken build` succeeded and produced non-empty UPLC
//   match "blueprint"  -> the emitted plutus.json has >= 1 validator
//   match "test:<name>" (or a bare test name) -> that `aiken check` test passed
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Runner, TestCaseResult } from "./types";
import { execShell, partitionByDepth, result, truncate } from "./util";

interface AikenCheck {
  title: string;
  status: string; // "pass" | "fail"
}

function parseAikenJson(stdout: string): AikenCheck[] {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(stdout.slice(start, end + 1));
  } catch {
    return [];
  }
  const out: AikenCheck[] = [];
  for (const m of (json.modules as Record<string, unknown>[]) ?? []) {
    for (const t of (m.tests as Record<string, unknown>[]) ?? []) {
      out.push({ title: String(t.title ?? ""), status: String(t.status ?? "") });
    }
  }
  return out;
}

export const run: Runner = async (desc, ctx) => {
  const { toRun, skipped } = partitionByDepth(desc.tests, ctx);
  const results: TestCaseResult[] = [...skipped];
  if (toRun.length === 0) return results;

  // ── Phase 1: build (compile to UPLC + blueprint) ──
  const build = execShell("aiken build", ctx.toolDir, 180_000);
  const blueprintPath = join(ctx.toolDir, "plutus.json");
  let uplcOk = false;
  let validatorCount = 0;
  let buildDetail = "";
  if (build.code === 0 && existsSync(blueprintPath)) {
    try {
      const bp = JSON.parse(readFileSync(blueprintPath, "utf8"));
      const vals = (bp.validators ?? []) as { compiledCode?: string }[];
      validatorCount = vals.length;
      uplcOk = vals.some((v) => typeof v.compiledCode === "string" && v.compiledCode.length > 0);
    } catch (e) {
      buildDetail = `blueprint parse error: ${truncate(String(e))}`;
    }
  } else {
    buildDetail = build.timedOut ? "aiken build timed out" : truncate(build.stderr || build.stdout);
  }

  // ── Phase 2: check (run test blocks; JSON when non-TTY) ──
  const check = execShell("aiken check", ctx.toolDir, 180_000);
  const checkCases = parseAikenJson(check.stdout);

  for (const t of toRun) {
    const m = t.match ?? t.id;
    if (m === "build") {
      results.push(
        uplcOk
          ? result(t, "pass", `aiken build compiled ${validatorCount} validator(s) to UPLC`)
          : result(t, "fail", buildDetail || "aiken build produced no UPLC"),
      );
    } else if (m === "blueprint") {
      results.push(
        validatorCount > 0
          ? result(t, "pass", `plutus.json blueprint has ${validatorCount} validator(s)`)
          : result(t, "fail", buildDetail || "no validators in plutus.json"),
      );
    } else {
      const title = m.startsWith("test:") ? m.slice(5) : m;
      const found = checkCases.find((c) => c.title === title);
      if (!found) {
        results.push(result(t, "error", `no aiken test titled "${title}" in check output`));
      } else {
        results.push(
          result(
            t,
            found.status === "pass" ? "pass" : "fail",
            `aiken test "${title}": ${found.status}`,
          ),
        );
      }
    }
  }
  return results;
};
