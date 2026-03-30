# DesignLatch CLI Reference

This is the canonical documentation for the file-based DesignLatch CLI adapter. It explains why each command exists, what flags it accepts, how the input files are structured, which outputs it produces, and how the pieces interact.

DesignLatch splits responsibilities into layers:

- `@designlatch/core`: pure comparison logic (`ScanConfig`, tokens, evaluations).
- `@designlatch/app`: shared workflows (`validateInputs`, `scanCompliance`, helpers for reports).
- `@designlatch/cli`: CLI entrypoint, config loading, Playwright collection, report generation.

Use the CLI when you want file-based workflows, Playwright-powered snapshot collection, and local HTML/JSON reports.

## Command Reference

All commands respect `--config <path>`, which takes either:

- a JSON file (`.designlatch.json` by default)
- a directory containing multiple `.json` files (e.g., `test_components`), which are merged alphabetically. `rules` arrays concatenate, and the first file provides `url`, `thresholds`, and `defaults`.

### `init`

- **Purpose:** bootstrap the workspace with starter config/tokens/snapshots plus a `designlatch/` folder so you can explore the flow.
- **Flags:** `--config <path>` overrides `.designlatch.json`. `--force` overwrites existing artifacts.
- **Action:** writes `.designlatch.json`, `designlatch/tokens.json`, `designlatch/snapshots.json`, and the `designlatch/` directory if missing.
- **Why it exists:** speeds up onboarding with a complete minimal configuration that already passes.

### `collect`

- **Purpose:** use Playwright to visit `config.url`, exercise selectors, and capture computed styles for each configured rule.
- **Flags:**
  - `--config <file|dir>` (default `.designlatch.json`)
  - `--url <url>` overrides `config.url`
  - `--out <path>` writes snapshots (defaults to `designlatch/snapshots.json`)
  - `--wait-for <selector>` waits for a DOM element before collecting
  - `--timeout-ms <ms>` sets Playwright’s default timeout (30_000)
  - `--headed` runs the browser in headed mode
- **Steps:** rules can declare `steps[]`, `reloadPageBefore`, and there is a global `collect.reloadPage` toggle. Supported step types are `click`, `hover`, `focus`, `type`, `press`, `scrollIntoView`, `waitForSelector`, and `waitForTimeout`. Each step manipulates Playwright’s `Page` before reading `getComputedStyle`.
- **Outputs:** writes `StyleSnapshot[]` JSON with `selector`, `url`, optional `text`, and `computed` property map.
- **Why it exists:** collects the “actual” styles from your running product against which tokens are validated.

### `validate`

- **Purpose:** run `validateInputs` from `@designlatch/app` to ensure your config, tokens, and snapshots are well-formed before doing a full scan.
- **Flags:** `--config`, `--tokens <path>`, `--snapshots <path>`, optional `--url` override.
- **Action:** loads the three files, runs schema validation (`validateScanConfig`, token map checks, snapshot shape), and logs counts plus lint warnings.
- **Why it exists:** quick sanity check with zero score/report generation and without running Playwright.

### `scan`

- **Purpose:** execute the full compliance pipeline, compare tokens to snapshots, score results, and emit JSON/HTML reports.
- **Flags:**
  - `--config`
  - `--tokens <path>` (required)
  - `--snapshots <path>` (required)
  - `--report-dir <dir>` emits HTML/JSON to a directory (defaults to `report` unless `--out` is set)
  - `--out <path>` writes JSON report when `--report-dir` is omitted
  - `--baseline <path>` + `--diff-out <path>` to diff against a previous report
  - `--url <url>` overrides `config.url`
  - `--serve` is implicit when `serveReport` is true; control it with `--no-serve`, `--no-open`, `--host`, and `--port` if you need to open the HTML report automatically
- **Outputs:** writes `report/report.json` and `report/index.html` (unless `--report-dir` is disabled) plus optional diff metadata.
- **Why it exists:** produce actionable scores (pass/fail), HTML reporting, and artifacts for CI.

### `serve`

- **Purpose:** host a generated report directory or a specific HTML file.
- **Flags:** `--report-dir <dir>` (default `report`), `--file <path>`, `--host <host>`, `--port <number>`, `--no-open`.
- **Why it exists:** preview the HTML compliance report locally without re-running `scan`.

## Flag Matrix

- `--config <path>`: file or directory (see config schema below)
- `--tokens <tokens.json>`: absolute or relative path to your token map (required for `scan` and `validate`)
- `--snapshots <snapshots.json>`: snapshot file produced by `collect` (required for `scan` and `validate`)
- `--url <url>`: overrides the URL the config targets
- `--out <path>`: alternate JSON output location for `scan`
- `--report-dir <dir>`: directory to place `report.json` + `report/index.html`
- `--baseline <report.json>`: compare the current report against a saved baseline
- `--diff-out <diff.json>`: path to write baseline diff metadata
- `--wait-for <selector>`: delay collection until this selector exists
- `--timeout-ms <ms>`: Playwright timeout
- `--headed`: run Playwright in headed mode
- `--no-open`: don’t auto-open the report when using `scan` or `serve`
- `--no-serve`: skip the report server after `scan`
- `--host`, `--port`: control the report server binding
- `--force`: for `init`, overwrite existing files

## Config Schema (`.designlatch.json` or directory)

- `url` (string): homepage/entrypoint visited by `collect` and reported in `scan`.
- `rules` (array of objects): the heart of your expectations.
  - `id`: unique identifier per rule (used in reports).
  - `selector`: CSS selector targeting the element to evaluate.
  - `properties`: map of CSS property keys to expectations.
    * `token`: key from `tokens.json`.
    * `tolerance` (optional): `{ kind: "px" | "rgba" | "ratio"; value: number }`. The `default` tolerance for the config applies when omitted.
    * `severity`: `"error"` (default) or `"warn"`.
  - `reloadPageBefore` (optional boolean): reload the page before evaluating this rule.
  - `steps` (optional array): Playwright actions executed before computing the rule (see collect step types below).
  - `defaults` (optional): overrides for `severity`/`tolerance` that apply to the rule’s properties.
- `defaults` (optional): `severity` and `tolerance` defaults that inherit into every rule unless overridden.
- `thresholds` (optional):
  - `minScore`: required minimum score (0–100).
  - `failOnSeverity`: `"error"` or `"warn"` to fail on the corresponding severity.
  - `failOnUnmatchedSelectors`, `failOnMissingTokens`, `failOnMissingComputed`: booleans that convert missing data into failures.
- `collect` (optional object for `collect`):
  - `reloadPage` (boolean) reloads the page before every rule unless overridden by the rule.

### Collect Step Types

- `click`, `hover`, `focus`: target a selector before taking measurements.
- `type`: `{ selector, text }`
- `press`: `{ selector, key }`
- `scrollIntoView`: scrolls an element into view.
- `waitForSelector`: pauses until the selector exists.
- `waitForTimeout`: pauses for `ms` milliseconds.

Use `steps` when your UI requires navigation, state changes, or other interactions prior to measurement. The CLI runs steps validators defined in `packages/cli/src/commands/collect.ts`, so invalid step shapes fail with helpful errors.

## Tokens (`tokens.json`)

- Structure: `Record<string, TokenValue>` where `TokenValue` is one of:
  - `{ kind: "color"; rgba: { r, g, b, a } }`
  - `{ kind: "number"; value: number; unit: "px" | "ratio" }`
  - `{ kind: "string"; value: string }`
  - `{ kind: "box"; unit: "px"; top: number; right: number; bottom: number; left: number }`
  - `{ kind: "ref"; token: string }` (references another token)
- Purpose: provide the “expected” design values that every rule’s `properties[token]` key references.
- Naming tip: stable keys like `color.primary`, `space.md`, and `font.weight` keep reports readable.
- CLI ingest: `scan` and `validate` pass this map directly into `scanCompliance`/`validateInputs` where tokens are resolved and compared.

## Snapshots (`snapshots.json`)

- Output of `collect`.
- Each entry is:
  - `selector`: repeated selector from config.
  - `url`: page URL when collected (useful for multi-environment checks)
  - `computed`: map of CSS properties captured from `getComputedStyle`.
  - `text` (optional): trimmed `textContent`.
- The CLI feeds snapshots into the comparison engine unchanged.

## Report Generation

- `scan` writes:
  - `report/report.json`: canonical JSON report with `results`, `summary`, and metadata.
  - `report/index.html`: minified compliance dashboard (served by `serve`).
- `reportDir` defaults to `report/`; `--out` writes plain JSON elsewhere when you skip HTML.
- `serve` hosts the `report/index.html` (or `--file`) so you can review failures visually.
- `baseline` + `diff-out` allow you to compare `scan` results over time; the CLI uses `diffReports` to compute score deltas.

## Tips & Suggestions

1. Organize split configs in a folder named after the UI area (e.g., `test_components/buttons.test.json`) and run `npx designlatch scan --config test_components` to merge them automatically.
2. Always run `npx designlatch validate` before `collect`/`scan` to catch schema issues early.
3. Use `steps` to interact with dynamic components and `reloadPageBefore` if stateful components sometimes cache stale styles.
4. Consider injecting `thresholds.failOnMissingTokens` when you want token coverage audit.
5. Document your tokens in `designlatch/tokens.json` with inline comments (outside JSON) or a companion Markdown file so teammates understand each key.
6. If you need JSON-only automation (no HTML report), use `--report-dir` toggles plus `--no-serve` to keep the CLI headless.

For MCP-specific workflows, see the MCP docs in the root of the repo.
