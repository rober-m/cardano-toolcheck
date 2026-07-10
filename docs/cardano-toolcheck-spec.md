# Cardano Toolcheck — Full Specification

## 1. Project Overview

**Name:** Cardano Toolcheck
**Type:** Next.js static site (SSG via `output: 'export'`)
**Purpose:** Do three things for the Cardano developer tooling ecosystem — **map** it (a catalogue of every tool and its capabilities), **check** each tool's maintenance health, and **verify** that a tool's advertised features actually work via an automated, multi-language test suite. The Feature Matrix is the front door: every tool × capability cell is graded by real test results.

### Core Principles

- All content lives in editable JSON under `/data/`. No CMS, no database, no runtime API calls for content. Pages are statically generated at build time.
- The **Feature Matrix is the home page** (`/`). Each cell reflects test results, not a self-declared claim: full (all tests pass), half (>50%), empty (tested, <50%), untested (claimed but no tests yet), or not-offered.
- Each tool has automated **health checks** (release recency, registry presence, and the project's own upstream CI status) that run on a schedule and write results into JSON the site reads at build time.
- Each tool's features are verified by a **feature-test harness**: tests live in the tool's native language under `/tests/<toolId>/`, run in split CI jobs, and write per-tool results that are combined for the site.

---

## 2. Data Model

All JSON files live in `/data/`. The source of truth for the entire site.

### 2.1 `/data/tools.json`

The master file. An array of tool objects. Every tool in the ecosystem is described here.

```jsonc
[
  {
    // ─── Identity ───
    "id": "aiken",                          // unique slug, kebab-case
    "name": "Aiken",                        // display name
    "tagline": "The most popular smart contract language for Cardano",  // one-liner
    "website": "https://aiken-lang.org",
    "repo": "https://github.com/aiken-lang/aiken",  // nullable
    "logo": "/logos/aiken.png",             // nullable, path to static asset
    "maintainer": "TxPipe / Aiken contributors",

    // ─── Classification ───
    "category": "smart-contract-language",  // enum, see categories.json
    "subcategory": "standalone-language",   // optional finer grain
    "languages": ["Rust-like"],             // implementation / surface language(s)
    "maturity": "production",               // "production" | "active" | "experimental" | "legacy" | "deprecated"

    // ─── What it does (features) ───
    "features": [
      "compiles-to-uplc",
      "generates-blueprint",
      "plutus-v3",
      "property-based-testing",
      "lsp-support",
      "package-manager"
    ],

    // ─── Long-form description ───
    // A precise, self-contained description of the tool. Be specific about what
    // the tool does AND does not do, how it relates to other tools, and any
    // Cardano-specific context (eUTxO, Plutus, CIP-57). (Field name is historical;
    // it no longer feeds an AI advisor.)
    "llmDescription": "Aiken is a standalone programming language purpose-built for writing on-chain validator scripts (smart contracts) on Cardano. It compiles to Untyped Plutus Core (UPLC), which is the low-level language executed by Cardano's virtual machine. Aiken does NOT handle off-chain concerns: it does not build transactions, connect to wallets, or query the blockchain. For those tasks you need a separate off-chain SDK (Mesh SDK, Lucid Evolution, Blaze, PyCardano, etc.) that loads the compiled Aiken output (a CIP-57 'blueprint' file called plutus.json). Aiken's syntax is Rust-influenced, statically typed, with pattern matching. It includes a built-in test runner, a package manager, LSP for editor support, and generates CIP-57 blueprint JSON automatically. It is the most widely adopted smart contract language in the Cardano ecosystem as of 2025. Aiken focuses exclusively on on-chain validators — it is not a general-purpose language. Developers typically pair Aiken (on-chain) with a TypeScript SDK (off-chain) as the standard modern Cardano dApp stack.",

    // ─── When would I need this? ───
    // Short, contextual guidance for beginners.
    "whenToUse": "Use Aiken when you need to write custom on-chain logic (validators/smart contracts) for your Cardano dApp. If your app only sends ADA or mints tokens using native scripts, you do NOT need Aiken — an off-chain SDK is enough. You need Aiken (or another smart contract language) when your app requires conditional spending rules, escrow, DEX logic, lending protocols, or any custom validation beyond simple transfers.",
    "skipUntil": "You can skip Aiken entirely if your project only involves sending ADA, minting tokens with native scripts (time-lock, multi-sig), or reading chain data. Many Cardano projects don't need smart contracts at all.",

    // ─── Dependencies ───
    "dependsOn": [],                        // tool IDs this tool requires at build or runtime
    "optionalDeps": [],                     // tool IDs that enhance but aren't required
    "usedBy": ["mesh", "lucid-evolution", "blaze", "pycardano"],  // tools that consume this tool's output

    // ─── Provider Compatibility (for SDKs) ───
    // Only relevant for off-chain SDKs. Which backend providers does it support?
    "providers": null,                      // null for non-SDKs

    // ─── Smart Contract Language Compatibility (for SDKs) ───
    // Only relevant for off-chain SDKs. Which on-chain languages can it load?
    "smartContractCompat": null,            // null for non-SDKs

    // ─── Recommendation ───
    "isRecommendedDefault": true,           // is this the "if in doubt, use this" pick in its category?
    "recommendedFor": "Developers who want the most mature, best-documented, and most widely adopted smart contract language for Cardano. Especially TypeScript developers pairing with Mesh or Blaze.",
    "notRecommendedFor": "Python developers who prefer OpShin, or Haskell teams who want Plinth/Plutarch for deep Plutus integration.",

    // ─── Health Check Config ───
    "healthCheck": {
      "type": "github-release",             // see health check types below
      "repo": "aiken-lang/aiken",
      "additionalChecks": ["npm-package:@aiken-lang/stdlib"]
    }
  }
]
```

#### Complete field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique kebab-case identifier |
| `name` | string | yes | Display name |
| `tagline` | string | yes | One-sentence summary (< 120 chars) |
| `website` | string | yes | Primary URL |
| `repo` | string | no | Source code repository URL |
| `logo` | string | no | Path to logo in `/public/logos/` |
| `maintainer` | string | yes | Who maintains this tool |
| `category` | string | yes | Must match an id in `categories.json` |
| `subcategory` | string | no | Finer classification |
| `languages` | string[] | yes | Surface languages / tech stack |
| `maturity` | enum | yes | One of: `production`, `active`, `experimental`, `legacy`, `deprecated` |
| `features` | string[] | yes | Array of feature IDs from `features.json` |
| `llmDescription` | string | yes | Long-form prose description (200–500 words) shown on the tool-detail page. Must explain what the tool does, what it doesn't do, how it relates to other tools, and any Cardano-specific context. (Field name is historical.) |
| `whenToUse` | string | yes | When a developer should reach for this tool |
| `skipUntil` | string | yes | When it's okay to ignore this tool |
| `dependsOn` | string[] | yes | Hard dependencies (tool IDs) |
| `optionalDeps` | string[] | yes | Optional / pluggable dependencies |
| `usedBy` | string[] | yes | Tools that consume this tool's output |
| `providers` | string[] | no | For SDKs: which API providers it supports (tool IDs) |
| `smartContractCompat` | string[] | no | For SDKs: which on-chain languages it can load artifacts from |
| `isRecommendedDefault` | boolean | yes | Whether this is the "if in doubt" pick |
| `recommendedFor` | string | yes | Who should pick this tool |
| `notRecommendedFor` | string | yes | Who should pick something else |
| `healthCheck` | object | yes | Config for automated testing |


### 2.2 `/data/categories.json`

Defines the taxonomy. Tools reference these by ID.

```jsonc
[
  {
    "id": "smart-contract-language",
    "name": "Smart Contract Languages",
    "icon": "📜",
    "color": "#E94560",
    "description": "Languages that compile to Untyped Plutus Core (UPLC) for on-chain validator scripts.",
    "llmContext": "Cardano executes smart contracts as UPLC (Untyped Plutus Core) scripts. Multiple high-level languages compile to UPLC. The developer chooses one language for on-chain logic and a separate off-chain SDK for transaction building. This is different from Ethereum where Solidity handles both concerns.",
    "order": 1
  },
  {
    "id": "off-chain-sdk",
    "name": "Off-Chain SDKs & Transaction Builders",
    "icon": "🧰",
    "color": "#3498db",
    "description": "Libraries for building transactions, integrating wallets, and interacting with the chain.",
    "llmContext": "Off-chain SDKs handle everything that is NOT executed on-chain: building transactions, selecting UTxOs, calculating fees, signing, submitting, connecting to browser wallets (CIP-30), and querying blockchain state via providers. Every Cardano dApp needs one. They are pluggable: each SDK supports multiple backend providers (Blockfrost, Koios, Maestro, Ogmios, etc.) via an adapter/provider pattern.",
    "order": 2
  },
  {
    "id": "serialization-library",
    "name": "Serialization & Low-Level Libraries",
    "icon": "🔧",
    "color": "#9b59b6",
    "description": "Low-level CBOR encoding, protocol reimplementations, and foundational codec libraries.",
    "llmContext": "These are foundational libraries that most developers do NOT use directly. Off-chain SDKs use them internally. Only reach for these if you're building your own SDK, wallet, or infrastructure tool, or need fine-grained control over CBOR serialization.",
    "order": 3
  },
  {
    "id": "api-provider",
    "name": "API Providers",
    "icon": "🌐",
    "color": "#1abc9c",
    "description": "Hosted REST/GraphQL APIs that abstract direct node interaction.",
    "llmContext": "API providers let developers query blockchain data and submit transactions without running their own Cardano node. They are plugged into off-chain SDKs as 'providers' or 'backends'. Most have free tiers. Choosing a provider is one of the first decisions a new developer makes.",
    "order": 4
  },
  {
    "id": "node-and-access",
    "name": "Node & Direct Chain Access",
    "icon": "🖧",
    "color": "#e67e22",
    "description": "Node software, bridges, and direct chain-access interfaces.",
    "llmContext": "These tools connect directly to the Cardano node using Ouroboros mini-protocols. Most dApp developers do NOT need to run a node or use these directly — they use API providers instead. Node-level tools are for infrastructure operators, protocol developers, and advanced setups (self-hosted backends, custom indexing).",
    "order": 5
  },
  {
    "id": "indexer",
    "name": "Chain Indexers",
    "icon": "🗂️",
    "color": "#2ecc71",
    "description": "Follow the chain and store structured, queryable blockchain data.",
    "llmContext": "Indexers follow the blockchain and store data in a database (PostgreSQL, SQLite, etc.) for efficient querying. Most dApp developers use indexers indirectly via API providers (Blockfrost uses DB Sync, Maestro has its own indexer, etc.). You'd run your own indexer only if you need custom queries, real-time event streaming, or want to avoid third-party dependencies.",
    "order": 6
  },
  {
    "id": "dev-environment",
    "name": "Local Development & Testing",
    "icon": "🧪",
    "color": "#f39c12",
    "description": "Local devnets, testing frameworks, and emulators for rapid iteration.",
    "llmContext": "Local development tools let you spin up a private Cardano network on your machine for testing without spending real ADA or waiting for testnet block confirmations. Essential for CI/CD pipelines and rapid iteration. The main tool is Yaci DevKit, which provides a full local devnet with a built-in indexer.",
    "order": 7
  },
  {
    "id": "layer-2",
    "name": "Layer 2 & Scalability",
    "icon": "⚡",
    "color": "#8e44ad",
    "description": "Off-chain scaling protocols extending Cardano's throughput.",
    "llmContext": "Layer 2 solutions process transactions off-chain while settling on Cardano mainnet. Hydra is the primary L2, using isomorphic state channels. Most dApps do NOT need L2 initially — it's relevant for high-throughput use cases like gaming, micropayments, or auctions. Mithril is for fast node sync, not dApp scaling per se.",
    "order": 8
  },
  {
    "id": "wallet-integration",
    "name": "Wallet Integration & CIP Standards",
    "icon": "👛",
    "color": "#9b59b6",
    "description": "Libraries for connecting dApps to browser wallets and signing transactions.",
    "llmContext": "Most off-chain SDKs (Mesh, Lucid Evolution, Blaze) include wallet integration built-in via CIP-30. The tools in this category are standalone wallet connectors or helper libraries for projects that need wallet connectivity without a full SDK.",
    "order": 9
  },
  {
    "id": "oracle",
    "name": "Oracles & Off-Chain Data Feeds",
    "icon": "🔮",
    "color": "#d35400",
    "description": "Oracle networks bringing real-world data to on-chain smart contracts.",
    "llmContext": "Oracles provide off-chain data (prices, weather, sports scores, etc.) to on-chain smart contracts. You need an oracle if your smart contract must make decisions based on real-world information. DeFi protocols almost always need price oracles. Simple dApps (NFTs, governance voting) usually do not.",
    "order": 10
  },
  {
    "id": "nft-token-tooling",
    "name": "NFT & Token Tooling",
    "icon": "🎨",
    "color": "#16213E",
    "description": "Platforms and libraries for minting and managing NFTs and native tokens.",
    "llmContext": "Cardano supports native tokens at the ledger level (no smart contract needed for basic minting). These tools provide higher-level interfaces for NFT/token creation, management, and distribution. Most off-chain SDKs also have built-in minting support, so standalone NFT tools are mainly useful for no-code/low-code workflows or specialized features (bulk minting, whitelisting, etc.).",
    "order": 11
  },
  {
    "id": "baas-platform",
    "name": "BaaS & Cloud Platforms",
    "icon": "☁️",
    "color": "#0F3460",
    "description": "Backend-as-a-Service and managed environments for Cardano development.",
    "llmContext": "These platforms provide managed Cardano infrastructure so developers don't need to run or configure anything locally. Useful for quick prototyping, hackathons, or teams that want to avoid infrastructure management.",
    "order": 12
  },
  {
    "id": "plutus-utilities",
    "name": "Plutus Utilities & Optimization",
    "icon": "⚙️",
    "color": "#7f8c8d",
    "description": "Helper libraries, optimizers, and formal verification for Plutus smart contracts.",
    "llmContext": "Advanced tools for optimizing UPLC bytecode size, improving script execution costs, or formally verifying contract correctness. Only relevant once you have a working smart contract and need to optimize it for production.",
    "order": 13
  },
  {
    "id": "explorer-analytics",
    "name": "Data Analytics & Explorers",
    "icon": "📊",
    "color": "#E94560",
    "description": "Block explorers and analytics platforms.",
    "llmContext": "Explorers let developers inspect transactions, addresses, tokens, and smart contract interactions on Cardano. Essential for debugging during development and monitoring in production. Not a build dependency — you use them via a browser.",
    "order": 14
  }
]
```


### 2.3 `/data/features.json`

Defines every capability a tool can have.

```jsonc
[
  // ─── On-Chain ───
  { "id": "compiles-to-uplc", "label": "Compiles to UPLC", "short": "UPLC", "group": "on-chain", "description": "Compiles high-level code to Untyped Plutus Core, Cardano's on-chain execution language." },
  { "id": "generates-blueprint", "label": "Generates CIP-57 Blueprint", "short": "Blueprint", "group": "on-chain", "description": "Produces a plutus.json blueprint file (CIP-57) that off-chain tools can consume to build transactions targeting this contract." },
  { "id": "plutus-v3", "label": "Plutus V3 Support", "short": "Plutus V3", "group": "on-chain", "description": "Supports the latest Plutus V3 script version with Conway-era features." },
  { "id": "native-scripts", "label": "Native Script Support", "short": "Native Scripts", "group": "on-chain", "description": "Supports Cardano native scripts (multi-sig, time-lock) which don't require Plutus." },
  { "id": "property-based-testing", "label": "Built-in Testing Framework", "short": "Testing", "group": "on-chain", "description": "Includes a built-in test runner for unit and/or property-based testing of on-chain logic." },
  { "id": "lsp-support", "label": "Editor/LSP Support", "short": "LSP", "group": "on-chain", "description": "Provides a Language Server Protocol implementation for IDE integration (autocomplete, type checking, go-to-definition)." },
  { "id": "package-manager", "label": "Package Manager", "short": "Pkg Mgr", "group": "on-chain", "description": "Includes a package manager for importing and versioning on-chain library dependencies." },

  // ─── Off-Chain ───
  { "id": "builds-transactions", "label": "Builds Transactions", "short": "Build Tx", "group": "off-chain", "description": "Constructs Cardano transactions programmatically: outputs, inputs, scripts, metadata, validity intervals." },
  { "id": "signs-transactions", "label": "Signs Transactions", "short": "Sign Tx", "group": "off-chain", "description": "Signs transactions using private keys, mnemonics, or hardware wallets." },
  { "id": "submits-transactions", "label": "Submits Transactions", "short": "Submit Tx", "group": "off-chain", "description": "Submits signed transactions to the Cardano network for inclusion in a block." },
  { "id": "queries-utxos", "label": "Queries UTxOs", "short": "Query UTxO", "group": "off-chain", "description": "Retrieves the current UTxO set for addresses, allowing the SDK to know what's available to spend." },
  { "id": "coin-selection", "label": "Coin Selection", "short": "Coin Select", "group": "off-chain", "description": "Automatically selects which UTxOs to use as inputs to cover transaction outputs and fees." },
  { "id": "fee-estimation", "label": "Fee Estimation", "short": "Fees", "group": "off-chain", "description": "Calculates transaction fees based on current protocol parameters and transaction size." },
  { "id": "mints-tokens", "label": "Mints Native Tokens/NFTs", "short": "Mint", "group": "off-chain", "description": "Provides helpers for minting native tokens and NFTs on Cardano." },
  { "id": "reads-blueprint", "label": "Reads CIP-57 Blueprints", "short": "Read BP", "group": "off-chain", "description": "Can load and parse a CIP-57 plutus.json blueprint to interact with compiled smart contracts." },
  { "id": "script-evaluation", "label": "Evaluates Plutus Scripts", "short": "Eval Script", "group": "off-chain", "description": "Can evaluate Plutus scripts locally to estimate execution units before submitting." },

  // ─── Wallet ───
  { "id": "cip-30", "label": "CIP-30 Wallet Connector", "short": "CIP-30", "group": "wallet", "description": "Connects to Cardano browser wallets (Eternl, Lace, NuFi, Yoroi, Begin) via the CIP-30 dApp connector standard." },
  { "id": "cip-95", "label": "CIP-95 Governance Bridge", "short": "CIP-95", "group": "wallet", "description": "Extends CIP-30 with governance features: DRep registration, delegation, voting." },
  { "id": "hardware-wallet", "label": "Hardware Wallet Support", "short": "HW Wallet", "group": "wallet", "description": "Supports signing with Ledger, Trezor, or other hardware wallets." },

  // ─── Low-Level ───
  { "id": "cbor-serialization", "label": "CBOR Serialization", "short": "CBOR", "group": "low-level", "description": "Encodes/decodes Cardano data structures to/from CBOR binary format." },
  { "id": "ouroboros-miniprotocols", "label": "Ouroboros Mini-Protocols", "short": "Mini-Protocols", "group": "low-level", "description": "Implements Cardano's Ouroboros network protocols for direct node communication." },

  // ─── Infrastructure ───
  { "id": "indexes-chain", "label": "Indexes Chain Data", "short": "Index", "group": "infrastructure", "description": "Follows the Cardano chain and stores structured data in a queryable database." },
  { "id": "provides-query-api", "label": "Provides Query API", "short": "Query API", "group": "infrastructure", "description": "Exposes an API (REST, GraphQL, gRPC) for querying blockchain state." },
  { "id": "connects-to-node", "label": "Connects to Node", "short": "Node Conn.", "group": "infrastructure", "description": "Connects directly to a Cardano node via Ouroboros protocols or local socket." },
  { "id": "local-devnet", "label": "Local Development Network", "short": "Devnet", "group": "infrastructure", "description": "Provides a local, private Cardano network for development and testing." },
  { "id": "blockfrost-compat-api", "label": "Blockfrost-Compatible API", "short": "BF API", "group": "infrastructure", "description": "Exposes API endpoints compatible with the Blockfrost API format, allowing SDK provider reuse." },

  // ─── Scalability ───
  { "id": "layer-2-scaling", "label": "Layer 2 Scaling", "short": "L2", "group": "scalability", "description": "Processes transactions off-chain in state channels or sidechains for higher throughput." },

  // ─── Data ───
  { "id": "oracle-data-feed", "label": "Oracle / Off-Chain Data Feed", "short": "Oracle", "group": "data", "description": "Provides real-world data to on-chain smart contracts." },

  // ─── Quality ───
  { "id": "formal-verification", "label": "Formal Verification / Optimization", "short": "Formal V.", "group": "quality", "description": "Tools for proving smart contract correctness or optimizing UPLC bytecode." }
]
```


### 2.4 `/data/compatibility.json`

The explicit compatibility matrix between SDKs, providers, smart contract languages, and testing tools. (No longer a standalone page — this data is now rendered inline on the tool-detail page for SDK tools via the `CompatibilityRow` component.)

```jsonc
{
  "sdkProviderMatrix": {
    "mesh":            { "blockfrost": true, "koios": true, "maestro": true, "ogmios": true, "utxo-rpc": true, "yaci-devkit": true, "hydra": "beta" },
    "lucid-evolution":  { "blockfrost": true, "koios": true, "maestro": true, "ogmios": true, "utxo-rpc": false, "yaci-devkit": true, "hydra": false },
    "blaze":           { "blockfrost": true, "koios": false, "maestro": true, "ogmios": true, "utxo-rpc": true, "yaci-devkit": false, "hydra": false },
    "pycardano":       { "blockfrost": true, "koios": false, "maestro": false, "ogmios": true, "utxo-rpc": false, "yaci-devkit": true, "hydra": false },
    "cardano-client-lib": { "blockfrost": true, "koios": true, "maestro": false, "ogmios": true, "utxo-rpc": false, "yaci-devkit": true, "hydra": false },
    "cardano-js-sdk":  { "blockfrost": true, "koios": false, "maestro": false, "ogmios": true, "utxo-rpc": false, "yaci-devkit": false, "hydra": false },
    "cardanosharp":    { "blockfrost": true, "koios": true, "maestro": false, "ogmios": false, "utxo-rpc": false, "yaci-devkit": false, "hydra": false },
    "ctl":             { "blockfrost": false, "koios": false, "maestro": false, "ogmios": true, "utxo-rpc": false, "yaci-devkit": false, "hydra": false },
    "atlas":           { "blockfrost": false, "koios": false, "maestro": true, "ogmios": true, "utxo-rpc": false, "yaci-devkit": false, "hydra": false }
  },

  "sdkLanguageMatrix": {
    "mesh":            { "aiken": true, "plinth": true, "opshin": false, "plutarch": true, "plu-ts": false, "scalus": false, "helios": false, "marlowe": false },
    "lucid-evolution":  { "aiken": true, "plinth": true, "opshin": false, "plutarch": true, "plu-ts": false, "scalus": false, "helios": true, "marlowe": false },
    "blaze":           { "aiken": true, "plinth": true, "opshin": false, "plutarch": true, "plu-ts": false, "scalus": false, "helios": false, "marlowe": false },
    "pycardano":       { "aiken": true, "plinth": true, "opshin": true, "plutarch": true, "plu-ts": false, "scalus": false, "helios": false, "marlowe": false },
    "cardano-client-lib": { "aiken": true, "plinth": true, "opshin": false, "plutarch": true, "plu-ts": false, "scalus": false, "helios": false, "marlowe": false }
  },

  "notes": [
    { "sdk": "blaze", "provider": "koios", "note": "Not built-in. Community provider may exist but is not officially supported." },
    { "sdk": "blaze", "provider": "ogmios", "note": "Via built-in 'Kupmios' provider which combines Ogmios (tx eval/submit) + Kupo (UTxO queries)." },
    { "sdk": "pycardano", "provider": "ogmios", "note": "Via OgmiosChainContext. Kupo can be added via KupoChainContextExtension for UTxO pattern matching." },
    { "sdk": "pycardano", "provider": "yaci-devkit", "note": "Via pccontext library's YaciDevkitChainContext." },
    { "sdk": "mesh", "provider": "hydra", "note": "Beta provider. Connects to Hydra Head for L2 transaction building." },
    { "sdk": "pycardano", "smart-contract": "opshin", "note": "OpShin's primary off-chain partner. OpShin contracts are built and loaded directly as PyCardano PlutusV3Script objects." },
    { "sdk": "all", "smart-contract": "all", "note": "Any SDK can load any compiled UPLC/blueprint — the matrix shows officially tested and documented pairings." }
  ]
}
```


### 2.5 `/data/health-results.json`

Written by the CI health-check script, read at build time. NOT manually edited.

```jsonc
{
  "lastRun": "2026-05-28T14:30:00Z",
  "results": {
    "aiken": {
      "status": "healthy",               // "healthy" | "warning" | "failing" | "unknown"
      "lastRelease": "2026-04-15",
      "latestVersion": "1.1.12",
      "daysSinceRelease": 43,
      "npmDownloadsWeekly": null,
      "githubStars": 1800,
      "openIssues": 23,
      "upstreamCi": "passing",           // the project's OWN CI on its default branch: "passing" | "failing" | "unknown"
      "checks": [
        { "name": "github-release", "passed": true, "detail": "v1.1.12 released 43 days ago" },
        { "name": "npm-package:@aiken-lang/stdlib", "passed": true, "detail": "1.1.0 on npm, 890 weekly downloads" }
      ]
    },
    "mesh": {
      "status": "healthy",
      "lastRelease": "2026-05-10",
      "latestVersion": "2.5.0",
      "daysSinceRelease": 18,
      "npmDownloadsWeekly": 3783,
      "githubStars": 420,
      "openIssues": 15,
      "checks": [
        { "name": "github-release", "passed": true, "detail": "v2.5.0 released 18 days ago" },
        { "name": "npm-package:@meshsdk/core", "passed": true, "detail": "3783 weekly downloads" },
        { "name": "docs-reachable", "passed": true, "detail": "meshjs.dev returns 200" }
      ]
    }
  }
}
```


### 2.6 `/data/test-results.json` (+ `/data/test-results/<toolId>.json`)

Written by the feature-test harness, read at build time. NOT manually edited. Each
CI job writes only its tool's `/data/test-results/<toolId>.json` (so parallel jobs
never clobber each other); `scripts/combine-test-results.ts` folds them into the
single aggregate `test-results.json` the site imports.

```jsonc
// data/test-results/<toolId>.json — one file per tool
{
  "toolId": "mesh",
  "lastRun": "2026-07-09T12:00:00.000Z",
  "depthsRun": ["offline"],
  "tests": [
    {
      "id": "builds-tx",
      "features": ["builds-transactions", "coin-selection", "fee-estimation"],  // cells this test grades
      "depth": "offline",                 // "offline" | "devnet"
      "status": "pass",                   // "pass" | "fail" | "skip" | "error"
      "durationMs": 812,
      "detail": "1 case(s) passed for \"builds and balances a transaction\""
    }
  ]
}

// data/test-results.json — aggregate, same envelope as health-results.json
{
  "lastRun": "2026-07-09T12:00:00.000Z",
  "results": { "mesh": { "lastRun": "...", "depthsRun": [...], "tests": [...] } }
}
```

Cell grading (`lib/cell-status.ts`): for a (tool, feature) the tool claims, count
only `pass`/`fail` tests referencing that feature id — `skip`/`error` don't count,
so a missing devnet never flips a verified cell red. ratio 1 → `full`, >0.5 →
`half`, ≤0.5 → `empty`; no counted tests → `untested`.

### 2.7 `/tests/<toolId>/tool.test.json` (test descriptor)

Hand-authored. The directory name must equal the tool `id`. Declares how to run the
tool's tests and which feature id(s) each test verifies.

```jsonc
{
  "toolId": "mesh",
  "ecosystem": "node",                    // node | pytest | cargo | aiken | jvm | docker
  "runner": {
    "install": "npm ci",                  // preflight; failure => that tool's tests become "error"
    "command": "npx vitest run --reporter=json",
    "resultFormat": "vitest-json"         // vitest-json | pytest-json | json-lines | junit-xml | tap | aiken-json | exit-code
  },
  "tests": [
    {
      "id": "submit-tx",
      "features": ["submits-transactions", "queries-utxos"],
      "depth": "devnet",                  // devnet tests run only with --depth devnet AND TEST_DEVNET=1
      "match": "submits a transaction to the local devnet",  // maps to a native test case
      "description": "..."
    }
  ]
}
```

---

## 3. Health Check System

A Node.js script in `/scripts/health-check.ts` that runs via GitHub Actions (daily or weekly) and writes to `/data/health-results.json`.

### 3.1 Check Types

| Check Type | What it does | Applies to |
|---|---|---|
| `github-release` | Fetches latest release from GitHub API. Flags "warning" if > 6 months, "failing" if > 12 months or repo archived. | Any tool with a repo |
| `npm-package:<name>` | Fetches npm registry for version, weekly downloads. Flags if no publish in 12 months. | JS/TS tools |
| `pypi-package:<name>` | Fetches PyPI for latest version and release date. | Python tools |
| `crates-io:<name>` | Fetches crates.io for latest version and release date. | Rust tools |
| `maven-central:<group>:<artifact>` | Checks Maven Central for latest version. | Java tools |
| `docs-reachable` | HTTP HEAD to the tool's website. Flags if non-200. | All tools |
| `docker-image:<image>` | Checks Docker Hub for latest tag and pull count. | Infrastructure tools |
| `upstream-ci` | Reads the project's OWN latest CI conclusion on its default branch (GitHub check-runs, falling back to the combined commit status). Recorded in the `upstreamCi` field; informational (never changes derived health status). Also surfaced as a faint secondary hint on untested matrix cells. | Any tool with a repo |

### 3.2 Status Logic

```
if (any check is "failing") → tool status = "failing"
else if (any check is "warning") → tool status = "warning"
else if (all checks passed) → tool status = "healthy"
else → "unknown"
```

### 3.3 GitHub Actions Workflow

```yaml
# .github/workflows/health-check.yml
name: Tool Health Checks
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday 6am UTC
  workflow_dispatch: {}    # Manual trigger

jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsx scripts/health-check.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update tool health results"
          file_pattern: "data/health-results.json"
```


---

## 4. Feature Test System

Verifies that a tool's advertised features actually work, and grades the matrix.

### 4.1 Architecture

- Tests live under `/tests/<toolId>/` in the tool's **native language** (a real npm/pytest/cargo/aiken/gradle project), alongside a `tool.test.json` descriptor (§2.7) that tags each test with the feature id(s) it verifies and a `depth`.
- **Depth** separates cheap from expensive: `offline` tests need no network (compile a validator, serialize CBOR, build & balance a tx against fixed params); `devnet` tests run against a Dockerized local Cardano network (Yaci DevKit, `/tests/_devnet/`) and only when `--depth devnet` **and** `TEST_DEVNET=1`.
- `scripts/test-check.ts` discovers descriptors, routes each tool to its ecosystem runner (`scripts/test-runners/{node,pytest,cargo,aiken,jvm,docker}.ts`), runs the native runner in a subprocess, parses the output (`scripts/test-parsers.ts`), and writes `/data/test-results/<toolId>.json`. `scripts/combine-test-results.ts` merges those into `/data/test-results.json`.
- Graceful failure: a missing toolchain marks that tool's tests `error` (never crashes the run); the process exits non-zero only on real `fail`, so an unavailable devnet never red-fails offline checks.

### 4.2 Runner CLI

```bash
npx tsx scripts/test-check.ts                       # all tools, offline depth
npx tsx scripts/test-check.ts --tools mesh,aiken    # subset (CI passes changed tools)
npx tsx scripts/test-check.ts --depth all           # include devnet (requires TEST_DEVNET=1)
npx tsx scripts/combine-test-results.ts             # regenerate data/test-results.json
```

### 4.3 Split CI (`.github/workflows/feature-tests.yml`)

Structured so only tools whose tests or catalog entry changed are re-run:

- **detect** (`scripts/detect-changed-tools.ts`) diffs the change set → dynamic per-tool job matrices `offline_tools` / `devnet_tools`. A change to the harness itself → run all; schedule/dispatch → run all.
- **test-offline** — one cheap `ubuntu-latest` job per changed tool, toolchain set up by ecosystem, uploads its per-tool result artifact.
- **test-devnet** — isolated matrix that brings up the Yaci devnet via `docker compose`, runs `--depth devnet`, and uploads results. Skipped unless a devnet-touching tool changed.
- **aggregate** — downloads artifacts, runs the combine step (all committed per-tool files, so unchanged tools persist), and auto-commits `data/test-results*.json` (off-PR only).

### 4.4 Upstream CI as a secondary signal

The health harness also records each project's **own** CI conclusion (`upstreamCi`, §3). This is a maintenance signal, NOT feature verification — it can't grade individual cells and tests the author's internal code, not the published API from a consumer's view. It is surfaced as a faint hint on *untested* matrix cells (e.g. Pallas, whose cells rely on its upstream CI until we add our own tests) and never as a verified grade.

---

## 5. Pages & Routes

### 5.1 Page Map

| Route | Page | Description |
|-------|------|-------------|
| `/` | Feature Matrix (home) | Stats strip + the interactive matrix: tools as rows, features as columns. Each cell dot is graded by feature-test results (full / half / empty / untested, plus an upstream-CI hint). Filter by category and feature group. |
| `/tools` | Tool Catalog | Full searchable/filterable list. Filters: category, features, language, maturity, provider. Search by name/description. |
| `/tools/[id]` | Tool Detail | Full tool page: description, features, whenToUse/skipUntil, dependencies (visual), compatibility row (SDKs), health status, links. |
| `/health` | Health Dashboard | Status of all tools. Sortable table with last release, download counts, health status, upstream CI. CI badge. |

Removed since the original spec: `/advisor` (AI advisor), `/stacks` (recommended stacks), `/compatibility` (standalone tables — now inline on tool detail), `/dependencies` (standalone map — the dependency tree is now inline on tool detail), and `/matrix` (promoted to the home page `/`).

### 5.2 Shared Components

| Component | Used on | Description |
|---|---|---|
| `ToolCard` | `/tools` | Compact card: name, category badge, maturity badge, tagline, health indicator dot |
| `FeatureBadge` | `/tools/[id]`, `/` | Colored pill showing a feature with its group color |
| `FeatureMatrix` | `/` (home) | The graded tools × features matrix; consumes `test-results.json` + upstream-CI map |
| `DependencyTree` | `/tools/[id]` | Interactive tree showing depends-on (up) and used-by (down) |
| `CompatibilityRow` | `/tools/[id]` | Row showing which providers/languages an SDK supports |
| `HealthIndicator` | everywhere | Green/yellow/red/gray dot with tooltip |
| `SearchBar` | `/tools` | Full-text search across tool names, descriptions, features |
| `FilterPanel` | `/tools` | Category, feature, language, maturity filters |


---

## 6. Technical Implementation Notes

### 6.1 Next.js Configuration

```js
// next.config.js
module.exports = {
  output: 'export',        // fully static export
  images: { unoptimized: true },  // no image optimization server needed
  // Host on GitHub Pages, Vercel, Netlify, or any static host
}
```

### 6.2 Data Loading Pattern

All data is imported from JSON at build time:

```ts
// lib/data.ts
import toolsData from '../data/tools.json';
import categoriesData from '../data/categories.json';
import featuresData from '../data/features.json';
import compatibilityData from '../data/compatibility.json';
import healthData from '../data/health-results.json';
import testData from '../data/test-results.json';

// Type-safe accessors
export function getToolById(id: string): Tool | undefined { ... }
export function getToolsByCategory(catId: string): Tool[] { ... }
export function getToolsByFeature(featureId: string): Tool[] { ... }
export function getHealthForTool(id: string): HealthResult | undefined { ... }
export function getTestsForTool(id: string): ToolTestResult | undefined { ... }
export function getUpstreamCiByTool(): Record<string, UpstreamCiStatus> { ... }
// etc.
```

### 6.3 Static Generation

```ts
// app/tools/[id]/page.tsx
import { getToolById, getAllToolIds } from '@/lib/data';

export function generateStaticParams() {
  return getAllToolIds().map(id => ({ id }));
}

export default function ToolDetailPage({ params }: { params: { id: string } }) {
  const tool = getToolById(params.id);
  // ...render
}
```

### 6.4 Cell grading (client-safe, pure)

`lib/cell-status.ts` is a pure module (no Node imports) so it bundles into the
client-side `FeatureMatrix` as well as running during static export:

```ts
// Returns a grade for a cell the tool CLAIMS, or null when it doesn't claim the
// feature (matrix renders the dim "not offered" dot). Only pass/fail count.
export function getClaimedCellStatus(
  results: TestData, toolId: string, featureId: string, toolClaimsFeature: boolean,
): CellGrade | null { ... }  // { status: "full"|"half"|"empty"|"untested", passed, total, lastRun }
```

The home page (server component) imports `test-results.json` and passes it, plus
the `getUpstreamCiByTool()` map, as serializable props to the client `FeatureMatrix`.

### 6.5 Styling

Use Tailwind CSS with a custom theme:

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      surface: { DEFAULT: '#12121a', light: '#1a1a28' },
      border: '#2a2a3a',
      accent: '#E94560',
      // group colors for features
      'on-chain': '#E94560',
      'off-chain': '#3498db',
      'wallet': '#9b59b6',
      'low-level': '#e67e22',
      'infrastructure': '#2ecc71',
      'scalability': '#8e44ad',
      'data': '#d35400',
      'quality': '#7f8c8d',
    }
  }
}
```

Dark theme by default. Light theme optional (toggle).


---

## 7. JSON Data: Complete Tool Entries

Below are the `llmDescription`, `whenToUse`, `skipUntil`, `features`, dependency, and recommendation fields for every tool that should be in `tools.json`. This is the content that takes the most editorial effort, so I'm providing the full text for all major tools here. The developer building the site should use these verbatim as the starting data.

> **Note:** For brevity, only the content-heavy fields are shown. The structural fields (`id`, `name`, `website`, `repo`, `logo`, `category`, `languages`, `maturity`, `healthCheck`) should be filled from the previous artifact and the tool's own documentation.

---

### Smart Contract Languages

#### Aiken
- **llmDescription:** (see section 2.1 example — already complete)
- **whenToUse:** "Use when you need custom on-chain validation logic: conditional spending, escrow, DEX, lending, governance voting, or any rule beyond simple transfers."
- **skipUntil:** "Skip if your project only sends ADA, mints tokens with native scripts, or reads chain data. Many Cardano projects don't need smart contracts."
- **features:** `["compiles-to-uplc", "generates-blueprint", "plutus-v3", "property-based-testing", "lsp-support", "package-manager"]`
- **dependsOn:** `[]`
- **usedBy:** `["mesh", "lucid-evolution", "blaze", "pycardano", "cardano-client-lib"]`
- **isRecommendedDefault:** `true`
- **recommendedFor:** "Any developer who needs smart contracts, regardless of their off-chain language. Especially good for TypeScript developers pairing with Mesh or Blaze."
- **notRecommendedFor:** "Python developers who strongly prefer staying in Python (use OpShin instead). Haskell teams who want deep Plutus integration (use Plinth or Plutarch)."

#### Plinth (Plutus Tx)
- **llmDescription:** "Plinth (formerly called 'Plutus Tx') is IOG's official Haskell-based smart contract compiler for Cardano. It is a GHC compiler plugin that takes a subset of Haskell code and compiles it to UPLC. Because it uses real Haskell, developers get the full power of Haskell's type system, but it also requires a Haskell development environment (GHC, Cabal). Plinth generates CIP-57 blueprints. It supports Plutus V3 and Conway-era features. IOG is developing formal verification tooling specifically for Plinth. Plinth does NOT handle off-chain logic — pair it with Atlas, CTL, or any other SDK. The rename from 'Plutus Tx' to 'Plinth' happened in early 2025 to reduce confusion with the term 'Plutus' (which should refer only to the low-level UPLC)."
- **whenToUse:** "Use when your team is already proficient in Haskell and wants the deepest integration with Cardano's core codebase, or when you need the upcoming formal verification tooling from IOG."
- **skipUntil:** "Skip if you're not already a Haskell developer. The learning curve is steep compared to Aiken or OpShin."
- **features:** `["compiles-to-uplc", "generates-blueprint", "plutus-v3", "formal-verification"]`
- **isRecommendedDefault:** `false`
- **recommendedFor:** "Haskell developers, IOG contributors, teams requiring formal verification."
- **notRecommendedFor:** "Developers without Haskell experience. The setup overhead and learning curve is much higher than Aiken."

#### OpShin
- **llmDescription:** "OpShin is a smart contract language for Cardano whose syntax is 100% valid Python. You write contracts in normal Python files, use standard Python IDEs and linters, and OpShin compiles them to UPLC. The type system is stricter than Python's (for optimization and security), but any OpShin program is valid Python that can be run and unit-tested with standard pytest. OpShin integrates tightly with PyCardano for off-chain code — the starter kit uses Ogmios/Kupo or Blockfrost via PyCardano. OpShin compiles to Plutus V3 by default."
- **whenToUse:** "Use when you're a Python developer and want to write both on-chain and off-chain code in Python. Also good for data scientists or ML engineers entering Cardano."
- **skipUntil:** "Skip if you're not working in Python. Aiken has better tooling (LSP, package manager) and broader ecosystem support."
- **features:** `["compiles-to-uplc", "plutus-v3"]`
- **dependsOn:** `["pycardano"]`
- **isRecommendedDefault:** `true` (for Python track)
- **recommendedFor:** "Python developers who want a familiar language for smart contracts."
- **notRecommendedFor:** "Non-Python developers. Also, OpShin's generated UPLC is sometimes larger than Aiken's — for gas-sensitive production contracts, benchmark both."

#### Plutarch
- **llmDescription:** "Plutarch is a typed embedded domain-specific language (eDSL) within Haskell for writing Plutus Core validators. Unlike Plinth which compiles Haskell to UPLC via a GHC plugin, Plutarch lets you construct UPLC terms directly using Haskell as a meta-language, giving fine-grained control over the generated code. This typically produces smaller, more efficient UPLC than Plinth. Plutarch requires strong Haskell skills. It does not generate CIP-57 blueprints natively (you'd generate them separately). It is used in production by Liqwid Labs and other Cardano DeFi protocols."
- **whenToUse:** "Use when you need maximum efficiency in your on-chain code (smallest possible script size, lowest execution units) and your team is experienced in Haskell."
- **skipUntil:** "Skip unless you're an advanced Haskell developer optimizing production DeFi contracts."
- **features:** `["compiles-to-uplc", "plutus-v3", "formal-verification"]`
- **isRecommendedDefault:** `false`

#### plu-ts
- **llmDescription:** "plu-ts is a TypeScript-embedded smart contract language by Harmonic Labs. It lets you write on-chain validators AND off-chain transaction code in the same TypeScript codebase. It implements its own type system that is checked at JS runtime to produce UPLC. plu-ts is conceptually closer to Plutarch (an eDSL) than to Aiken (a standalone language). It supports CIP-30 wallet integration and has built-in transaction building capabilities, making it the only tool that covers both on-chain and off-chain in a single library."
- **whenToUse:** "Use when you want a single TypeScript codebase for both on-chain and off-chain code, and you want fine-grained control over the generated UPLC."
- **skipUntil:** "Skip for your first Cardano project — the learning curve is steeper than Aiken + Mesh, and the ecosystem/docs are smaller."
- **features:** `["compiles-to-uplc", "plutus-v3", "builds-transactions", "signs-transactions", "submits-transactions", "queries-utxos", "cip-30"]`
- **isRecommendedDefault:** `false`

#### Scalus
- **llmDescription:** "Scalus is a Scala 3 implementation of the Cardano Plutus platform. It compiles Scala 3 code to Plutus Core and runs on both JVM and JavaScript. It provides a full-stack Cardano development experience: write smart contracts, build transactions, and application logic in one language. Includes a UPLC evaluator for local testing."
- **whenToUse:** "Use when your team works in Scala or on the JVM and wants to write both on-chain and off-chain code in Scala 3."
- **skipUntil:** "Skip unless your team is already in the Scala ecosystem. Aiken + Cardano Client Lib is the more common JVM path."
- **features:** `["compiles-to-uplc", "plutus-v3", "builds-transactions", "submits-transactions"]`
- **isRecommendedDefault:** `false`

#### Helios
- **llmDescription:** "Helios is a lightweight domain-specific language that compiles to Plutus Core. It has a non-Haskell syntax influenced by JavaScript. It can be used from JavaScript/TypeScript applications. Helios is simpler and less feature-rich than Aiken but has a smaller learning curve for JS developers. Development has slowed compared to Aiken."
- **whenToUse:** "Consider if you want a very simple, JavaScript-friendly smart contract language and don't need Aiken's advanced features (package manager, LSP, property testing)."
- **skipUntil:** "Skip — Aiken is more actively maintained, better documented, and has broader community support."
- **features:** `["compiles-to-uplc", "plutus-v3"]`
- **isRecommendedDefault:** `false`

#### Marlowe
- **llmDescription:** "Marlowe is a domain-specific language for financial smart contracts on Cardano. It comes with a visual Playground editor where non-programmers can construct contracts by connecting building blocks. Marlowe is designed for finite, deterministic financial instruments: loans, escrow, swaps, insurance. It is NOT a general-purpose smart contract language. The Marlowe ecosystem includes CLI, Runtime, Runner, TypeScript SDK, and Scan (block explorer for Marlowe contracts). Marlowe contracts are interpreted by an on-chain Marlowe validator, so they don't compile to arbitrary UPLC."
- **whenToUse:** "Use when building financial instruments (loans, escrow, swaps) and you want a formally verified, auditable contract language — especially if your team includes non-programmers who can use the visual editor."
- **skipUntil:** "Skip for anything that isn't a financial contract. Marlowe is purpose-built and cannot express arbitrary logic."
- **features:** `["compiles-to-uplc", "native-scripts"]`
- **isRecommendedDefault:** `false`

---

### Off-Chain SDKs

#### Mesh SDK
- **llmDescription:** "Mesh SDK is the most feature-complete TypeScript SDK for Cardano. It provides transaction building, wallet integration (CIP-30 and CIP-95), NFT minting, staking, governance actions, and React components (@meshsdk/react). Internally it uses the Cardano Serialization Lib (CSL) and CML for CBOR encoding. It supports 7 pluggable providers: Blockfrost, Koios, Maestro, Ogmios, UTxO RPC, Yaci DevKit, and Hydra (beta). It reads CIP-57 blueprints and has built-in support for Aiken, Plinth, and Plutarch compiled artifacts. Mesh is used by hundreds of dApps and is the recommended starting point for TypeScript developers. It provides Next.js starter templates and extensive documentation at meshjs.dev."
- **whenToUse:** "Use for any TypeScript/JavaScript Cardano dApp. Especially when you want wallet connection, transaction building, and smart contract interaction with good documentation and React support."
- **skipUntil:** "You always need an off-chain SDK. Mesh is the default choice for TypeScript. You'd skip it only if you specifically need Blaze's lighter footprint or Lucid Evolution's monorepo architecture."
- **features:** `["builds-transactions", "signs-transactions", "submits-transactions", "queries-utxos", "coin-selection", "fee-estimation", "cip-30", "cip-95", "hardware-wallet", "mints-tokens", "reads-blueprint", "script-evaluation", "cbor-serialization", "native-scripts"]`
- **dependsOn:** `["csl", "cml"]`
- **optionalDeps:** `["blockfrost", "koios", "maestro", "ogmios", "utxo-rpc", "yaci-devkit", "hydra"]`
- **providers:** `["blockfrost", "koios", "maestro", "ogmios", "utxo-rpc", "yaci-devkit", "hydra"]`
- **smartContractCompat:** `["aiken", "plinth", "plutarch"]`
- **isRecommendedDefault:** `true`
- **recommendedFor:** "Most TypeScript/JavaScript developers. Largest feature set, best docs, most providers."
- **notRecommendedFor:** "Developers who want minimal bundle size or fine-grained control over dependencies (consider Blaze)."

#### Lucid Evolution
- **llmDescription:** "Lucid Evolution is the actively maintained successor to the original Lucid library. It is a TypeScript SDK reorganized as a monorepo with modular packages. It uses CML (Cardano Multiplatform Lib) for serialization instead of CSL. Supports Plutus V3, Conway-era features, and CIP-57 blueprints. Providers include Blockfrost, Koios, Maestro, and Ogmios. Used in production by major DeFi protocols: Genius Yield, Splash, Ada Markets, Meld, Summon, Strike Finance, and others. Does not include React components (unlike Mesh)."
- **whenToUse:** "Use when you prefer a modular SDK architecture, or when you're maintaining a project that already uses Lucid and want a smooth migration path."
- **skipUntil:** "Consider Mesh first if you're starting fresh — it has better documentation and React integration."
- **features:** `["builds-transactions", "signs-transactions", "submits-transactions", "queries-utxos", "coin-selection", "fee-estimation", "cip-30", "mints-tokens", "reads-blueprint", "cbor-serialization"]`
- **isRecommendedDefault:** `false`

#### Blaze
- **llmDescription:** "Blaze is a lightweight TypeScript SDK for Cardano transaction building, designed for minimal dependencies and fast iteration. It is a monorepo with built-in Blockfrost, Kupmios (Kupo+Ogmios), and Maestro providers. UTxO RPC is available as an external provider. Used in production by SundaeSwap, jpg.store, Butane, Fortuna, and Rocket. Blaze is leaner than Mesh — it does not include React components, governance tooling, or as many provider options. It focuses on doing core transaction building well."
- **whenToUse:** "Use when you want a lean, fast SDK with minimal dependencies, especially if you're experienced with Cardano and don't need hand-holding."
- **skipUntil:** "Consider Mesh first if you're a beginner or want React integration. Blaze is for developers who know what they're doing and want less abstraction."
- **features:** `["builds-transactions", "signs-transactions", "submits-transactions", "queries-utxos", "coin-selection", "fee-estimation", "cip-30", "mints-tokens", "reads-blueprint", "cbor-serialization"]`
- **providers:** `["blockfrost", "maestro", "ogmios", "utxo-rpc"]`
- **isRecommendedDefault:** `false`

#### PyCardano
- **llmDescription:** "PyCardano is a standalone Python library for creating and signing Cardano transactions. It has NO dependency on cardano-cli or external serialization tools — all CBOR encoding is implemented natively in Python. Supports Blockfrost (via BlockFrostChainContext), Ogmios (via OgmiosChainContext), Kupo (via KupoChainContextExtension), and Yaci DevKit (via pccontext library). It is OpShin's primary off-chain partner — OpShin-compiled scripts load directly as PyCardano PlutusV3Script objects. Supports native script minting, Plutus script interaction, coin selection, and fee calculation."
- **whenToUse:** "Use for any Python Cardano project. The only Python SDK with standalone serialization. Essential if you're using OpShin for on-chain code."
- **skipUntil:** "You always need an off-chain SDK. PyCardano is the default for Python."
- **features:** `["builds-transactions", "signs-transactions", "submits-transactions", "queries-utxos", "coin-selection", "fee-estimation", "mints-tokens", "cbor-serialization", "native-scripts"]`
- **providers:** `["blockfrost", "ogmios", "yaci-devkit"]`
- **smartContractCompat:** `["aiken", "plinth", "opshin", "plutarch"]`
- **isRecommendedDefault:** `true` (for Python)

#### Cardano Client Lib
- **llmDescription:** "Cardano Client Lib (CCL) is a Java SDK for Cardano by BloxBean. It follows a modular architecture: a core lib plus pluggable backend modules for Blockfrost, Koios, and Ogmios/Kupo. Each backend is a separate Maven dependency so you include only what you need. CCL supports transaction building, smart contract interaction, coin selection, minting, and account management. It works with Yaci DevKit (built by the same team) for local testing, and yaci-cardano-test provides JUnit 5 integration for automated testing."
- **whenToUse:** "Use for any Java or Kotlin Cardano project. The standard and only mature JVM SDK."
- **skipUntil:** "You always need an off-chain SDK. CCL is the default for Java."
- **features:** `["builds-transactions", "signs-transactions", "submits-transactions", "queries-utxos", "coin-selection", "fee-estimation", "mints-tokens", "cbor-serialization", "native-scripts"]`
- **providers:** `["blockfrost", "koios", "ogmios"]`
- **isRecommendedDefault:** `true` (for Java)

#### CardanoSharp
- **llmDescription:** "CardanoSharp.Wallet is a Cardano cryptographic and serialization library for .NET (C#). It provides transaction building, address derivation, key management, coin selection, and CBOR encoding in pure .NET. It supports Blockfrost and Koios as backends. It is the only .NET-native Cardano SDK."
- **whenToUse:** "Use for any .NET or C# Cardano project."
- **skipUntil:** "Only relevant if you're building in .NET."
- **features:** `["builds-transactions", "signs-transactions", "submits-transactions", "queries-utxos", "coin-selection", "mints-tokens", "cbor-serialization"]`
- **isRecommendedDefault:** `true` (for .NET)

---

### API Providers

#### Blockfrost
- **llmDescription:** "Blockfrost is the most widely used Cardano API provider. It offers a REST API that abstracts all node interaction: querying UTxOs, submitting transactions, fetching protocol parameters, account info, asset metadata, and more. Free tier available (50,000 requests/day). SDKs exist for JavaScript, Python, Go, .NET, Crystal, Kotlin, Swift, Rust, and more. Blockfrost internally uses Cardano DB Sync for its data. Almost every Cardano SDK supports Blockfrost as a provider out of the box."
- **whenToUse:** "Use as your first provider. Free tier is generous enough for development and small production apps. Easiest setup — just sign up for an API key."
- **skipUntil:** "Never skip the provider step — every dApp needs one. Blockfrost is the default."
- **features:** `["provides-query-api", "queries-utxos", "submits-transactions"]`
- **isRecommendedDefault:** `true`

#### Koios
- **llmDescription:** "Koios is a decentralized, community-operated Cardano query layer. Unlike Blockfrost (centralized, company-operated), Koios runs on multiple redundant endpoints operated by different community members. It is open-source, free to use (no API key required), and elastic. Supported by Mesh, Cardano Client Lib, and CardanoSharp. Not supported by Blaze natively."
- **whenToUse:** "Use when you want a free, decentralized API provider with no API key requirement, or when you want to avoid single-vendor dependency."
- **skipUntil:** "Consider after Blockfrost. Koios is a good production alternative for decentralization-minded projects."
- **features:** `["provides-query-api", "queries-utxos", "submits-transactions"]`
- **isRecommendedDefault:** `false`

#### Maestro
- **llmDescription:** "Maestro is a blockchain indexer, API provider, and event management system for Cardano. It offers REST APIs plus webhook-based event streams for real-time monitoring. Supported by Mesh, Lucid Evolution, Blaze, and Atlas. Maestro has its own custom indexer (not DB Sync), which enables some specialized query capabilities."
- **whenToUse:** "Use when you need event-based triggers (webhooks), specialized queries, or a premium managed provider with SLAs."
- **skipUntil:** "Use Blockfrost for development. Consider Maestro when you need advanced features or production reliability guarantees."
- **features:** `["provides-query-api", "queries-utxos", "submits-transactions", "indexes-chain"]`
- **isRecommendedDefault:** `false`

#### Ogmios
- **llmDescription:** "Ogmios is a lightweight WebSocket bridge sitting in front of a Cardano node. It translates the node's Ouroboros mini-protocols into a JSON-RPC WebSocket API. It is NOT a hosted API service — you run it yourself alongside your own Cardano node. Ogmios handles transaction submission and evaluation, protocol parameters, and ledger state queries. For UTxO queries by address/pattern, Ogmios is typically paired with Kupo. The Ogmios+Kupo combination is a self-hosted alternative to Blockfrost."
- **whenToUse:** "Use when you want to self-host your backend and avoid third-party API providers. Run Ogmios + Kupo alongside your own Cardano node."
- **skipUntil:** "Skip until you need a self-hosted setup. Blockfrost or Koios are much easier to start with."
- **features:** `["connects-to-node", "queries-utxos", "submits-transactions", "provides-query-api"]`
- **isRecommendedDefault:** `false`

---

### Indexers

#### Yaci Store
- **llmDescription:** "Yaci Store is a modular, high-performance Cardano blockchain indexer and datastore by BloxBean (same team as Cardano Client Lib). Built on top of the Yaci library, it offers a plugin framework for custom extensions. It exposes Blockfrost-compatible API endpoints, so SDKs that support Blockfrost can use Yaci Store with no code changes. It is the indexer inside Yaci DevKit."
- **whenToUse:** "Use when you need a lightweight, pluggable Java-based indexer — especially if you're already using Yaci DevKit for local development."
- **skipUntil:** "Skip unless you need to run your own indexer. Most devs use API providers instead."
- **features:** `["indexes-chain", "provides-query-api", "blockfrost-compat-api"]`
- **isRecommendedDefault:** `false`

#### Kupo
- **llmDescription:** "Kupo is a lightweight, configurable chain-index for Cardano. Unlike full indexers like DB Sync (which index everything), Kupo lets you specify patterns to match (specific addresses, policy IDs, etc.) so it only stores what you need. This makes it very fast and resource-efficient. Kupo is typically paired with Ogmios to provide a complete self-hosted backend: Ogmios for tx submission/evaluation, Kupo for UTxO queries."
- **whenToUse:** "Use alongside Ogmios when you're self-hosting and only need data for specific addresses or policies. The Ogmios+Kupo combination is the standard self-hosted backend."
- **skipUntil:** "Skip until you need a self-hosted setup. Blockfrost indexes everything for you."
- **features:** `["indexes-chain", "queries-utxos", "provides-query-api"]`
- **isRecommendedDefault:** `false`

---

### Local Development

#### Yaci DevKit
- **llmDescription:** "Yaci DevKit provides a complete local Cardano development environment that can be created and destroyed in seconds. It runs a local Cardano node, Yaci Store indexer, and a web-based viewer. It supports sub-second block times (down to 100ms) for ultra-fast iteration. It exposes Blockfrost-compatible API endpoints, so any SDK that supports Blockfrost (Mesh, Cardano Client Lib, Lucid Evolution, etc.) can connect to Yaci DevKit with zero configuration changes — just point the provider URL to localhost. Available as Docker, ZIP, or NPM distribution. It also integrates Ogmios and Kupo for SDKs that use those backends."
- **whenToUse:** "Use from day one of development. Spin up a local devnet instead of using the public testnet — it's faster, free, resetable, and doesn't require waiting for block confirmations."
- **skipUntil:** "Never skip — local development is essential for productive iteration."
- **features:** `["local-devnet", "connects-to-node", "indexes-chain", "provides-query-api", "submits-transactions", "blockfrost-compat-api"]`
- **isRecommendedDefault:** `true`

---

## 8. Guiding Principles for the Builder

1. **JSON is the source of truth.** Every page reads from JSON. If you want to change a tool's description, edit the JSON, not a component.

2. **Verification is the differentiator.** A cell is `full` only because a real test exercised that feature and passed. Never conflate "claimed" with "verified": untested cells must look untested, and an upstream-CI hint is never a verified grade.

3. **Mobile-first.** New developers often explore on their phones. The feature matrix must work on mobile (horizontal scroll is fine).

4. **The matrix is the front door.** The home page IS the graded matrix — what a tool *verifiably does*, at a glance. The full catalog is one click away for power users.

5. **Health checks build trust.** When a tool shows a green dot, it means we verified recently that it's actively maintained (release recency, registry presence, its own CI). This is critical for a community that has been burned by abandoned tools.

6. **Cross-tool answers in one glance.** "Does Blaze work with Koios?" should be answerable instantly (compatibility row on the tool page), not after 30 minutes of reading GitHub READMEs.

7. **Tests are cheap to add and hard to fake.** Adding a tool's verification is just dropping a `tests/<toolId>/` project — no app code changes. CI only re-runs what changed, so coverage grows incrementally without ballooning compute.

8. **Keep the data fresh.** The JSON files should be easy to update via PRs. Consider a CONTRIBUTING.md that explains how to add a tool: fork, add entry to tools.json, submit PR.

---

## 9. File Structure

```
cardano-toolcheck/
├── app/
│   ├── layout.tsx                 # Root layout, nav, footer
│   ├── page.tsx                   # Home = Feature Matrix
│   ├── globals.css                # Tailwind theme (incl. --color-fail token)
│   ├── tools/
│   │   ├── page.tsx               # Tool catalog
│   │   └── [id]/page.tsx          # Tool detail (inline compatibility + dependency tree)
│   └── health/page.tsx            # Health dashboard
├── components/
│   ├── FeatureMatrix.tsx          # Graded tools × features matrix (home)
│   ├── DependencyTree.tsx         # Inline on tool detail
│   ├── CompatibilityRow.tsx       # Inline on tool detail (SDKs)
│   ├── ToolCard.tsx  FeatureBadge.tsx  HealthIndicator.tsx  SearchBar.tsx  FilterPanel.tsx
│   ├── ToolCatalog.tsx  HealthTable.tsx  LanguageLogo.tsx  badges.tsx
│   └── Navigation.tsx  SiteFooter.tsx
├── lib/
│   ├── data.ts                    # JSON loaders + typed accessors
│   ├── types.ts                   # TypeScript interfaces for all data
│   └── cell-status.ts             # Pure (client-safe) matrix cell grading
├── data/
│   ├── tools.json  categories.json  features.json  compatibility.json
│   ├── health-results.json        # written by health-check (CI) — not hand-edited
│   ├── test-results.json          # aggregate, written by combine step (CI)
│   └── test-results/<toolId>.json # per-tool, written by the test harness (CI)
├── tests/
│   ├── _devnet/                   # docker compose + wait-ready.sh (Yaci devnet)
│   ├── aiken/  mesh/  pycardano/  # native test projects + tool.test.json
├── public/logos/                  # Tool logos
├── scripts/
│   ├── health-check.ts            # health + upstream CI (CI)
│   ├── test-check.ts              # feature-test orchestrator
│   ├── test-parsers.ts            # native output → cases
│   ├── test-runners/              # node, pytest, cargo, aiken, jvm, docker, generic, util, types
│   ├── combine-test-results.ts    # per-tool files → data/test-results.json
│   └── detect-changed-tools.ts    # dynamic CI job matrix
├── .github/workflows/
│   ├── health-check.yml
│   └── feature-tests.yml          # detect → offline / devnet → aggregate
├── next.config.ts  tsconfig.json  eslint.config.mjs  package.json  README.md
```

> Removed vs. the original spec: `lib/prompt-builder.ts`, `components/ChatInterface.tsx`, `components/DependencyMap.tsx`, `data/stacks.json`, and the `/advisor`, `/stacks`, `/compatibility`, `/dependencies` routes (and the standalone `/matrix` route, now the home page).
