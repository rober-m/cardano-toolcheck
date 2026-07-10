// Logo tiles for the surface languages / tech a tool uses.
//
// Where a real brand SVG exists it is rendered from /public/logos/lang/<file>.svg
// on a light tile (so dark marks like Rust/PureScript stay visible on the dark
// theme). Tokens without a brand logo (DSLs, protocols, "Various") fall back to
// a brand-colored monogram tile.

interface LangMeta {
  // Canonical key used for de-duplication (e.g. "TypeScript eDSL" → typescript).
  key: string;
  // Filename (without extension) under /public/logos/lang when a real logo exists.
  logo?: string;
  // Monogram fallback styling (used when `logo` is absent).
  symbol: string;
  bg: string;
  fg: string;
}

const NEUTRAL: LangMeta = {
  key: "generic",
  symbol: "•",
  bg: "#2a2a3a",
  fg: "#9a9ab0",
};

const MAP: Record<string, LangMeta> = {
  // ── Programming languages (real logos) ──
  TypeScript: { key: "typescript", logo: "typescript", symbol: "TS", bg: "#3178C6", fg: "#fff" },
  "TypeScript eDSL": { key: "typescript", logo: "typescript", symbol: "TS", bg: "#3178C6", fg: "#fff" },
  JavaScript: { key: "javascript", logo: "javascript", symbol: "JS", bg: "#F7DF1E", fg: "#1a1a1a" },
  Python: { key: "python", logo: "python", symbol: "Py", bg: "#3776AB", fg: "#FFD43B" },
  Rust: { key: "rust", logo: "rust", symbol: "Rs", bg: "#CE422B", fg: "#fff" },
  "Rust-like": { key: "rust", logo: "rust", symbol: "Rs", bg: "#CE422B", fg: "#fff" },
  Haskell: { key: "haskell", logo: "haskell", symbol: "λ", bg: "#5E5086", fg: "#fff" },
  "Haskell eDSL": { key: "haskell", logo: "haskell", symbol: "λ", bg: "#5E5086", fg: "#fff" },
  Java: { key: "java", logo: "java", symbol: "Jv", bg: "#E76F00", fg: "#fff" },
  "Scala 3": { key: "scala", logo: "scala", symbol: "Sc", bg: "#DC322F", fg: "#fff" },
  "C#": { key: "csharp", logo: "csharp", symbol: "C#", bg: "#68217A", fg: "#fff" },
  ".NET": { key: "dotnet", logo: "dotnet", symbol: "N", bg: "#512BD4", fg: "#fff" },
  Go: { key: "go", logo: "go", symbol: "Go", bg: "#00ADD8", fg: "#fff" },
  PureScript: { key: "purescript", logo: "purescript", symbol: "PS", bg: "#14161A", fg: "#fff" },
  WASM: { key: "wasm", logo: "wasm", symbol: "Wa", bg: "#654FF0", fg: "#fff" },

  // ── Tech / infra with real logos ──
  Docker: { key: "docker", logo: "docker", symbol: "Dk", bg: "#2496ED", fg: "#fff" },
  PostgreSQL: { key: "postgres", logo: "postgres", symbol: "Pg", bg: "#4169E1", fg: "#fff" },
  GraphQL: { key: "graphql", logo: "graphql", symbol: "GQL", bg: "#E10098", fg: "#fff" },
  NPM: { key: "npm", logo: "npm", symbol: "npm", bg: "#CB3837", fg: "#fff" },

  // ── No brand logo → monogram fallback ──
  "Custom DSL": { key: "dsl", symbol: "{}", bg: "#7f8c8d", fg: "#fff" },
  DSL: { key: "dsl", symbol: "{}", bg: "#7f8c8d", fg: "#fff" },
  Visual: { key: "visual", symbol: "◳", bg: "#d35400", fg: "#fff" },
  "REST API": { key: "rest", symbol: "API", bg: "#1abc9c", fg: "#fff" },
  "JSON-RPC": { key: "jsonrpc", symbol: "RPC", bg: "#2ecc71", fg: "#fff" },
  WebSocket: { key: "ws", symbol: "WS", bg: "#16a085", fg: "#fff" },
  gRPC: { key: "grpc", symbol: "g", bg: "#244c5a", fg: "#fff" },
  HTTP: { key: "http", symbol: "{}", bg: "#34495e", fg: "#fff" },
  CLI: { key: "cli", symbol: ">_", bg: "#2c3e50", fg: "#2ecc71" },
  Cloud: { key: "cloud", symbol: "☁", bg: "#3498db", fg: "#fff" },
  Web: { key: "web", symbol: "@", bg: "#e67e22", fg: "#fff" },
  Various: { key: "various", symbol: "*", bg: "#7f8c8d", fg: "#fff" },
};

function metaFor(language: string): LangMeta {
  return MAP[language] ?? NEUTRAL;
}

const SIZES = {
  sm: { tile: "h-5 w-5", text: "text-[9px]", label: "text-xs" },
  md: { tile: "h-6 w-6", text: "text-[10px]", label: "text-sm" },
};

export function LanguageLogo({
  language,
  showLabel = false,
  size = "sm",
}: {
  language: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const meta = metaFor(language);
  const s = SIZES[size];
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={language}
      aria-label={language}
    >
      {meta.logo ? (
        // Light tile keeps multicolor and dark logos legible on the dark theme.
        <span
          className={`grid shrink-0 place-items-center rounded-md bg-white p-0.5 ${s.tile}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/logos/lang/${meta.logo}.svg`}
            alt={`${language} logo`}
            className="h-full w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </span>
      ) : (
        <span
          className={`grid shrink-0 place-items-center rounded-md font-mono font-bold leading-none ${s.tile} ${s.text}`}
          style={{ backgroundColor: meta.bg, color: meta.fg }}
        >
          {meta.symbol}
        </span>
      )}
      {showLabel && <span className={`${s.label} text-ink-muted`}>{language}</span>}
    </span>
  );
}

// Renders a tool's languages as logo tiles, de-duplicated by canonical key so
// near-identical pairs (e.g. "C#" + ".NET") don't both show.
export function LanguageLogoList({
  languages,
  showLabel = false,
  size = "sm",
}: {
  languages: string[];
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const seen = new Set<string>();
  const unique = languages.filter((l) => {
    const key = metaFor(l).key;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {unique.map((l) => (
        <LanguageLogo key={l} language={l} showLabel={showLabel} size={size} />
      ))}
    </span>
  );
}
