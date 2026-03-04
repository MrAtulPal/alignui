# @alignui/cli Features (Status)

CLI is the first adapter on top of `@alignui/core`. It is responsible for:

- fetching/extracting expected tokens (Figma or local)
- collecting actual computed styles (browser automation)
- producing reports and exit codes (CI-friendly)

## Done

- Project skeleton and minimal `alignui` help UI (`src/index.ts`)
- Config file support (JSON) with consistent lookup (`--config`, default `.alignui.json`)
- Validate config using core: `validateScanConfig()` + `lintRules()` (`alignui validate`)
- Token input modes:
  - `--tokens <tokens.json>` using `validateTokenMap()` + `resolveTokenMap()`
  - `alignui tokens --figma-file <key> [--figma-token <token>]` (Figma Variables API)
- Browser style collection (Playwright): `alignui collect` writes snapshots JSON
- Scan pipeline: `alignui scan` (tokens + snapshots) -> `report.json` + exit codes
- Baseline diff support: `--baseline` + `--diff-out`
- Design mapping helpers (plugin export fallback):
  - `alignui design ls --in report.json ...` to list `figmaPath` arrays
  - `alignui scan --design report.json` to compare `{ design: true }` properties against the plugin-exported node tree

## Remaining (CLI)

### A) Config + Input

- Fallback token extraction/import when Variables API is unavailable:
  - Import from plugin exports (fills/typography/spacing) into `tokens.json`, or
  - Extract from Figma file content API (styles) if available.
- `alignui design validate` / `alignui scan` preflight helpers:
  - Detect ambiguous `figmaPath` matches and print candidate disambiguations.

### B) Browser Style Collection (Playwright Adapter)

- Device emulation presets (`--device`) and auth flows (cookies/storageState).

### C) Scan Pipeline

- Optional: support running `scan` without snapshots by collecting on-the-fly (single command workflow).

### D) Reporting + Artifacts

- Optional HTML report generation (keep dependency-light).
- Optional: write a deterministic `summary.json` for CI annotations.

### E) Packaging + DX

- `npm run build` builds CLI and core.
- `npm pack` / publish-ready `bin` wiring (later).
- Structured logging (`--json-log` optional) and consistent error messages.
- Add a small `examples/` folder with sample config + sample tokens.

### F) Tests (CLI)

- Unit tests for:
  - config loading + validation errors
  - snapshot collection (mocked Playwright)
  - pipeline exit codes
  - design tree parsing + `figmaPath` resolution failures surfaced at CLI level
