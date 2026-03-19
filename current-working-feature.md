# Current Working Feature: Collect SPA Selectors With Steps

## Summary
Enable SPA-style interactions for `collect` by supporting per-rule `steps` and optional page reloads via `collect.reloadPage` (global) and `rules[].reloadPageBefore` (override). This is a CLI-only feature; core remains unchanged.

## Config Example
```json
{
  "url": "https://app.example.com",
  "collect": {
    "reloadPage": true
  },
  "rules": [
    {
      "id": "settings-save-button",
      "reloadPageBefore": false,
      "steps": [
        { "type": "click", "selector": "#settings-tab" },
        { "type": "waitForSelector", "selector": ".settings-page" }
      ],
      "selector": ".save-button",
      "properties": {
        "backgroundColor": { "token": "color.primary" }
      }
    }
  ]
}
```

## Supported Step Types
- `click` (selector)
- `hover` (selector)
- `focus` (selector)
- `type` (selector, text)
- `press` (selector, key)
- `scrollIntoView` (selector)
- `waitForSelector` (selector)
- `waitForTimeout` (ms)

## Proposed Plan
1. Add CLI-only parsing/validation for `collect.reloadPage`, `rules[].reloadPageBefore`, and `rules[].steps`.
2. Run steps sequentially per rule before capturing computed styles.
3. If effective reload is true, re-run `page.goto` (and `waitFor` if provided) before steps.
4. Add Jest coverage for step execution, reload behavior, and invalid steps.
5. After implementation, add the feature entry to `packages/cli/FEATURES.md`.
