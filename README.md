# Cardano Toolcheck

A statically-generated Next.js site with three jobs: **map** the Cardano developer
tooling ecosystem, **check** each tool's maintenance health, and **verify** — with
an automated, multi-language test suite — that a tool's advertised features actually
work. The Feature Matrix is the front door: every tool × capability cell is graded
by real test results.

All content lives in editable JSON under [`/data`](./data). There is no CMS, no
database, and no runtime API calls for content — every page is pre-rendered at
build time. The site is exported as static HTML/CSS/JS (`output: 'export'`) and
can be hosted on any static host (GitHub Pages, Vercel, Netlify, S3, …).

## Features

- **Feature Matrix** (`/`) — the home page: an interactive tools × capabilities grid where
  each cell's dot is graded by automated tests (full = all pass, half = >50% pass,
  empty/red = <50% pass, hollow = claimed but not yet tested).
- **Tool Catalog** (`/tools`) — searchable, filterable list of every catalogued tool.
- **Tool Detail** (`/tools/[id]`) — full description, features, dependencies, compatibility, and health.
- **Health Dashboard** (`/health`) — automated maintenance health for every tool.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

### Build the static site

```bash
npm run build        # outputs to ./out
npx serve out        # preview the static export
```

## Data model

The source of truth is these JSON files in [`/data`](./data):

| File | What it holds |
|------|---------------|
| `tools.json` | Every tool and its `healthCheck` config |
| `categories.json` | The taxonomy (with per-category `llmContext`) |
| `features.json` | Every capability a tool can have, grouped |
| `compatibility.json` | SDK × provider and SDK × language matrices + notes (shown on tool pages) |
| `health-results.json` | Written by the health-check script; **not** hand-edited |
| `test-results.json` + `test-results/<toolId>.json` | Written by the test harness; **not** hand-edited |

Typed accessors live in [`lib/data.ts`](./lib/data.ts); the interfaces are in
[`lib/types.ts`](./lib/types.ts). Matrix cell grading logic lives in
[`lib/cell-status.ts`](./lib/cell-status.ts).

## Health checks

[`scripts/health-check.ts`](./scripts/health-check.ts) queries GitHub, npm, PyPI,
crates.io, and Maven Central for release recency, downloads, and stars, then
writes `data/health-results.json`. It runs weekly via GitHub Actions
([`.github/workflows/health-check.yml`](./.github/workflows/health-check.yml))
and commits the updated results.

```bash
npm run health-check        # run it locally (uses GITHUB_TOKEN if set)
```

> The committed `data/health-results.json` is a representative seed dataset;
> the live values are produced by the scheduled workflow.

## Feature tests

Each tool × feature cell in the matrix is graded by real tests that exercise the
tool in its native language. Tests live under [`tests/<toolId>/`](./tests), each with
a `tool.test.json` descriptor tagging every test with the feature id(s) it verifies
and a `depth` (`offline` — cheap, no network; or `devnet` — runs against a local
Dockerized Cardano devnet). The [`scripts/test-check.ts`](./scripts/test-check.ts)
runner routes each tool to its ecosystem's native test runner (npm/vitest, pytest,
cargo, aiken, …), writes a per-tool `data/test-results/<toolId>.json`, and
[`scripts/combine-test-results.ts`](./scripts/combine-test-results.ts) folds them
into `data/test-results.json` for the site to import.

```bash
npx tsx scripts/test-check.ts --tools aiken      # run one tool's offline tests
npx tsx scripts/combine-test-results.ts          # regenerate data/test-results.json
```

CI ([`.github/workflows/feature-tests.yml`](./.github/workflows/feature-tests.yml))
is split so that only tools whose tests or definitions changed are re-run: a
`detect` job diffs the change set into a dynamic per-tool job matrix, offline and
devnet jobs run in isolation, and an `aggregate` job commits the merged results.

## For coding agents & skills

The whole catalogue — every tool, its features, and each feature's verified/health
state — is exported at build time to two stable, copy-pasteable endpoints so you can
hand it to a coding agent or wire it into a skill:

| Path | Format | Use |
|------|--------|-----|
| `/llms.txt` | Markdown | Paste the link or the full text into an LLM/agent |
| `/catalog.json` | JSON | Programmatic integration |

The home page has a **Copy link / Copy full text** control for `/llms.txt`. Both files
are regenerated from the source JSON on every build (`npm run digest`, also run as the
`prebuild` step) by [`scripts/generate-digest.ts`](./scripts/generate-digest.ts).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add or update a tool.

## Tech

Next.js 16 (App Router, static export) · React 19 · Tailwind CSS v4 · TypeScript.
