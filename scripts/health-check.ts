/**
 * Automated tool health checks (spec section 3).
 *
 * Reads data/tools.json, runs the configured checks against public registries,
 * and writes data/health-results.json. Intended to run in CI on a schedule.
 *
 *   npx tsx scripts/health-check.ts
 *
 * Set GITHUB_TOKEN in the environment to raise the GitHub API rate limit.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type CheckType = string;

interface HealthCheckConfig {
  type: CheckType;
  repo: string | null;
  additionalChecks: string[];
}

interface Tool {
  id: string;
  name: string;
  website: string;
  languages: string[];
  maturity: string;
  healthCheck: HealthCheckConfig;
}

interface CheckResult {
  name: string;
  passed: boolean;
  // "warning" lets a check signal a degraded-but-not-broken state.
  level?: "ok" | "warning" | "failing";
  detail: string;
}

type UpstreamCi = "passing" | "failing" | "unknown";

interface ToolHealth {
  status: "healthy" | "warning" | "failing" | "unknown";
  lastRelease: string | null;
  latestVersion: string | null;
  daysSinceRelease: number | null;
  npmDownloadsWeekly: number | null;
  githubStars: number | null;
  openIssues: number | null;
  // Conclusion of the project's OWN latest CI run on its default branch. This is a
  // maintenance signal (their suite passes) — NOT a verification of any feature,
  // which is what the feature-test matrix is for.
  upstreamCi: UpstreamCi;
  checks: { name: string; passed: boolean; detail: string }[];
}

const ROOT = join(import.meta.dirname ?? process.cwd(), "..");
const DATA = join(ROOT, "data");

const WARN_DAYS = 183; // ~6 months
const FAIL_DAYS = 365; // 12 months

const ghHeaders: Record<string, string> = {
  accept: "application/vnd.github+json",
  "user-agent": "cardano-toolcheck-healthcheck",
};
if (process.env.GITHUB_TOKEN) {
  ghHeaders.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

function daysSince(dateIso: string): number {
  return Math.floor((Date.now() - new Date(dateIso).getTime()) / 86_400_000);
}

async function safeJson(url: string, headers?: Record<string, string>) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return { ok: false as const, status: res.status };
    return { ok: true as const, status: res.status, data: await res.json() };
  } catch {
    return { ok: false as const, status: 0 };
  }
}

interface Accumulator {
  lastRelease: string | null;
  latestVersion: string | null;
  daysSinceRelease: number | null;
  npmDownloadsWeekly: number | null;
  githubStars: number | null;
  openIssues: number | null;
  upstreamCi: UpstreamCi;
}

async function checkGithubRelease(
  repo: string,
  acc: Accumulator,
): Promise<CheckResult> {
  const name = "github-release";
  // Repo metadata (stars, issues, archived).
  const meta = await safeJson(`https://api.github.com/repos/${repo}`, ghHeaders);
  if (meta.ok) {
    acc.githubStars = meta.data.stargazers_count ?? null;
    acc.openIssues = meta.data.open_issues_count ?? null;
    if (meta.data.archived) {
      return { name, passed: false, level: "failing", detail: "repo archived" };
    }
  }

  const rel = await safeJson(
    `https://api.github.com/repos/${repo}/releases/latest`,
    ghHeaders,
  );
  if (!rel.ok) {
    // Fall back to tags if there are no formal releases.
    const tags = await safeJson(
      `https://api.github.com/repos/${repo}/tags`,
      ghHeaders,
    );
    if (tags.ok && Array.isArray(tags.data) && tags.data.length) {
      acc.latestVersion = tags.data[0].name;
      return { name, passed: true, level: "ok", detail: `latest tag ${tags.data[0].name}` };
    }
    return { name, passed: false, level: "warning", detail: "no releases found" };
  }

  const published = rel.data.published_at as string;
  const tag = (rel.data.tag_name as string) ?? "";
  acc.lastRelease = published ? published.slice(0, 10) : null;
  acc.latestVersion = tag.replace(/^v/, "") || acc.latestVersion;
  const d = published ? daysSince(published) : null;
  acc.daysSinceRelease = d;

  if (d === null) return { name, passed: false, level: "warning", detail: "unknown release date" };
  if (d > FAIL_DAYS)
    return { name, passed: false, level: "failing", detail: `${tag} released ${d} days ago` };
  if (d > WARN_DAYS)
    return { name, passed: false, level: "warning", detail: `${tag} released ${d} days ago` };
  return { name, passed: true, level: "ok", detail: `${tag} released ${d} days ago` };
}

async function checkNpm(pkg: string, acc: Accumulator): Promise<CheckResult> {
  const name = `npm-package:${pkg}`;
  const reg = await safeJson(`https://registry.npmjs.org/${pkg}`);
  if (!reg.ok) return { name, passed: false, level: "warning", detail: "not found on npm" };
  const latest = reg.data["dist-tags"]?.latest as string | undefined;
  const modified = reg.data.time?.modified as string | undefined;
  acc.latestVersion ??= latest ?? null;

  const dl = await safeJson(
    `https://api.npmjs.org/downloads/point/last-week/${pkg}`,
  );
  if (dl.ok && typeof dl.data.downloads === "number") {
    acc.npmDownloadsWeekly = dl.data.downloads;
  }

  const stale = modified ? daysSince(modified) > FAIL_DAYS : false;
  const detail = `${latest ?? "?"}${
    acc.npmDownloadsWeekly != null
      ? `, ${acc.npmDownloadsWeekly} weekly downloads`
      : ""
  }`;
  return { name, passed: !stale, level: stale ? "warning" : "ok", detail };
}

async function checkPypi(pkg: string, acc: Accumulator): Promise<CheckResult> {
  const name = `pypi-package:${pkg}`;
  const reg = await safeJson(`https://pypi.org/pypi/${pkg}/json`);
  if (!reg.ok) return { name, passed: false, level: "warning", detail: "not found on PyPI" };
  const version = reg.data.info?.version as string | undefined;
  acc.latestVersion ??= version ?? null;
  return { name, passed: true, level: "ok", detail: `${version ?? "?"} on PyPI` };
}

async function checkCrates(pkg: string, acc: Accumulator): Promise<CheckResult> {
  const name = `crates-io:${pkg}`;
  const reg = await safeJson(`https://crates.io/api/v1/crates/${pkg}`, {
    "user-agent": "cardano-toolcheck-healthcheck",
  });
  if (!reg.ok) return { name, passed: false, level: "warning", detail: "not found on crates.io" };
  const version = reg.data.crate?.max_stable_version as string | undefined;
  acc.latestVersion ??= version ?? null;
  return { name, passed: true, level: "ok", detail: `${version ?? "?"} on crates.io` };
}

async function checkMaven(coord: string): Promise<CheckResult> {
  // coord is group:artifact
  const name = `maven-central:${coord}`;
  const [group, artifact] = coord.split(":");
  const q = `g:${group}+AND+a:${artifact}`;
  const reg = await safeJson(
    `https://search.maven.org/solrsearch/select?q=${q}&rows=1&wt=json`,
  );
  if (!reg.ok) return { name, passed: false, level: "warning", detail: "not found on Maven Central" };
  const doc = reg.data.response?.docs?.[0];
  return doc
    ? { name, passed: true, level: "ok", detail: `${doc.latestVersion} on Maven Central` }
    : { name, passed: false, level: "warning", detail: "no Maven artifact" };
}

// Harvest the repo's own latest CI conclusion on its default branch. We read the
// GitHub Actions "check-runs" for the branch HEAD, falling back to the legacy
// combined commit-status API. This is cheap (1–2 API calls) and runs for any tool
// with a GitHub repo, regardless of its configured health-check type.
async function checkGithubCi(repo: string, acc: Accumulator): Promise<CheckResult> {
  const name = "upstream-ci";
  const meta = await safeJson(`https://api.github.com/repos/${repo}`, ghHeaders);
  const branch = (meta.ok && (meta.data.default_branch as string)) || "main";

  const runs = await safeJson(
    `https://api.github.com/repos/${repo}/commits/${branch}/check-runs`,
    ghHeaders,
  );
  if (runs.ok && Array.isArray(runs.data.check_runs) && runs.data.check_runs.length) {
    const completed = runs.data.check_runs.filter(
      (r: { status: string }) => r.status === "completed",
    );
    const bad = completed.filter((r: { conclusion: string }) =>
      ["failure", "timed_out", "cancelled", "action_required"].includes(r.conclusion),
    );
    const good = completed.filter((r: { conclusion: string }) =>
      ["success", "neutral", "skipped"].includes(r.conclusion),
    );
    if (bad.length) {
      acc.upstreamCi = "failing";
      return { name, passed: false, level: "warning", detail: `${bad.length} CI check(s) failing on ${branch}` };
    }
    if (good.length) {
      acc.upstreamCi = "passing";
      return { name, passed: true, level: "ok", detail: `${good.length} CI check(s) green on ${branch}` };
    }
  }

  // Fall back to the classic combined commit status.
  const status = await safeJson(
    `https://api.github.com/repos/${repo}/commits/${branch}/status`,
    ghHeaders,
  );
  if (status.ok && typeof status.data.state === "string" && status.data.state !== "pending") {
    const passing = status.data.state === "success";
    acc.upstreamCi = passing ? "passing" : "failing";
    return { name, passed: passing, level: passing ? "ok" : "warning", detail: `commit status: ${status.data.state}` };
  }

  acc.upstreamCi = "unknown";
  return { name, passed: true, level: "ok", detail: "no CI status available" };
}

async function checkDocsReachable(url: string): Promise<CheckResult> {
  const name = "docs-reachable";
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return {
      name,
      passed: res.ok,
      level: res.ok ? "ok" : "warning",
      detail: `${new URL(url).host} returned ${res.status}`,
    };
  } catch {
    return { name, passed: false, level: "warning", detail: "unreachable" };
  }
}

async function runCheck(
  spec: string,
  tool: Tool,
  acc: Accumulator,
): Promise<CheckResult> {
  if (spec === "github-release" && tool.healthCheck.repo)
    return checkGithubRelease(tool.healthCheck.repo, acc);
  if (spec === "docs-reachable") return checkDocsReachable(tool.website);
  if (spec.startsWith("npm-package:"))
    return checkNpm(spec.slice("npm-package:".length), acc);
  if (spec.startsWith("pypi-package:"))
    return checkPypi(spec.slice("pypi-package:".length), acc);
  if (spec.startsWith("crates-io:"))
    return checkCrates(spec.slice("crates-io:".length), acc);
  if (spec.startsWith("maven-central:"))
    return checkMaven(spec.slice("maven-central:".length));
  return { name: spec, passed: true, level: "ok", detail: "no checker for this type" };
}

function deriveStatus(checks: CheckResult[]): ToolHealth["status"] {
  if (!checks.length) return "unknown";
  if (checks.some((c) => c.level === "failing")) return "failing";
  if (checks.some((c) => c.level === "warning" || (!c.passed && !c.level)))
    return "warning";
  if (checks.every((c) => c.passed)) return "healthy";
  return "unknown";
}

async function main() {
  const tools: Tool[] = JSON.parse(
    readFileSync(join(DATA, "tools.json"), "utf8"),
  );

  const results: Record<string, ToolHealth> = {};

  for (const tool of tools) {
    const acc: Accumulator = {
      lastRelease: null,
      latestVersion: null,
      daysSinceRelease: null,
      npmDownloadsWeekly: null,
      githubStars: null,
      openIssues: null,
      upstreamCi: "unknown",
    };

    const specs = [
      tool.healthCheck.type,
      ...(tool.healthCheck.additionalChecks ?? []),
    ];

    const checks: CheckResult[] = [];
    for (const spec of specs) {
      checks.push(await runCheck(spec, tool, acc));
    }

    // Harvest the project's own CI status for any tool with a GitHub repo. This is
    // informational: we set level "ok" so a flaky upstream run never flips our
    // derived health status — the true conclusion lives in the `upstreamCi` field.
    if (tool.healthCheck.repo) {
      const ci = await checkGithubCi(tool.healthCheck.repo, acc);
      checks.push({ ...ci, level: "ok" });
    }

    results[tool.id] = {
      status: deriveStatus(checks),
      lastRelease: acc.lastRelease,
      latestVersion: acc.latestVersion,
      daysSinceRelease: acc.daysSinceRelease,
      npmDownloadsWeekly: acc.npmDownloadsWeekly,
      githubStars: acc.githubStars,
      openIssues: acc.openIssues,
      upstreamCi: acc.upstreamCi,
      checks: checks.map(({ name, passed, detail }) => ({
        name,
        passed,
        detail,
      })),
    };
    process.stdout.write(`✓ ${tool.id}: ${results[tool.id].status}\n`);
  }

  const out = { lastRun: new Date().toISOString(), results };
  writeFileSync(
    join(DATA, "health-results.json"),
    JSON.stringify(out, null, 2) + "\n",
  );
  process.stdout.write(`\nWrote health for ${tools.length} tools.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
