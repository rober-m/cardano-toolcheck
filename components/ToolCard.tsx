import Link from "next/link";
import type { Tool } from "@/lib/types";
import { getCategoryById, getHealthForTool } from "@/lib/data";
import { MaturityBadge, CategoryBadge } from "./badges";
import { LanguageLogoList } from "./LanguageLogo";
import { HealthIndicator } from "./HealthIndicator";

export function ToolCard({
  tool,
  reason,
}: {
  tool: Tool;
  reason?: string;
}) {
  const category = getCategoryById(tool.category);
  const healthResult = getHealthForTool(tool.id);

  return (
    <Link
      href={`/tools/${tool.id}`}
      className="group flex h-full flex-col rounded-xl border border-edge bg-surface-light p-4 transition-colors hover:border-accent/50 hover:bg-surface-lighter"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-ink group-hover:text-accent">
          {tool.name}
        </h3>
        <div className="flex items-center gap-2">
          {tool.isRecommendedDefault && (
            <span
              className="text-accent"
              title="Our recommended default in its category"
            >
              ★
            </span>
          )}
          {healthResult && (
            <HealthIndicator
              status={healthResult.status}
              detail={
                healthResult.latestVersion
                  ? `v${healthResult.latestVersion}`
                  : undefined
              }
              size="sm"
            />
          )}
        </div>
      </div>

      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{tool.tagline}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {category && (
          <CategoryBadge
            name={category.name}
            icon={category.icon}
            color={category.color}
          />
        )}
        <MaturityBadge maturity={tool.maturity} />
        <span className="ml-auto">
          <LanguageLogoList languages={tool.languages} />
        </span>
      </div>

      {reason && (
        <p className="mt-3 border-t border-edge pt-2 text-xs text-ink-muted">
          {reason}
        </p>
      )}
    </Link>
  );
}
