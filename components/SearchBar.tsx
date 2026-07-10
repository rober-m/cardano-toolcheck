// Presentational controlled search input. No hooks, so it can be rendered by
// either server or client parents; interactive parents pass value/onChange.
export function SearchBar({
  value,
  onChange,
  placeholder = "Search tools…",
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-edge bg-surface-light py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent/60 focus:outline-none"
      />
    </div>
  );
}
