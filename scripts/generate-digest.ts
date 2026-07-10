// Generates copy-pasteable, LLM-friendly exports of the whole catalogue so people
// can hand the full picture (tools, features, verified/health state) to a coding
// agent or wire it into a skill. Writes:
//   public/llms.txt      — a comprehensive Markdown digest (the "copy this link" target)
//   public/catalog.json  — the same data, structured for programmatic use
//
// Runs as the npm `prebuild` step (and `npm run digest`), so both files are
// regenerated from the source JSON on every build. Node-only (tsx).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getClaimedCellStatus } from "../lib/cell-status";
import type { CellStatus, TestData } from "../lib/types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const PUBLIC = join(ROOT, "public");

const read = (f: string) => JSON.parse(readFileSync(join(DATA, f), "utf8"));

interface Tool {
  id: string;
  name: string;
  tagline: string;
  website: string;
  repo: string | null;
  category: string;
  subcategory?: string | null;
  languages: string[];
  maturity: string;
  features: string[];
  llmDescription: string;
  whenToUse: string;
  dependsOn: string[];
  usedBy: string[];
  providers: string[] | null;
}
interface Category { id: string; name: string; description: string; order: number }
interface Feature { id: string; label: string; group: string }

const STATE_LABEL: Record<CellStatus, string> = {
  full: "verified",
  half: "partial",
  empty: "failing",
  untested: "untested",
};

function main() {
  const tools = read("tools.json") as Tool[];
  const categories = (read("categories.json") as Category[]).sort((a, b) => a.order - b.order);
  const features = read("features.json") as Feature[];
  const health = read("health-results.json") as {
    lastRun: string;
    results: Record<string, { status: string; lastRelease: string | null; latestVersion: string | null; githubStars: number | null; upstreamCi?: string }>;
  };
  const tests = read("test-results.json") as TestData;

  const featureById = new Map(features.map((f) => [f.id, f]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const generated = new Date().toISOString().slice(0, 10);

  // Count verified cells for the summary.
  let verified = 0;
  for (const t of tools)
    for (const fid of t.features)
      if (getClaimedCellStatus(tests, t.id, fid, true)?.status === "full") verified++;

  // ── Markdown digest (public/llms.txt) ──
  const L: string[] = [];
  L.push("# Cardano Toolcheck — Tooling Catalogue");
  L.push("");
  L.push(
    `> A map of Cardano developer tools with their features, maintenance health, and which features are automatically **verified to work** by tests. Generated ${generated}; paste this into a coding agent or a skill.`,
  );
  L.push(">");
  L.push(
    "> Feature state: **verified** (all tests pass) · **partial** (>50% pass) · **failing** (<50% pass) · **untested** (claimed but no tests yet). Health reflects release recency + registry presence; upstream-CI is the project's own CI.",
  );
  L.push("");
  L.push(
    `**${tools.length}** tools · **${categories.length}** categories · **${features.length}** features · **${verified}** verified feature-cells · tests last run ${tests.lastRun.slice(0, 10)}.`,
  );
  L.push("");

  L.push("## Categories");
  L.push("");
  for (const c of categories) L.push(`- **${c.name}** (\`${c.id}\`): ${c.description}`);
  L.push("");

  L.push("## Tools");
  L.push("");
  for (const c of categories) {
    const inCat = tools.filter((t) => t.category === c.id);
    if (!inCat.length) continue;
    L.push(`### ${c.name}`);
    L.push("");
    for (const t of inCat) {
      const h = health.results[t.id];
      L.push(`#### ${t.name} — \`${t.id}\` · ${t.maturity}`);
      L.push(`${t.tagline}`);
      L.push("");
      const links = [t.website && `Website: ${t.website}`, t.repo && `Repo: ${t.repo}`]
        .filter(Boolean)
        .join(" · ");
      if (links) L.push(`- ${links}`);
      if (t.languages.length) L.push(`- Languages: ${t.languages.join(", ")}`);
      if (h) {
        const bits = [
          h.status,
          h.latestVersion && `latest ${h.latestVersion}`,
          h.lastRelease && `released ${h.lastRelease}`,
          h.githubStars != null && `${h.githubStars}★`,
          h.upstreamCi && `upstream CI: ${h.upstreamCi}`,
        ].filter(Boolean);
        L.push(`- Health: ${bits.join(" · ")}`);
      }
      if (t.features.length) {
        L.push(`- Features:`);
        for (const fid of t.features) {
          const grade = getClaimedCellStatus(tests, t.id, fid, true);
          const state = grade ? STATE_LABEL[grade.status] : "untested";
          const label = featureById.get(fid)?.label ?? fid;
          L.push(`  - ${label} \`${fid}\` — **${state}**`);
        }
      }
      if (t.dependsOn.length) L.push(`- Depends on: ${t.dependsOn.join(", ")}`);
      if (t.usedBy.length) L.push(`- Used by: ${t.usedBy.join(", ")}`);
      if (t.providers?.length) L.push(`- Providers: ${t.providers.join(", ")}`);
      L.push("");
      L.push(t.llmDescription);
      L.push("");
    }
  }
  L.push("---");
  L.push("");
  L.push("Data is editable JSON at https://github.com/cardano-community/cardano-toolcheck. Health and test results are produced by scheduled CI.");
  L.push("");
  writeFileSync(join(PUBLIC, "llms.txt"), L.join("\n"));

  // ── Structured JSON (public/catalog.json) ──
  const catalog = {
    generated,
    testsLastRun: tests.lastRun,
    legend: {
      featureState: ["verified", "partial", "failing", "untested"],
    },
    counts: {
      tools: tools.length,
      categories: categories.length,
      features: features.length,
      verifiedCells: verified,
    },
    categories: categories.map((c) => ({ id: c.id, name: c.name, description: c.description })),
    features: features.map((f) => ({ id: f.id, label: f.label, group: f.group })),
    tools: tools.map((t) => {
      const h = health.results[t.id];
      return {
        id: t.id,
        name: t.name,
        category: t.category,
        categoryName: catById.get(t.category)?.name ?? t.category,
        maturity: t.maturity,
        tagline: t.tagline,
        website: t.website,
        repo: t.repo,
        languages: t.languages,
        description: t.llmDescription,
        health: h
          ? { status: h.status, latestVersion: h.latestVersion, lastRelease: h.lastRelease, githubStars: h.githubStars, upstreamCi: h.upstreamCi ?? "unknown" }
          : null,
        features: t.features.map((fid) => ({
          id: fid,
          label: featureById.get(fid)?.label ?? fid,
          state: (getClaimedCellStatus(tests, t.id, fid, true)?.status ?? "untested") as CellStatus,
        })),
        dependsOn: t.dependsOn,
        usedBy: t.usedBy,
      };
    }),
  };
  writeFileSync(join(PUBLIC, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");

  console.log(
    `Wrote public/llms.txt (${L.join("\n").length} bytes) and public/catalog.json (${tools.length} tools, ${verified} verified cells).`,
  );
}

main();
