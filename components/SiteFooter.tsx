import Link from "next/link";
import { getHealthLastRun } from "@/lib/data";

export function SiteFooter() {
  const lastRun = new Date(getHealthLastRun());
  return (
    <footer className="border-t border-edge bg-surface-light/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-ink">
            Cardano <span className="text-accent">Toolcheck</span>
          </p>
          <p className="mt-1 max-w-md">
            Maps the Cardano developer tooling ecosystem, tracks the health of
            each tool, and verifies its features with automated tests. All data
            lives in editable JSON — contributions welcome.
          </p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <Link href="/health" className="hover:text-ink">
            Health checks last run:{" "}
            {lastRun.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Link>
          <p>Recommendations are editorial opinions — verify against docs.</p>
        </div>
      </div>
    </footer>
  );
}
