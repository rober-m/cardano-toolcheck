// Computes which tools' feature tests need to run, and emits two GitHub Actions
// job matrices to $GITHUB_OUTPUT:
//   offline_tools = [{ tool, ecosystem }]  — tools with an offline test that changed
//   devnet_tools  = [{ tool, ecosystem }]  — tools with a devnet test that changed
//
// Change rules:
//   • schedule / workflow_dispatch (no explicit tools) → ALL tools with a tests/ dir
//   • a change to the harness itself (scripts/test-*) → ALL tools
//   • tests/<tool>/**                                 → that tool
//   • data/tools.json                                 → tools whose entry changed
// Anything else → no tools (downstream jobs skip, so unrelated PRs cost nothing).
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TESTS_DIR = join(ROOT, "tests");

interface Descriptor {
  ecosystem: string;
  tests: { depth: "offline" | "devnet" }[];
}

function allToolDirs(): string[] {
  if (!existsSync(TESTS_DIR)) return [];
  return readdirSync(TESTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
    .filter((e) => existsSync(join(TESTS_DIR, e.name, "tool.test.json")))
    .map((e) => e.name);
}

function loadDescriptor(tool: string): Descriptor | null {
  try {
    return JSON.parse(readFileSync(join(TESTS_DIR, tool, "tool.test.json"), "utf8")) as Descriptor;
  } catch {
    return null;
  }
}

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8" });
  } catch {
    return "";
  }
}

const HARNESS_RE = /^scripts\/(test-check|test-parsers|combine-test-results|detect-changed-tools)\.ts$|^scripts\/test-runners\//;

function toolsFromToolsJsonDiff(base: string): string[] {
  // Compare each tool object between base and HEAD; any that differ (and have a
  // tests/ dir) are considered changed.
  const dirs = new Set(allToolDirs());
  try {
    const baseJson = JSON.parse(git(`show ${base}:data/tools.json`) || "[]") as { id: string }[];
    const headJson = JSON.parse(readFileSync(join(ROOT, "data", "tools.json"), "utf8")) as {
      id: string;
    }[];
    const baseById = new Map(baseJson.map((t) => [t.id, JSON.stringify(t)]));
    const changed: string[] = [];
    for (const t of headJson) {
      if (dirs.has(t.id) && baseById.get(t.id) !== JSON.stringify(t)) changed.push(t.id);
    }
    return changed;
  } catch {
    return [...dirs]; // conservative: if we can't diff, run everything with tests
  }
}

function computeChanged(): string[] {
  const event = process.env.EVENT_NAME ?? "";
  const dispatchTools = (process.env.DISPATCH_TOOLS ?? "").trim();
  const all = allToolDirs();

  if (event === "schedule") return all;
  if (event === "workflow_dispatch") {
    if (!dispatchTools || dispatchTools === "all") return all;
    const want = new Set(dispatchTools.split(",").map((s) => s.trim()));
    return all.filter((t) => want.has(t));
  }

  const base = (process.env.BASE_SHA ?? "").trim();
  if (!base || /^0+$/.test(base)) return all; // no usable base → run all

  const files = git(`diff --name-only ${base} HEAD`).split("\n").map((s) => s.trim()).filter(Boolean);
  if (files.some((f) => HARNESS_RE.test(f))) return all; // harness changed → run all

  const changed = new Set<string>();
  for (const f of files) {
    const m = /^tests\/([^/]+)\//.exec(f);
    if (m && all.includes(m[1])) changed.add(m[1]);
  }
  if (files.includes("data/tools.json")) {
    for (const t of toolsFromToolsJsonDiff(base)) changed.add(t);
  }
  return [...changed];
}

function main() {
  const changed = computeChanged();
  const offline: { tool: string; ecosystem: string }[] = [];
  const devnet: { tool: string; ecosystem: string }[] = [];

  for (const tool of changed) {
    const d = loadDescriptor(tool);
    if (!d) continue;
    if (d.tests.some((t) => t.depth === "offline")) offline.push({ tool, ecosystem: d.ecosystem });
    if (d.tests.some((t) => t.depth === "devnet")) devnet.push({ tool, ecosystem: d.ecosystem });
  }

  const offlineJson = JSON.stringify(offline);
  const devnetJson = JSON.stringify(devnet);
  console.log(`offline_tools=${offlineJson}`);
  console.log(`devnet_tools=${devnetJson}`);

  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    appendFileSync(out, `offline_tools=${offlineJson}\n`);
    appendFileSync(out, `devnet_tools=${devnetJson}\n`);
  }
}

main();
