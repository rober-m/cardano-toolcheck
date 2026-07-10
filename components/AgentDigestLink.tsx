"use client";

import { useState } from "react";

// A copy-pasteable pointer to the machine-readable catalogue digest, for handing
// the whole picture (tools + features + verified/health state) to a coding agent
// or wiring into a skill. The digest itself is generated at build time into
// /public (llms.txt + catalog.json).
export function AgentDigestLink() {
  const [copied, setCopied] = useState<null | "link" | "text">(null);

  const urlFor = (path: string) =>
    typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(urlFor("/llms.txt"));
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — the visible link is still selectable */
    }
  }

  async function copyText() {
    try {
      const res = await fetch("/llms.txt");
      await navigator.clipboard.writeText(await res.text());
      setCopied("text");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border border-edge bg-surface-light/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">For coding agents &amp; skills</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            A machine-readable digest of every tool, its features, and verified/health
            state. Copy the link (or the full text) into your agent, or fetch{" "}
            <code className="rounded bg-surface px-1 text-[0.7rem]">/llms.txt</code>.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            {copied === "link" ? "Copied link ✓" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={copyText}
            className="rounded-lg border border-edge px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent/50"
          >
            {copied === "text" ? "Copied text ✓" : "Copy full text"}
          </button>
          <a
            href="/catalog.json"
            className="text-xs text-ink-muted underline decoration-edge underline-offset-2 hover:text-accent"
          >
            catalog.json
          </a>
        </div>
      </div>
    </div>
  );
}
