// Parsers that turn a native test runner's machine output into a flat list of
// { name, passed } cases. Each ecosystem runner picks the matching parser and then
// maps these native cases back onto the descriptor's declared tests (by `match`/id).
// Node built-ins only.

export interface NativeCase {
  name: string;
  passed: boolean;
  detail?: string;
}

// Vitest (`--reporter=json`) or Jest (`--json`) top-level report.
// Shape: { testResults: [{ assertionResults: [{ fullName|title, status }] }] }
export function parseVitestJson(stdout: string): NativeCase[] {
  const json = extractJsonObject(stdout);
  if (!json) return [];
  const out: NativeCase[] = [];
  const files = (json.testResults as Record<string, unknown>[]) ?? [];
  for (const file of files) {
    const assertions = (file.assertionResults as Record<string, unknown>[]) ?? [];
    for (const a of assertions) {
      const ancestors = a.ancestorTitles as string[] | undefined;
      out.push({
        name:
          (a.fullName as string) ??
          (a.title as string) ??
          ancestors?.join(" ") ??
          "",
        passed: a.status === "passed",
        detail: String(a.status ?? ""),
      });
    }
  }
  return out;
}

// pytest-json-report (`--json-report`) writes a file, but with
// `--json-report-file=-` it prints to stdout: { tests: [{ nodeid, outcome }] }.
export function parsePytestJson(stdout: string): NativeCase[] {
  const json = extractJsonObject(stdout);
  if (!json) return [];
  const tests = (json.tests as Record<string, unknown>[]) ?? [];
  return tests.map((t) => ({
    name: String(t.nodeid ?? ""),
    passed: t.outcome === "passed",
    detail: String(t.outcome ?? ""),
  }));
}

// Rust libtest JSON (`cargo test -- -Z unstable-options --format json`) or, more
// portably, the stable `cargo test --message-format json` compiler stream mixed
// with libtest lines. We scan JSON lines for `{ "type":"test", "event": ... }`.
export function parseCargoJsonLines(stdout: string): NativeCase[] {
  const out: NativeCase[] = [];
  for (const line of stdout.split("\n")) {
    const s = line.trim();
    if (!s.startsWith("{")) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(s);
    } catch {
      continue;
    }
    if (obj.type === "test" && (obj.event === "ok" || obj.event === "failed")) {
      out.push({ name: String(obj.name ?? ""), passed: obj.event === "ok", detail: String(obj.event) });
    }
  }
  return out;
}

// TAP: `ok 1 - name` / `not ok 2 - name`.
export function parseTap(stdout: string): NativeCase[] {
  const out: NativeCase[] = [];
  for (const line of stdout.split("\n")) {
    const m = /^(ok|not ok)\s+\d+\s*-?\s*(.*)$/.exec(line.trim());
    if (m) out.push({ name: m[2].trim(), passed: m[1] === "ok" });
  }
  return out;
}

// Minimal JUnit XML: pull each <testcase name="..."> and treat presence of a
// child <failure>/<error> as a fail. Good enough for gradle/most JVM reporters.
export function parseJUnitXml(xml: string): NativeCase[] {
  const out: NativeCase[] = [];
  const caseRe = /<testcase\b[^>]*\bname="([^"]*)"[^>]*(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m: RegExpExecArray | null;
  while ((m = caseRe.exec(xml)) !== null) {
    const body = m[3] ?? "";
    const failed = /<(failure|error)\b/.test(body);
    out.push({ name: m[1], passed: !failed });
  }
  return out;
}

export function parseByFormat(format: string | undefined, stdout: string): NativeCase[] {
  switch (format) {
    case "vitest-json":
      return parseVitestJson(stdout);
    case "json-lines":
      return parseCargoJsonLines(stdout);
    case "pytest-json":
      return parsePytestJson(stdout);
    case "junit-xml":
      return parseJUnitXml(stdout);
    case "tap":
      return parseTap(stdout);
    default:
      // "exit-code" and unknown formats produce no per-case data; the runner
      // falls back to the process exit status.
      return [];
  }
}

// Reporters often print human text before the JSON blob. Grab the outermost {...}.
function extractJsonObject(s: string): Record<string, unknown> | null {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
