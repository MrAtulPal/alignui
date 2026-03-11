# @alignui/core Features (Status)

This package is intentionally browser- and Figma-agnostic. It contains pure data models and comparison logic that can be reused by future adapters (CLI, GitHub Action, SaaS) without changes.

## Done

### 1) Domain Types (`src/domain/types.ts`)

Defines stable contracts used across the system:

- `TokenMap` / `TokenValue`: normalized token storage for comparisons.
  - `color`: RGBA (design tokens normalized into channel values)
  - `number`: numeric values with unit (`px`, unitless `ratio`)
  - `box`: box model values (`top/right/bottom/left` in `px`)
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
- `parseCssPxList()`: parses space-separated px lists (e.g., `8px 8px 0px 0px`).
- `parseCssUnitlessNumber()`: parses unitless numbers (e.g., `1.25`).
- `normalizeFontFamilyList()`: normalizes a computed `font-family` list into lowercase tokens.
- `parseCssBoxPx()`: parses CSS 1-4 value px shorthands into `{top,right,bottom,left}` (for padding/margin).

Why: shared by compare and any future heuristics; keeping it isolated avoids coupling.

### 3) Box Shorthand Parser (`src/utils/box.ts`)

Parses CSS 1-4 value shorthands (e.g., `padding`, `margin`) into a box model:

- `parseCssBoxPx("10px 16px") -> { top: 10, right: 16, bottom: 10, left: 16 }`

Why: enables deterministic spacing checks without screenshot diffs.

### 4) Comparison Engine (`src/engine/compare.ts`)

Core algorithm that generates a `ScanReport` from:

- `TokenMap` (expected values)
- `StyleSnapshot[]` (actual computed values by selector)
- `Rule[]` (what to compare)

Supports:

- Color comparisons with optional `rgba` tolerance (max channel delta).
- `px` number comparisons with optional `px` tolerance.
- `px` comparisons against multi-value shorthands (e.g., computed `border-radius` lists).
- `ratio` number comparisons (unitless computed values, useful for `line-height`).
- Box-model comparisons via `box` tokens (e.g., compare `padding` / `margin` shorthands).
- String comparisons with font-family fallback list matching.
- Rich summary counters: `errorFailed`, `warnFailed`, `unmatchedSelectors`, `missingTokens`, `missingComputed`.

Why: the engine stays pure so it can run in any environment (Node, server, CI).

### 5) Report Evaluation (`src/engine/evaluate.ts`)

Separates policy from comparison by taking a `ScanReport` and `Thresholds` and returning:

- `pass: boolean`
- `reasons: string[]` (human-readable, stable for CI logs)

Why: compare produces facts; evaluate decides gating policy. This prevents CLI/SaaS from re-implementing fail logic.

### 6) Token Reference Resolver (`src/tokens/resolve.ts`)

Resolves `TokenValue.kind = "ref"` chains:

- Resolves multi-hop references into a final value when possible.
- Detects cycles and reports them as errors.
- Reports missing references and keeps unresolved refs intact (so callers can decide behavior).

Why: Figma variables and design systems commonly use aliasing; resolving in core keeps adapters simpler.

### 7) Runtime Config Validation (`src/config/validate.ts`)

Dependency-free validation for `ScanConfig` inputs:

- `validateScanConfig(input: unknown)` returns a typed config or structured errors with JSON paths.

Why: adapters can fail fast with actionable messages before running expensive scans.

### 8) Rule/Token Linting (`src/config/lint.ts`)

Optional lint pass to catch common configuration mistakes:

- Duplicate rule ids, duplicate selector+property mappings.
- Suspicious token keys and tolerance-vs-token-kind mismatches (when `TokenMap` is available).

Why: keeps `validate` strict-but-simple, while `lint` provides higher-level diagnostics.

### 9) TokenMap Validation (`src/tokens/validate.ts`)

Dependency-free validation for `TokenMap` inputs:

- `validateTokenMap(input: unknown)` returns a typed token map or structured errors with JSON paths.

Why: adapters can validate extracted tokens (from Figma, etc.) before running comparisons.

### 10) Report Utilities (`src/report/utils.ts`)

Deterministic helpers for rendering and CI stability:

- Stable result sorting and grouping (`by selector`, `by ruleId`).
- Failure filtering and `topFailures()` ranking.

Why: CLI/HTML/PDF renderers should not re-implement report logic.

### 11) Report Diff Utilities (`src/report/diff.ts`)

Compares two `ScanReport`s (baseline vs current) using stable check identity:

- Categorizes changes: `added`, `removed`, `becameFail`, `becamePass`, `changed`, `unchanged`.

Why: enables trend/regression reporting without screenshot diffs.

### 12) Weighted Scoring (`src/report/score.ts`)

Computes weighted compliance scores from a list of results:

- `computeWeightedScore(results, weights)` supports weights by severity, ruleId, and property.

Why: lets enterprise users tune “what matters” without forking the compare engine.

### 13) Token Key Helpers (`src/tokens/path.ts`)

Token key utilities:

- `isValidTokenKey()`, `splitTokenKey()`, `joinTokenKey()`.

Why: makes config parsing/linting safer and consistent across modules.

### 14) Unit Tests (Jest)

Coverage currently includes:

- Compare behavior for color/px/ratio/string cases and missing data.
- Normalize parsing behavior.
- Token reference resolution (happy path, missing refs, cycles).
- Runtime config validation and linting.
- Report grouping/sorting utilities.

Tests live alongside modules:

- `src/engine/compare.test.ts`
- `src/utils/normalize.test.ts`
- `src/utils/box.test.ts`
- `src/tokens/resolve.test.ts`
- `src/tokens/validate.test.ts`
- `src/config/validate.test.ts`
- `src/config/lint.test.ts`
- `src/report/utils.test.ts`
- `src/report/diff.test.ts`
- `src/report/score.test.ts`
- `src/tokens/path.test.ts`

## Remaining (Core)

This section tracks enhancements that can be added without changing adapter code.

### A) Token Model Expansion

- Add `unit: "percent" | "em" | "rem"` (or normalize to px in adapters).
- Add structured typography tokens (font family + size + weight + line-height) as first-class helpers.
- Add an optional `category` field on rules/results (typography/color/spacing/layout) for standardized scoring and reporting.

Reason: reduces boilerplate rule definitions and improves consistency across checks.

### B) More Comparators

- `lineHeight`: support `%` and `px` (and optional adapter normalization between units).
- `spacing`: first-class support for `gap`, `row-gap`, `column-gap` and side-specific checks (`paddingTop`, `marginLeft`, etc.).
- `borderRadius`: support mixed units (e.g., `%`) and elliptical syntax (`a/b`).
- `boxShadow`/`effect`: basic parsing for common cases (optional).
- `color`: support additional computed color formats where needed (future-proofing).

Reason: common UI compliance needs beyond `color` and `fontSize`.

### C) Better Scoring Policy

- Category-based scoring (typography/color/spacing/layout) derived from rule metadata.
- Configurable `fail fast` and per-category thresholds.
- Standard severity gates (fail on warn vs fail on error) as a single preset.

Reason: weighted scoring exists; this adds standardized scoring semantics without duplicating policy in adapters.


### D) Quality/Hardening

- Improve diff equality for `expected` values (avoid `JSON.stringify` comparisons).
- Reduce `ts-jest` noise (TS151002) by aligning tsconfig/Jest settings.

## Remaining (Adapters, Not Core)

These are intentionally out of `@alignui/core` and belong in CLI/SaaS layers:

- Figma API fetching + token extraction.
- Browser automation + computed-style capture (Playwright).
- Component-to-DOM mapping strategies (selectors, `data-*`, conventions, heuristics).
- HTML/PDF report rendering.
