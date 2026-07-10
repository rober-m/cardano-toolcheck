// Folds the per-tool data/test-results/<toolId>.json files into the single
// data/test-results.json that the site imports. Run after test-check.ts (locally
// or in the CI aggregate job). Reading ALL per-tool files means tools that weren't
// re-run this cycle keep their previously-committed results — the basis of the
// incremental CI model.
//
// Optionally merges freshly-downloaded CI artifacts first: with `--from <dir>`, any
// <toolId>.json (or offline/devnet split files) found under <dir> are copied into
// data/test-results/ before combining, and offline+devnet results for the same tool
// are merged by test id.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS_DIR = join(ROOT, "data", "test-results");
const OUT = join(ROOT, "data", "test-results.json");

interface TestCaseResult {
  id: string;
  features: string[];
  depth: string;
  status: string;
  durationMs?: number;
  detail: string;
}
interface ToolFile {
  toolId: string;
  lastRun: string;
  depthsRun: string[];
  tests: TestCaseResult[];
}

// Merge two per-tool result sets (e.g. an offline job's file and a devnet job's
// file for the same tool) by test id — later entries with a non-skip status win.
function mergeToolFiles(a: ToolFile, b: ToolFile): ToolFile {
  const byId = new Map<string, TestCaseResult>();
  for (const t of a.tests) byId.set(t.id, t);
  for (const t of b.tests) {
    const prev = byId.get(t.id);
    // Prefer a real result over a skip/error placeholder.
    if (!prev || (prev.status === "skip" && t.status !== "skip") || (prev.status === "error" && (t.status === "pass" || t.status === "fail"))) {
      byId.set(t.id, t);
    }
  }
  return {
    toolId: a.toolId,
    lastRun: a.lastRun > b.lastRun ? a.lastRun : b.lastRun,
    depthsRun: Array.from(new Set([...a.depthsRun, ...b.depthsRun])),
    tests: Array.from(byId.values()),
  };
}

function readToolFile(path: string): ToolFile | null {
  try {
    const f = JSON.parse(readFileSync(path, "utf8")) as ToolFile;
    if (!f.toolId || !Array.isArray(f.tests)) return null;
    return f;
  } catch {
    return null;
  }
}

function ingestArtifacts(fromDir: string) {
  if (!existsSync(fromDir)) {
    console.warn(`⚠ --from dir not found: ${fromDir}`);
    return;
  }
  mkdirSync(RESULTS_DIR, { recursive: true });
  // download-artifact lays each artifact out as <name>/<toolId>.json; walk one level.
  const jsonFiles: string[] = [];
  const walk = (dir: string, depth: number) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory() && depth > 0) walk(p, depth - 1);
      else if (e.isFile() && e.name.endsWith(".json")) jsonFiles.push(p);
    }
  };
  walk(fromDir, 3);

  for (const p of jsonFiles) {
    const incoming = readToolFile(p);
    if (!incoming) continue;
    const dest = join(RESULTS_DIR, `${incoming.toolId}.json`);
    const existing = existsSync(dest) ? readToolFile(dest) : null;
    const merged = existing ? mergeToolFiles(existing, incoming) : incoming;
    writeFileSync(dest, JSON.stringify(merged, null, 2) + "\n");
    console.log(`  merged artifact → ${incoming.toolId}.json`);
  }
}

function main() {
  const fromIdx = process.argv.indexOf("--from");
  if (fromIdx >= 0 && process.argv[fromIdx + 1]) ingestArtifacts(process.argv[fromIdx + 1]);

  const results: Record<string, Omit<ToolFile, "toolId">> = {};
  let lastRun = "1970-01-01T00:00:00.000Z";

  if (existsSync(RESULTS_DIR)) {
    for (const name of readdirSync(RESULTS_DIR)) {
      if (!name.endsWith(".json")) continue;
      const f = readToolFile(join(RESULTS_DIR, name));
      if (!f) continue;
      const { toolId, ...rest } = f;
      results[toolId] = rest;
      if (f.lastRun > lastRun) lastRun = f.lastRun;
    }
  }

  const payload = { lastRun, results };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${OUT.replace(ROOT + "/", "")} — ${Object.keys(results).length} tool(s).`);
}

main();
