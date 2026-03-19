# @designlatch/cli Features (Status)

CLI is the first adapter on top of `@designlatch/core`. It is responsible for:

- loading expected tokens (manual `tokens.json`)
- collecting actual computed styles (browser automation)
- producing reports and exit codes (CI-friendly)

## Done

- Project skeleton and `designlatch scan` command stub (`src/index.ts`, `src/commands/scan.ts`)
- Collect supports per-rule `steps` plus `collect.reloadPage` / `rules[].reloadPageBefore` for SPA flows

## Remaining (CLI)

### A) Config + Input

- Support a config file format (JSON first) and consistent lookup (`--config`, default `.designlatch.json`).
- Validate config using core: `validateScanConfig()` + `lintRules()`.
- Support token input modes:
  - `--tokens <tokens.json>` using `validateTokenMap()` + `resolveTokenMap()`
  - (v1) Figma extraction is intentionally out of scope. Use a manual `tokens.json`.

### B) Browser Style Collection (Playwright Adapter)

- Implement a collector that returns `StyleSnapshot[]`:
  - open `config.url` (or `--url`)
  - for each rule selector, query element and call `getComputedStyle`
  - capture required properties only (from the rule set)
  - handle missing selectors deterministically (reportable as missing computed)
- Add runtime options:
  - `--headed/--headless`, `--timeout`, `--wait-for <selector>`, `--device <preset>`

### C) Scan Pipeline

- Full scan flow (single entrypoint):
  - load config
  - load/resolve tokens
  - collect snapshots
  - `compare()` -> `evaluate()` -> exit codes
- Print a readable console summary:
  - score + pass/fail reasons
  - top failures using `topFailures()`

### D) Reporting + Artifacts

- Write `report.json` (always).
- Optional HTML report generation (keep dependency-light).
- Optional baseline support:
  - `--baseline <report.json>` to run `diffReports(baseline, current)`
  - write `diff.json` and show changed/introduced failures

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
