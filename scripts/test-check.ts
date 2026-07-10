// Feature-test orchestrator. Sibling of scripts/health-check.ts.
//
// Discovers tests/<toolId>/tool.test.json descriptors, runs each tool's tests via
// its ecosystem runner, and writes a per-tool result file to
// data/test-results/<toolId>.json. Combining those into the single
// data/test-results.json that the site imports is a separate step
// (scripts/combine-test-results.ts) so parallel CI jobs never clobber each other.
//
// Usage:
//   npx tsx scripts/test-check.ts                     # all tools, offline depth
//   npx tsx scripts/test-check.ts --tools aiken,mesh  # subset (CI passes changed tools)
//   npx tsx scripts/test-check.ts --depth all         # include devnet (needs TEST_DEVNET=1)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Ecosystem,
  RunContext,
  Runner,
  TestCaseResult,
  ToolTestDescriptor,
} from "./test-runners/types";
import { allError, execShell } from "./test-runners/util";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TESTS_DIR = join(ROOT, "tests");
const OUT_DIR = join(ROOT, "data", "test-results");

const RUNNER_MODULE: Record<Ecosystem, string> = {
  aiken: "./test-runners/aiken.ts",
  node: "./test-runners/node.ts",
  pytest: "./test-runners/pytest.ts",
  cargo: "./test-runners/cargo.ts",
  jvm: "./test-runners/jvm.ts",
  docker: "./test-runners/docker.ts",
};

interface Args {
  tools: string[] | null; // null => all discovered
  depth: "offline" | "devnet" | "all";
}

function parseArgs(argv: string[]): Args {
  let tools: string[] | null = null;
  let depth: Args["depth"] = "offline";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tools" && argv[i + 1]) {
      tools = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === "--depth" && argv[i + 1]) {
      const d = argv[++i];
      if (d === "offline" || d === "devnet" || d === "all") depth = d;
      else throw new Error(`invalid --depth "${d}" (expected offline|devnet|all)`);
    }
  }
  return { tools, depth };
}

// Discover tests/<toolId>/tool.test.json descriptors.
function discover(): { toolId: string; dir: string; descriptor: ToolTestDescriptor }[] {
  if (!existsSync(TESTS_DIR)) return [];
  const out: { toolId: string; dir: string; descriptor: ToolTestDescriptor }[] = [];
  for (const entry of readdirSync(TESTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const dir = join(TESTS_DIR, entry.name);
    const descPath = join(dir, "tool.test.json");
    if (!existsSync(descPath)) continue;
    const descriptor = JSON.parse(readFileSync(descPath, "utf8")) as ToolTestDescriptor;
    out.push({ toolId: entry.name, dir, descriptor });
  }
  return out;
}

// Validate a descriptor against the catalog. Returns warnings (non-fatal) so a
// stale tag never blocks a run, but surfaces mistakes loudly.
function validate(
  toolId: string,
  descriptor: ToolTestDescriptor,
  claimedByTool: Set<string>,
  allFeatureIds: Set<string>,
): string[] {
  const warns: string[] = [];
  if (descriptor.toolId !== toolId)
    warns.push(`descriptor.toolId "${descriptor.toolId}" != directory "${toolId}"`);
  if (!claimedByTool.size) warns.push(`tool "${toolId}" not found in data/tools.json`);
  for (const t of descriptor.tests) {
    for (const f of t.features) {
      if (!allFeatureIds.has(f)) warns.push(`test "${t.id}" references unknown feature "${f}"`);
      else if (claimedByTool.size && !claimedByTool.has(f))
        warns.push(`test "${t.id}" verifies "${f}" which tool "${toolId}" does not claim`);
    }
  }
  return warns;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const devnetEnabled = process.env.TEST_DEVNET === "1";

  const tools = JSON.parse(readFileSync(join(ROOT, "data", "tools.json"), "utf8")) as {
    id: string;
    features: string[];
  }[];
  const features = JSON.parse(readFileSync(join(ROOT, "data", "features.json"), "utf8")) as {
    id: string;
  }[];
  const allFeatureIds = new Set(features.map((f) => f.id));
  const claimsByTool = new Map(tools.map((t) => [t.id, new Set(t.features)]));

  let discovered = discover();
  if (args.tools) {
    const want = new Set(args.tools);
    discovered = discovered.filter((d) => want.has(d.toolId));
    const missing = args.tools.filter((t) => !discovered.some((d) => d.toolId === t));
    if (missing.length) console.warn(`⚠ no tests/ dir for: ${missing.join(", ")}`);
  }

  if (!discovered.length) {
    console.log("No matching tool tests to run.");
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  let anyFail = false;

  for (const { toolId, dir, descriptor } of discovered) {
    console.log(`\n▶ ${toolId} (${descriptor.ecosystem}, depth=${args.depth})`);
    for (const w of validate(toolId, descriptor, claimsByTool.get(toolId) ?? new Set(), allFeatureIds))
      console.warn(`  ⚠ ${w}`);

    const ctx: RunContext = { toolDir: dir, depth: args.depth, devnetEnabled };
    let cases: TestCaseResult[];

    // Preflight: if the toolchain isn't available, mark tests "error" (don't crash).
    if (descriptor.runner.install) {
      const pre = execShell(descriptor.runner.install, dir, 120_000);
      if (pre.code !== 0) {
        console.warn(`  ⚠ preflight failed: ${descriptor.runner.install}`);
        cases = allError(descriptor.tests, `preflight failed: ${descriptor.runner.install}`);
        writeResult(toolId, args, cases);
        continue;
      }
    }

    try {
      const mod = (await import(RUNNER_MODULE[descriptor.ecosystem])) as { run: Runner };
      cases = await mod.run(descriptor, ctx);
    } catch (e) {
      console.warn(`  ⚠ runner error: ${String(e)}`);
      cases = allError(descriptor.tests, `runner error: ${String(e)}`);
    }

    for (const c of cases) {
      const icon = { pass: "✓", fail: "✗", skip: "•", error: "!" }[c.status];
      console.log(`  ${icon} ${c.id} [${c.features.join(", ")}] — ${c.detail}`);
      if (c.status === "fail") anyFail = true;
    }
    writeResult(toolId, args, cases);
  }

  // Non-zero exit only on real failures — skip/error (e.g. devnet unavailable)
  // must not red-fail cheap offline PR checks.
  if (anyFail) process.exitCode = 1;
}

function writeResult(toolId: string, args: Args, tests: TestCaseResult[]) {
  const depthsRun =
    args.depth === "all" ? ["offline", "devnet"] : [args.depth];
  const payload = {
    toolId,
    lastRun: new Date().toISOString(),
    depthsRun,
    tests,
  };
  const path = join(OUT_DIR, `${toolId}.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
  console.log(`  → wrote ${path.replace(ROOT + "/", "")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
