# DesignLatch CLI - Step-by-Step

This guide covers the file-based CLI workflow. If you are integrating from an AI agent, use the MCP server instead of the CLI.

## 1) Build

```powershell
cd D:\Study_Material_Learning\DesignLatch
npm -ws run build
```

Run the CLI like:

```powershell
node packages/cli/dist/index.js <command> [flags]
```

## 2) Initialize

Create starter files:

```powershell
node packages/cli/dist/index.js init --force
```

Edit `.designlatch.json`:
- set `url`
- add `rules[]` with `selector` and `properties`

## 3) Provide Expected Tokens

Each property must reference a token key in `tokens.json`.

In `.designlatch.json`, use `{ "token": "..." }`:

```json
{
  "url": "https://app.example.com",
  "rules": [
    {
      "id": "btn-primary",
      "selector": ".btn-primary",
      "properties": {
        "backgroundColor": { "token": "color.primary", "tolerance": { "kind": "rgba", "value": 0 } },
        "padding": { "token": "pad.md", "tolerance": { "kind": "px", "value": 1 } }
      }
    }
  ]
}
```

You will pass `--tokens designlatch/tokens.json` to `scan`.

## 4) Collect Live-Site Snapshots

This opens your site in Playwright and captures computed styles for each rule selector.

```powershell
node packages/cli/dist/index.js collect --config .designlatch.json --url https://app.example.com --out designlatch/snapshots.json --wait-for "body"
```

Useful flags:
- `--timeout-ms 60000`
- `--headed`

If Playwright says Chromium is missing:

```powershell
npx playwright install chromium
```

## 5) Scan

```powershell
node packages/cli/dist/index.js scan --config .designlatch.json --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json --report-dir report
```

Outputs:
- `report/report.json`
- `report/index.html`

### Optional: Baseline diff

```powershell
node packages/cli/dist/index.js scan --config .designlatch.json --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json --baseline report/report.json --diff-out diff.json
```

## 6) Validate Inputs Without Scanning

```powershell
node packages/cli/dist/index.js validate --config .designlatch.json --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json
```

## 7) Serve The HTML Report

```powershell
node packages/cli/dist/index.js serve --report-dir report
```

## MCP Alternative

DesignLatch also ships an MCP server for AI-agent workflows:
- package: `@designlatch/mcp`
- binary: `designlatch-mcp`
- tools: `validate_inputs`, `scan_compliance`

Use MCP when your agent already has inline JSON for config, tokens, and snapshots. Use the CLI when you want file-based workflows, Playwright collection, and HTML reports.
