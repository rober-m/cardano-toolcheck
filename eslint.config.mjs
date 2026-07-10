import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Language-specific test fixtures (Python/Rust/Aiken + per-project package.json)
    // are not part of the Next/TS app and must not be linted or type-checked.
    "tests/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
