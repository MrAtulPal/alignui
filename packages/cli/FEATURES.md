# @alignui/cli Features (Status)

CLI is the first adapter on top of `@alignui/core`. It is responsible for:

- fetching/extracting expected tokens (Figma or local)
- collecting actual computed styles (browser automation)
- producing reports and exit codes (CI-friendly)

## Done

- Project skeleton and `alignui scan` command stub (`src/index.ts`, `src/commands/scan.ts`)

## Remaining (CLI)

### A) Config + Input

- Support a config file format (JSON first) and consistent lookup (`--config`, default `.alignui.json`).
- Validate config using core: `validateScanConfig()` + `lintRules()`.
- Support token input modes:
  - `--tokens <tokens.json>` using `validateTokenMap()` + `resolveTokenMap()`
  - `tokens --figma-file <key> [--figma-token <token>]` to extract tokens from Figma Variables API
  - Note: Figma Variables REST API requires the `file_variables:read` scope. Some accounts/orgs only expose `file_content:read`, which causes `403` on `/v1/files/:key/variables/local` even for full-seat users.
  - Fallback (needed): token extraction from non-Variables sources (Figma Styles or a token sheet frame) when Variables API is unavailable.

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
