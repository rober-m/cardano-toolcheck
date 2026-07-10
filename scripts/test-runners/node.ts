// Node ecosystem: runs Vitest with the JSON reporter and maps by test name.
import { makeRunner } from "./generic";
export const run = makeRunner("vitest-json");
