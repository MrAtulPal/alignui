# AlignUI CLI (v1) - Step-by-Step

This guide gets you from zero to a `report.json` in the fewest steps.

## 1) Build

```powershell
cd D:\Study_Material_Learning\AlignUI
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

Edit `.alignui.json`:
- set `url`
- add `rules[]` with `selector` + `properties`

## 3) Pick Expected Source (Tokens or Design Export)

Each property must say where the expected value comes from.

### A) Tokens (recommended when you have design tokens)

In `.alignui.json`, use `{ "token": "..." }`:

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

You will pass `--tokens alignui/tokens.json` to `scan`.

### B) Figma plugin export (`report.json` node tree)

Use when the Figma Variables API is blocked and you exported a node tree via a plugin.

1) List candidate `figmaPath` arrays:

```powershell
node packages/cli/dist/index.js design ls --in report.json --contains Button --type INSTANCE --max 50
```

2) Paste a path into `.alignui.json` and mark properties as `{ "design": true }`:

```json
{
  "url": "https://app.example.com",
  "rules": [
    {
      "id": "cred-navbar-btn",
      "selector": ".cred-navbar-btn",
      "design": {
        "figmaPath": ["Thirteen","Global Navigation","...","💠 Button"],
        "figmaType": "INSTANCE"
      },
      "properties": {
        "backgroundColor": { "design": true, "tolerance": { "kind": "rgba", "value": 0 } },
        "padding": { "design": true, "tolerance": { "kind": "px", "value": 1 } }
      }
    }
  ]
}
```

You will pass `--design report.json` to `scan`.

## 4) Collect Live-Site Snapshots

This opens your site in Playwright and captures computed styles for each rule selector.

```powershell
node packages/cli/dist/index.js collect --config .alignui.json --url https://app.example.com --out alignui/snapshots.json --wait-for "body"
```

Useful flags:
- `--timeout-ms 60000`
- `--headed`

If Playwright says Chromium is missing:

```powershell
npx playwright install chromium
```

## 5) Scan (Generate `report.json`)

### A) Scan using tokens

```powershell
node packages/cli/dist/index.js scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --out report.json
```

### B) Scan using design export

```powershell
node packages/cli/dist/index.js scan --config .alignui.json --design report.json --snapshots alignui/snapshots.json --out report.json
```

### Optional: Baseline diff

```powershell
node packages/cli/dist/index.js scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --baseline report.json --diff-out diff.json
```

## 6) Validate Inputs (No Scan)

```powershell
node packages/cli/dist/index.js validate --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json
```

