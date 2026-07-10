import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllToolIds,
  getToolById,
  getCategoryById,
  getFeatureById,
  getHealthForTool,
} from "@/lib/data";
import { MaturityBadge, CategoryBadge } from "@/components/badges";
import { LanguageLogoList } from "@/components/LanguageLogo";
import { FeatureBadge } from "@/components/FeatureBadge";
import { HealthIndicator } from "@/components/HealthIndicator";
import { DependencyTree } from "@/components/DependencyTree";
import { CompatibilityRow } from "@/components/CompatibilityRow";

export function generateStaticParams() {
  return getAllToolIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tool = getToolById(id);
  if (!tool) return { title: "Tool not found" };
  return {
    title: tool.name,
    description: tool.tagline,
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-edge bg-surface-light p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tool = getToolById(id);
  if (!tool) notFound();

  const category = getCategoryById(tool.category);
  const healthResult = getHealthForTool(tool.id);
  const isSdk = tool.category === "off-chain-sdk";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/tools" className="text-sm text-accent hover:underline">
        ← Back to catalog
      </Link>

      {/* Header */}
      <header className="mt-4 flex flex-col gap-4 border-b border-edge pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{tool.name}</h1>
            {tool.isRecommendedDefault && (
              <span
                className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
                title="Our recommended default in its category"
              >
                ★ Recommended default
              </span>
            )}
          </div>
          <p className="mt-2 text-lg text-ink-muted">{tool.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {category && (
              <Link href={`/tools?category=${category.id}`}>
                <CategoryBadge
                  name={category.name}
                  icon={category.icon}
                  color={category.color}
                />
              </Link>
            )}
            <MaturityBadge maturity={tool.maturity} />
            <LanguageLogoList languages={tool.languages} showLabel size="md" />
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          {healthResult && (
            <Link
              href="/health"
              className="flex items-center gap-2 rounded-lg border border-edge bg-surface px-3 py-1.5"
            >
              <HealthIndicator
                status={healthResult.status}
                showLabel
                detail={
                  healthResult.latestVersion
                    ? `v${healthResult.latestVersion}`
                    : undefined
                }
              />
            </Link>
          )}
          <div className="flex gap-2">
            <a
              href={tool.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
            >
              Website ↗
            </a>
            {tool.repo && (
              <a
                href={tool.repo}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-edge px-3 py-1.5 text-sm font-medium hover:border-accent/50"
              >
                Repo ↗
              </a>
            )}
          </div>
          <p className="text-xs text-ink-muted">
            Maintained by {tool.maintainer}
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Section title="Overview">
            <p className="text-sm leading-relaxed text-ink/90">
              {tool.llmDescription}
            </p>
          </Section>

          <div className="grid gap-5 sm:grid-cols-2">
            <Section title="When to use">
              <p className="text-sm leading-relaxed text-ink/90">
                {tool.whenToUse}
              </p>
            </Section>
            <Section title="When you can skip it">
              <p className="text-sm leading-relaxed text-ink/90">
                {tool.skipUntil}
              </p>
            </Section>
          </div>

          <Section title="Features">
            {tool.features.length ? (
              <div className="flex flex-wrap gap-2">
                {tool.features.map((fid) => {
                  const f = getFeatureById(fid);
                  return f ? (
                    <FeatureBadge key={fid} feature={f} />
                  ) : (
                    <span key={fid} className="text-xs text-ink-muted">
                      {fid}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No features listed.</p>
            )}
          </Section>

          {isSdk && (
            <Section title="Compatibility">
              <CompatibilityRow sdkId={tool.id} />
            </Section>
          )}
        </div>

        {/* Side column */}
        <div className="flex flex-col gap-5">
          <Section title="Dependencies">
            <DependencyTree tool={tool} />
          </Section>

          <Section title="Recommendation">
            <p className="text-sm">
              <span className="font-medium text-health-healthy">
                Recommended for:{" "}
              </span>
              <span className="text-ink/90">{tool.recommendedFor}</span>
            </p>
            <p className="mt-3 text-sm">
              <span className="font-medium text-health-warning">
                Not recommended for:{" "}
              </span>
              <span className="text-ink/90">{tool.notRecommendedFor}</span>
            </p>
          </Section>

          {healthResult && (
            <Section title="Health checks">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {healthResult.latestVersion && (
                  <>
                    <dt className="text-ink-muted">Latest</dt>
                    <dd className="text-right">v{healthResult.latestVersion}</dd>
                  </>
                )}
                {healthResult.lastRelease && (
                  <>
                    <dt className="text-ink-muted">Last release</dt>
                    <dd className="text-right">{healthResult.lastRelease}</dd>
                  </>
                )}
                {healthResult.githubStars != null && (
                  <>
                    <dt className="text-ink-muted">Stars</dt>
                    <dd className="text-right">
                      {healthResult.githubStars.toLocaleString()}
                    </dd>
                  </>
                )}
                {healthResult.npmDownloadsWeekly != null && (
                  <>
                    <dt className="text-ink-muted">npm / week</dt>
                    <dd className="text-right">
                      {healthResult.npmDownloadsWeekly.toLocaleString()}
                    </dd>
                  </>
                )}
              </dl>
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-edge pt-3 text-xs">
                {healthResult.checks.map((c) => (
                  <li key={c.name} className="flex items-start gap-2">
                    <span
                      className={
                        c.passed ? "text-health-healthy" : "text-health-failing"
                      }
                    >
                      {c.passed ? "✓" : "✗"}
                    </span>
                    <span className="text-ink-muted">
                      <span className="text-ink">{c.name}</span> — {c.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
