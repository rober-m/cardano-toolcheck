import Link from "next/link";
import type { Tool } from "@/lib/types";
import { getToolById } from "@/lib/data";

// Renders one id either as a link (when a full tool entry exists) or as a
// plain chip (for referenced-but-uncatalogued ids like "db-sync").
function ToolChip({ id, accent }: { id: string; accent?: boolean }) {
  const tool = getToolById(id);
  const base =
    "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium";
  if (!tool) {
    return (
      <span
        className={`${base} border-edge bg-surface text-ink-muted`}
        title="Referenced dependency (no detail page)"
      >
        {id}
      </span>
    );
  }
  return (
    <Link
      href={`/tools/${tool.id}`}
      className={`${base} ${
        accent
          ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
          : "border-edge bg-surface text-ink hover:border-accent/40 hover:text-accent"
      }`}
    >
      {tool.name}
    </Link>
  );
}

function Row({
  label,
  ids,
  hint,
}: {
  label: string;
  ids: string[];
  hint: string;
}) {
  if (!ids.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs text-ink-muted">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <ToolChip key={id} id={id} />
        ))}
      </div>
    </div>
  );
}

export function DependencyTree({ tool }: { tool: Tool }) {
  const hasAny =
    tool.dependsOn.length || tool.optionalDeps.length || tool.usedBy.length;

  if (!hasAny) {
    return (
      <p className="text-sm text-ink-muted">
        Standalone — no hard dependencies on or from other catalogued tools.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Row
        label="Depends on"
        hint="required to build or run"
        ids={tool.dependsOn}
      />
      <Row
        label="Optional / pluggable"
        hint="enhances but not required"
        ids={tool.optionalDeps}
      />
      <div className="flex items-center gap-2 text-ink-muted">
        <span className="h-px flex-1 bg-edge" />
        <span className="text-xs">{tool.name}</span>
        <span className="h-px flex-1 bg-edge" />
      </div>
      <Row
        label="Used by"
        hint="tools that consume its output"
        ids={tool.usedBy}
      />
    </div>
  );
}
