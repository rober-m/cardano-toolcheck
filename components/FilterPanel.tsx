"use client";

export interface FilterOption {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

export interface FilterGroupConfig {
  key: string;
  title: string;
  options: FilterOption[];
}

export function FilterPanel({
  groups,
  selected,
  onToggle,
  onClear,
}: {
  groups: FilterGroupConfig[];
  // Map of group key → set of selected option ids.
  selected: Record<string, Set<string>>;
  onToggle: (groupKey: string, optionId: string) => void;
  onClear: () => void;
}) {
  const anySelected = Object.values(selected).some((s) => s.size > 0);

  return (
    <aside className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Filters</h2>
        {anySelected && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-accent hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.key}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            {group.title}
          </p>
          <div className="flex flex-col gap-1">
            {group.options.map((opt) => {
              const isOn = selected[group.key]?.has(opt.id) ?? false;
              return (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                    isOn
                      ? "bg-accent/15 text-ink"
                      : "text-ink-muted hover:bg-surface-light hover:text-ink"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => onToggle(group.key, opt.id)}
                      className="accent-accent"
                    />
                    {opt.icon && <span aria-hidden>{opt.icon}</span>}
                    <span>{opt.label}</span>
                  </span>
                  {opt.count !== undefined && (
                    <span className="text-xs text-ink-muted">{opt.count}</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}
