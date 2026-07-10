// Python ecosystem: runs pytest with pytest-json-report (printed to stdout) and
// maps by nodeid substring.
import { makeRunner } from "./generic";
export const run = makeRunner("pytest-json");
