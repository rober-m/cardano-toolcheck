// JVM ecosystem: runs Gradle/Maven and parses JUnit XML surfaced on stdout.
import { makeRunner } from "./generic";
export const run = makeRunner("junit-xml");
