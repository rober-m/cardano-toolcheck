import Link from "next/link";
import type { CompatCell } from "@/lib/types";
import { compatibility, getToolById } from "@/lib/data";

export function compatLabel(id: string): string {
  return getToolById(id)?.name ?? id;
}

// A single matrix cell: true → ✓, false → ✗, string (e.g. "beta") → label.
export function CompatCellView({ value }: { value: CompatCell | undefined }) {
  if (value === true)
    return <span className="font-semibold text-health-healthy">✓</span>;
  if (value === false || value === undefined)
    return <span className="text-ink-muted/50">✗</span>;
  return (
    <span className="rounded bg-health-warning/15 px-1.5 py-0.5 text-[11px] font-medium uppercase text-health-warning">
      {value}
    </span>
  );
}

function Chips({
  row,
}: {
  row: Record<string, CompatCell>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(row).map(([id, value]) => {
        const supported = value !== false;
        const tool = getToolById(id);
        const content = (
          <>
            <CompatCellView value={value} />
            <span>{compatLabel(id)}</span>
          </>
        );
        const cls = `inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
          supported
            ? "border-edge bg-surface text-ink"
            : "border-edge/50 bg-surface/40 text-ink-muted/60"
        }`;
        return tool ? (
          <Link key={id} href={`/tools/${tool.id}`} className={`${cls} hover:border-accent/40`}>
            {content}
          </Link>
        ) : (
          <span key={id} className={cls}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

// Shows the compatibility a single SDK has with providers and on-chain
// languages, pulled from the compatibility matrices.
export function CompatibilityRow({ sdkId }: { sdkId: string }) {
  const providers = compatibility.sdkProviderMatrix[sdkId];
  const languages = compatibility.sdkLanguageMatrix[sdkId];

  if (!providers && !languages) {
    return (
      <p className="text-sm text-ink-muted">
        No explicit compatibility matrix entry. See the tool&apos;s own
        documentation for supported providers.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {providers && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Providers</p>
          <Chips row={providers} />
        </div>
      )}
      {languages && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">
            On-chain languages it can load
          </p>
          <Chips row={languages} />
        </div>
      )}
    </div>
  );
}
