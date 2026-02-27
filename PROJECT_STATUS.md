# AlignUI Project Status (Core + CLI)

This file tracks what has been implemented so far in this repo and how to run it locally.

## Current Shape

- `packages/core`: reusable compliance engine (no browser/Figma dependencies)
- `packages/cli`: CLI adapter that wires inputs -> core engine -> reports

## Core (Implemented)

- Domain models: tokens, rules, snapshots, reports, thresholds
- Normalization/parsing:
  - CSS colors (`rgb/rgba/hex/transparent`)
  - `px`, `px` lists (e.g., `border-radius` shorthands), unitless ratios (e.g., `line-height`)
  - box shorthands (1-4 value `padding/margin` -> top/right/bottom/left)
- Engine:
  - `compare()` with tolerance support (`rgba`, `px`, `ratio`)
  - `evaluate()` to convert report -> pass/fail + reasons
- Config/tokens:
  - `validateScanConfig()` + `lintRules()`
  - `validateTokenMap()` + `resolveTokenMap()` (token references + cycle detection)
- Reporting utilities:
  - deterministic sorting/grouping + `topFailures()`
  - `diffReports()` (baseline vs current)
  - `computeWeightedScore()` (optional weighted scoring)
- Unit tests in Jest for all of the above

## CLI (Implemented)

CLI is intentionally minimal (no REPL).

### Commands

- `alignui` (no args): prints a minimal help screen
- `alignui init [--config <path>] [--force]`
  - creates `.alignui.json` (default) and templates:
    - `alignui/tokens.json`
    - `alignui/snapshots.json`
- `alignui validate --config <path> --tokens <tokens.json> --snapshots <snapshots.json> [--url <url>]`
  - validates config + lints rules
  - validates tokens + resolves token refs
  - validates snapshots JSON shape
- `alignui scan --config <path> --tokens <tokens.json> --snapshots <snapshots.json> [--url <url>] [--out <report.json>] [--baseline <report.json>] [--diff-out <diff.json>]`
  - runs `compare()` + `evaluate()` and writes JSON report
  - prints score + reasons + top failures on failure
  - optional baseline diff output
- `alignui collect --config <path> --url <url> [--out <snapshots.json>] [--wait-for <selector>] [--timeout-ms <ms>] [--headed]`
  - uses Playwright to open the URL and collect computed styles for the selectors/properties in config rules
  - writes a `snapshots.json` file compatible with `alignui scan`

## Quick Start

1) Build:
```powershell
npm -ws run build
```

2) See CLI home screen:
```powershell
node packages/cli/dist/index.js
```

3) Scaffold templates:
```powershell
node packages/cli/dist/index.js init --force
```

4) Collect snapshots from a live URL:
```powershell
node packages/cli/dist/index.js collect --config .alignui.json --url https://app.example.com --out alignui/snapshots.json --wait-for "body"
```

5) Run scan:
```powershell
node packages/cli/dist/index.js scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --out report.json
```

If Playwright reports missing browsers:
```powershell
npx playwright install chromium
```

## Notes

- `.gitignore` ignores `*.tsbuildinfo` and `report.json` to avoid committing generated artifacts.
- Next big milestones typically are:
  - Figma token extraction (`--figma-file`, `--figma-token`)
  - richer style collection (multiple elements per selector, nth matches, frames, responsiveness)
  - HTML report rendering

