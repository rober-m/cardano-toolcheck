import {
  getAllTools,
  getAllFeatures,
  getAllCategories,
  getStats,
  getTestLastRun,
  getUpstreamCiByTool,
  testResults,
} from "@/lib/data";
import { FeatureMatrix } from "@/components/FeatureMatrix";

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl border border-edge bg-surface-light px-5 py-4 text-center">
      <div className="text-3xl font-bold text-accent">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-ink-muted">
        {label}
      </div>
    </div>
  );
}

export default function Home() {
  const stats = getStats();
  const lastRun = getTestLastRun();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          Cardano Developer Tooling
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Feature Matrix
        </h1>
        <p className="mt-2 max-w-3xl text-ink-muted">
          Every catalogued tool as a row, every capability as a column. Each dot
          is graded by an automated test that actually exercises the tool — so
          the matrix shows what a tool <em>verifiably does</em>, not just what it
          claims. Filter by category and toggle feature groups below.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:max-w-3xl">
        <StatCard value={stats.toolCount} label="Tools" />
        <StatCard value={stats.categoryCount} label="Categories" />
        <StatCard value={stats.featureCount} label="Features" />
        <StatCard value={stats.verifiedCellCount} label="Verified" />
        <StatCard value={stats.healthyCount} label="Healthy" />
      </div>

      <div className="mt-10">
        <FeatureMatrix
          tools={getAllTools()}
          features={getAllFeatures()}
          categories={getAllCategories()}
          testResults={testResults}
          ciByTool={getUpstreamCiByTool()}
        />
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        Test results last updated {lastRun.slice(0, 10)}.
      </p>
    </div>
  );
}
