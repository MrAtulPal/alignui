# @alignui/core Features (Status)

This package is intentionally browser- and Figma-agnostic. It contains pure data models and comparison logic that can be reused by future adapters (CLI, GitHub Action, SaaS) without changes.

## Done

### 1) Domain Types (`src/domain/types.ts`)

Defines stable contracts used across the system:

- `TokenMap` / `TokenValue`: normalized token storage for comparisons.
  - `color`: RGBA (design tokens normalized into channel values)
  - `number`: numeric values with unit (v1 supports `px`)
  - `string`: raw string values (e.g., font family)
  - `ref`: token alias/reference (for variable indirection)
- `Rule`: selector + property-to-token mapping + tolerance + severity.
- `StyleSnapshot`: adapter-provided computed style capture for a selector.
- `ScanReport`: deterministic output schema with totals, score, and failure breakdown.
- `Thresholds` / `Evaluation`: evaluation inputs and outputs.

Why: Keeping these types stable lets us add new adapters and features without breaking data flow.

### 2) Normalization Utilities (`src/utils/normalize.ts`)

Reusable parsers/normalizers for converting runtime CSS strings into comparable values:

- `parseCssColor()`: parses `rgb()`, `rgba()`, hex (`#rgb/#rgba/#rrggbb/#rrggbbaa`), and `transparent`.
- `normalizeRgbaToBytes()`: normalizes RGBA into byte-scale channels (alpha converted to 0..255).
- `parseCssPx()`: parses `NNpx` values.
- `normalizeFontFamilyList()`: normalizes a computed `font-family` list into lowercase tokens.

Why: This logic is shared across compare, future screenshot diff, and future heuristics. Keeping it isolated avoids coupling.

### 3) Comparison Engine (`src/engine/compare.ts`)

Core algorithm that generates a `ScanReport` from:

- `TokenMap` (expected values)
- `StyleSnapshot[]` (actual computed values by selector)
- `Rule[]` (what to compare)

Supports:

- Color comparisons with optional `rgba` tolerance (max channel delta).
- `px` number comparisons with optional `px` tolerance.
- String comparisons with font-family fallback list matching.
- Rich summary counters:
  - `errorFailed`, `warnFailed`
  - `unmatchedSelectors`, `missingTokens`, `missingComputed`

Why: The engine stays pure so it can run in any environment (Node, server, CI).

### 4) Report Evaluation (`src/engine/evaluate.ts`)

Separates policy from comparison by taking a `ScanReport` and `Thresholds` and returning:

- `pass: boolean`
- `reasons: string[]` (human-readable, stable for CI logs)

Why: Compare produces facts; evaluate decides gating policy. This prevents CLI/SaaS from re-implementing fail logic.

### 5) Token Reference Resolver (`src/tokens/resolve.ts`)

Resolves `TokenValue.kind = "ref"` chains:

- Resolves multi-hop references into a final value when possible.
- Detects cycles and reports them as errors.
- Reports missing references and keeps unresolved refs intact (so callers can decide behavior).

Why: Figma variables and design systems commonly use aliasing; resolving in core keeps adapters simpler.

### 6) Unit Tests (Jest)

Coverage currently includes:

- Compare behavior for color/px/string cases and missing data.
- Normalize parsing behavior.
- Token reference resolution (happy path, missing refs, cycles).

Tests live alongside modules:

- `src/engine/compare.test.ts`
- `src/utils/normalize.test.ts`
- `src/tokens/resolve.test.ts`

## Remaining (Core)

### A) Token Model Expansion

- Add `unit: "percent" | "em" | "rem"` or normalize to px in adapters.
- Add structured typography tokens (font family + size + weight + line-height) as first-class helpers.

Reason: reduces boilerplate rule definitions and improves consistency across checks.

### B) More Comparators

- `lineHeight`: support unitless and `%` (adapter may convert to px when possible).
- `spacing`: support shorthand parsing (`padding`, `margin`) and `gap`.
- `borderRadius`: support multi-value parsing (`8px 8px 0 0`).
- `boxShadow`/`effect`: basic parsing for common cases (optional).

Reason: these are common UI compliance needs beyond `color` and `fontSize`.

### C) Config Schema Validation (Runtime)

- Add runtime validation helpers (likely via `zod`) for:
  - Rule structure
  - Thresholds
  - Token map shapes

Reason: catch misconfig early with actionable errors; keep CLI thin.

### D) Report Utilities

- Stable sorting/grouping helpers (by selector, ruleId, category).
- Optional “diff” utilities (compare two reports).

Reason: makes HTML/PDF reporting and trend comparisons consistent across products.

### E) Deterministic Scoring Weights

- Allow weighted scoring per category/property/severity.
- Expose a stable scoring config contract.

Reason: enterprise usage often requires weights and policy tuning without code changes.

## Remaining (Adapters, Not Core)

These are intentionally out of `@alignui/core` and belong in CLI/SaaS layers:

- Figma API fetching + token extraction.
- Browser automation + computed-style capture (Playwright).
- Component-to-DOM mapping strategies (selectors, `data-*`, conventions, heuristics).
- HTML/PDF report rendering.

