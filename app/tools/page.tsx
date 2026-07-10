import { Suspense } from "react";
import type { Metadata } from "next";
import {
  getAllTools,
  getAllCategories,
  getAllFeatures,
  getAllLanguages,
} from "@/lib/data";
import { ToolCatalog } from "@/components/ToolCatalog";

export const metadata: Metadata = {
  title: "Tool Catalog",
  description:
    "Search and filter the full catalog of Cardano developer tools by category, feature, language, and maturity.",
};

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Tool Catalog</h1>
      <p className="mt-1 text-ink-muted">
        Every catalogued tool in the Cardano ecosystem. Filter to narrow it
        down, or search by name, capability, or description.
      </p>

      <div className="mt-8">
        <Suspense fallback={<p className="text-ink-muted">Loading catalog…</p>}>
          <ToolCatalog
            tools={getAllTools()}
            categories={getAllCategories()}
            features={getAllFeatures()}
            languages={getAllLanguages()}
          />
        </Suspense>
      </div>
    </div>
  );
}
