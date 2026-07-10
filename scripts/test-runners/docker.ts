// Docker ecosystem: for tools that ARE a container (e.g. ogmios, kupo). The
// descriptor's `command` is expected to run a `docker`/`docker compose` invocation
// (typically a devnet-depth check) and signal pass/fail via exit code unless it
// emits one of the known result formats. Grades via the generic exit-code path.
import { makeRunner } from "./generic";
export const run = makeRunner("exit-code");
