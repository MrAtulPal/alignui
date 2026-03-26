# DesignLatch

DesignLatch compares expected design token values with computed styles from a live product surface.

It currently ships two user-facing adapters:

- `@designlatch/cli` for file-based workflows, Playwright collection, and HTML reports
- `@designlatch/mcp` for AI-agent workflows over `stdio` with inline JSON inputs

## What Is Shipped

- `@designlatch/core`
  - pure validation, token resolution, compare, evaluate, and scoring logic
- `@designlatch/app`
  - shared in-memory workflows used by both adapters
- `@designlatch/cli`
  - `init`, `collect`, `validate`, `scan`, and `serve`
- `@designlatch/mcp`
  - `stdio` MCP server with `validate_inputs` and `scan_compliance`

## Choose The Right Adapter

Use the CLI when you want:

- file-based inputs
- Playwright collection from a live site
- offline JSON and HTML reports
- a local report server

Use MCP when you want:

- AI-agent integration
- inline JSON inputs already held in memory
- JSON-only results
- no file workflow and no Playwright dependency

## Architecture

DesignLatch keeps the engine and adapters separated:

```text
core <- app <- cli
core <- app <- mcp
```

The CLI and MCP packages are sibling adapters. Neither depends on the other.

## CLI Quick Start

### 1. Install

```bash
npm install -D @designlatch/cli
npx designlatch help
```

### 2. Initialize starter files

```bash
npx designlatch init --force
```

Edit `.designlatch.json` so it contains your real URL, selectors, and property rules.

### Config Input Modes

`--config` accepts either:

- a single JSON config file such as `.designlatch.json`
- a directory such as `test_components` that contains multiple `.json` config files

Example directory-based scan:

```bash
npx designlatch scan --config test_components --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json --report-dir report
```

Recommended naming for split config files:

- `button.test.json`
- `card.test.json`
- `form.test.json`

Directory merge behavior:

- all `.json` files in the directory are included
- files are merged in alphabetical filename order
- `rules` arrays are concatenated
- `url`, `thresholds`, and `defaults` come from the first file in sorted order

### 3. Provide expected tokens

Create `designlatch/tokens.json` manually.

Example:

```json
{
  "color.primary": { "kind": "color", "rgba": { "r": 17, "g": 17, "b": 17, "a": 1 } },
  "space.md": { "kind": "dimension", "value": 16, "unit": "px" }
}
```

### 4. Collect live snapshots

```bash
npx designlatch collect --config .designlatch.json --url https://app.example.com --out designlatch/snapshots.json --wait-for "body"
npx designlatch collect --config test_components --url https://app.example.com --out designlatch/snapshots.json --wait-for "body"
```

If Chromium is missing:

```bash
npx playwright install chromium
```

### 5. Validate or scan

Validate inputs only:

```bash
npx designlatch validate --config .designlatch.json --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json
npx designlatch validate --config test_components --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json
```

Run the compliance scan:

```bash
npx designlatch scan --config .designlatch.json --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json --report-dir report
npx designlatch scan --config test_components --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json --report-dir report
```

This writes:

- `report/report.json`
- `report/index.html`

### 6. Serve the HTML report

```bash
npx designlatch serve --report-dir report
```

## MCP Quick Start

Install the MCP adapter:

```bash
npm install -D @designlatch/mcp
```

Run the MCP server:

```bash
npx designlatch-mcp
```

MCP v1 characteristics:

- transport: `stdio` only
- input mode: inline JSON
- output mode: JSON only
- no `collect` tool

Exposed MCP tools:

- `validate_inputs`
- `scan_compliance`

Use MCP when your agent already has config, tokens, and snapshots as JSON and only needs validation or compliance scan results.

## CLI Commands

### `init`

Create starter config and template files.

```bash
npx designlatch init --force
```

### `collect`

Capture computed styles from the live site.

```bash
npx designlatch collect --config .designlatch.json --url https://app.example.com --out designlatch/snapshots.json --wait-for "body"
npx designlatch collect --config test_components --url https://app.example.com --out designlatch/snapshots.json --wait-for "body"
```

Useful flags:

- `--timeout-ms <ms>`
- `--headed`

### `validate`

Validate config, tokens, and snapshots without running the compare engine.

```bash
npx designlatch validate --config .designlatch.json --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json
npx designlatch validate --config test_components --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json
```

### `scan`

Run the compliance engine and generate reports.

```bash
npx designlatch scan --config .designlatch.json --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json --report-dir report
npx designlatch scan --config test_components --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json --report-dir report
```

Optional diff flow:

```bash
npx designlatch scan --config .designlatch.json --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json --baseline report/report.json --diff-out diff.json
```

### `serve`

Serve a generated report directory or specific HTML file.

```bash
npx designlatch serve --report-dir report
npx designlatch serve --file report/index.html --no-open
```

## Inputs

### `.designlatch.json`

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

The expected design values.

### `snapshots.json`

The computed styles collected from the live site.

## More Docs

- [`CLI dictionary`](./public/docs/CLI_USAGE.md)