"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, Feature, Tool } from "@/lib/types";
import { ToolCard } from "./ToolCard";
import { SearchBar } from "./SearchBar";
import { FilterPanel, type FilterGroupConfig } from "./FilterPanel";

const MATURITY_OPTIONS: FilterGroupConfig["options"] = [
  { id: "production", label: "Production" },
  { id: "active", label: "Active" },
  { id: "experimental", label: "Experimental" },
  { id: "legacy", label: "Legacy" },
  { id: "deprecated", label: "Deprecated" },
];

export function ToolCatalog({
  tools,
  categories,
  features,
  languages,
}: {
  tools: Tool[];
  categories: Category[];
  features: Feature[];
  languages: string[];
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selected, setSelected] = useState<Record<string, Set<string>>>({
    category: new Set(
      searchParams.get("category") ? [searchParams.get("category")!] : [],
    ),
    maturity: new Set(),
    language: new Set(),
    feature: new Set(),
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const featureLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of features) m.set(f.id, f.label);
    return m;
  }, [features]);

  const toggle = (groupKey: string, optionId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[groupKey]);
      if (set.has(optionId)) set.delete(optionId);
      else set.add(optionId);
      next[groupKey] = set;
      return next;
    });
  };

  const clear = () =>
    setSelected({
      category: new Set(),
      maturity: new Set(),
      language: new Set(),
      feature: new Set(),
    });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cat = selected.category;
    const mat = selected.maturity;
    const lang = selected.language;
    const feat = selected.feature;

    return tools.filter((t) => {
      // Cross-facet AND; within most facets OR; features require ALL selected.
      if (cat.size && !cat.has(t.category)) return false;
      if (mat.size && !mat.has(t.maturity)) return false;
      if (lang.size && !t.languages.some((l) => lang.has(l))) return false;
      if (feat.size && ![...feat].every((f) => t.features.includes(f)))
        return false;

      if (q) {
        const haystack = [
          t.name,
          t.tagline,
          t.id,
          t.llmDescription,
          t.maintainer,
          ...t.languages,
          ...t.features.map((f) => featureLabel.get(f) ?? f),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tools, query, selected, featureLabel]);

  const groups: FilterGroupConfig[] = [
    {
      key: "category",
      title: "Category",
      options: categories.map((c) => ({
        id: c.id,
        label: c.name,
        icon: c.icon,
        count: tools.filter((t) => t.category === c.id).length,
      })),
    },
    { key: "maturity", title: "Maturity", options: MATURITY_OPTIONS },
    {
      key: "language",
      title: "Language",
      options: languages.map((l) => ({ id: l, label: l })),
    },
    {
      key: "feature",
      title: "Features (match all)",
      options: features.map((f) => ({ id: f.id, label: f.short })),
    },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Sidebar (desktop) */}
      <div className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 scroll-thin">
          <FilterPanel
            groups={groups}
            selected={selected}
            onToggle={toggle}
            onClear={clear}
          />
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} />
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="rounded-lg border border-edge px-3 py-2.5 text-sm text-ink-muted lg:hidden"
          >
            Filters
          </button>
        </div>

        {/* Filters (mobile) */}
        {mobileFiltersOpen && (
          <div className="mt-4 rounded-xl border border-edge bg-surface-light p-4 lg:hidden">
            <FilterPanel
              groups={groups}
              selected={selected}
              onToggle={toggle}
              onClear={clear}
            />
          </div>
        )}

        <p className="mt-4 text-sm text-ink-muted">
          {filtered.length} of {tools.length} tools
        </p>

        {filtered.length === 0 ? (
          <p className="mt-12 text-center text-ink-muted">
            No tools match your filters.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
              <ToolCard key={t.id} tool={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
