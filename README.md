# AlignUI

AlignUI is a CLI-first design compliance tool for comparing expected design token values with computed styles from a live site.

Public docs: https://mratulpal.github.io/alignui/
Repository: https://github.com/MrAtulPal/alignui
Package: `@alignui/cli`

## What v1 does

- validates `.alignui.json`, `tokens.json`, and `snapshots.json`
- collects live computed styles with Playwright
- compares live styles against expected token values
- writes `report/report.json`
- writes a minified HTML compliance report at `report/index.html`
- serves the report locally with `alignui serve`

## Quick Start

### 1. Install

```bash
npm install -D @alignui/cli
npx alignui help
```

### 2. Initialize starter files

```bash
npx alignui init --force
```

Edit `.alignui.json` so it contains your real URL, selectors, and property rules.

### 3. Provide expected tokens

Create `alignui/tokens.json` manually.

Example:

```json
{
  "color.primary": { "kind": "color", "rgba": { "r": 17, "g": 17, "b": 17, "a": 1 } },
  "space.md": { "kind": "dimension", "value": 16, "unit": "px" }
}
```

### 4. Collect live snapshots

```bash
npx alignui collect --config .alignui.json --url https://app.example.com --out alignui/snapshots.json --wait-for "body"
```

If Chromium is missing:

```bash
npx playwright install chromium
```

### 5. Run the scan

```bash
npx alignui scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --report-dir report
```

This writes:

- `report/report.json`
- `report/index.html`

### 6. Serve the HTML report

```bash
npx alignui serve --report-dir report
```

## Commands

### `init`

Create starter config and template files.

```bash
npx alignui init --force
```

### `collect`

Capture computed styles from the live site.

```bash
npx alignui collect --config .alignui.json --url https://app.example.com --out alignui/snapshots.json --wait-for "body"
```

Useful flags:

- `--timeout-ms <ms>`
- `--headed`

### `validate`

Validate config, tokens, and snapshots without running the compare engine.

```bash
npx alignui validate --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json
```

### `scan`

Run the compliance engine and generate reports.

```bash
npx alignui scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --report-dir report
```

Optional diff flow:

```bash
npx alignui scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --baseline report/report.json --diff-out diff.json
```

Useful flags:

- `--no-serve`
- `--no-open`
- `--host <host>`
- `--port <port>`

### `serve`

Serve a generated report directory or specific HTML file.

```bash
npx alignui serve --report-dir report
npx alignui serve --file report/index.html --no-open
```

## Inputs

### `.alignui.json`

Maps selectors to token-backed expectations.

```json
{
  "url": "https://app.example.com",
  "rules": [
    {
      "id": "primary-button",
      "selector": ".btn-primary",
      "properties": {
        "backgroundColor": { "token": "color.primary", "tolerance": { "kind": "rgba", "value": 0 } },
        "padding": { "token": "space.md", "tolerance": { "kind": "px", "value": 1 } }
      }
    }
  ]
}
```

### `tokens.json`

The expected design values for v1.

### `snapshots.json`

The actual computed styles collected from the live site.

## Publishing docs

GitHub Pages can publish from the repo `docs/` folder. The public entry page is `docs/index.html`.
