# Local devnet for `devnet`-depth tests

Some features (submitting a transaction, querying UTxOs after a submit) can only be
verified against a running network. Those tests are tagged `"depth": "devnet"` in a
tool's `tool.test.json` and are **skipped by default** — they run only when both:

- the harness is invoked with `--depth devnet` (or `all`), **and**
- `TEST_DEVNET=1` is set in the environment.

This keeps the cheap offline jobs fast and reliable; a missing devnet never turns a
verified cell red.

## Running locally

```bash
docker compose -f tests/_devnet/compose.yml up -d
./tests/_devnet/wait-ready.sh
TEST_DEVNET=1 npx tsx scripts/test-check.ts --tools mesh --depth devnet
docker compose -f tests/_devnet/compose.yml down
```

The devnet exposes a Blockfrost-compatible API on `:8080` (point SDK providers here
via `YACI_STORE_URL`) and a faucet on `:10000` (`YACI_ADMIN_URL`) used to fund test
addresses.

## In CI

The `test-devnet` job in `.github/workflows/feature-tests.yml` brings this stack up,
waits for readiness, runs the devnet-tagged tests for the changed tools, and uploads
each tool's result. It only runs when a tool with devnet tests actually changed.
