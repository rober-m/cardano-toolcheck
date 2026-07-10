// Rust ecosystem: runs `cargo test` with libtest JSON output and maps by test name.
import { makeRunner } from "./generic";
export const run = makeRunner("json-lines");
