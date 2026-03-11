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

## 3) Provide Expected Tokens

Each property must reference a token key in `tokens.json`.

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

```powershell
node packages/cli/dist/index.js scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --out report.json
```

### Optional: Baseline diff

```powershell
node packages/cli/dist/index.js scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --baseline report.json --diff-out diff.json
```

## 6) Validate Inputs (No Scan)

```powershell
node packages/cli/dist/index.js validate --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json
```
