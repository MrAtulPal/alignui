# DesignLatch MCP

`@designlatch/mcp` is the MCP adapter for DesignLatch.

It exposes DesignLatch validation and compliance scanning over `stdio` so an AI agent can send inline JSON directly to the server without relying on file-based CLI workflows.

## What It Does

This package exposes two MCP tools:

- `validate_inputs`
- `scan_compliance`

Use MCP when your agent already has, or can generate, these JSON inputs in memory:

- `config`
- `tokens`
- `snapshots`

Use the CLI instead when you want:

- file-based workflows
- Playwright collection
- local HTML reports and report serving

## Install

```bash
npm install -D @designlatch/mcp
```

Run the server:

```bash
npx designlatch-mcp
```

## Add It To An AI Agent

Most MCP-capable AI clients connect to local tools over `stdio` using a server config.

The common pattern is:

```json
{
  "mcpServers": {
    "designlatch": {
      "command": "npx",
      "args": ["-y", "@designlatch/mcp@0.1.0-alpha"]
    }
  }
}
```

That tells the AI client to start the DesignLatch MCP server through `npx`.

If the package is already installed in the project, a local variant is usually cleaner:

```json
{
  "mcpServers": {
    "designlatch": {
      "command": "npx",
      "args": ["designlatch-mcp"]
    }
  }
}
```

If your client prefers a direct Node entrypoint instead of `npx`, use the built file:

```json
{
  "mcpServers": {
    "designlatch": {
      "command": "node",
      "args": ["/absolute/path/to/node_modules/@designlatch/mcp/dist/index.js"]
    }
  }
}
```

What the user does in practice:

1. Install `@designlatch/mcp`
2. Open the AI client's MCP/server configuration
3. Add a `designlatch` server entry using one of the examples above
4. Restart or reload the AI client
5. Ask the agent to call `validate_inputs` or `scan_compliance`

Once connected, the AI agent should see these tools:

- `validate_inputs`
- `scan_compliance`

## MCP Model

DesignLatch MCP currently supports:

- transport: `stdio`
- input mode: inline JSON only
- output mode: JSON tool responses
- tools: `validate_inputs`, `scan_compliance`

It does not provide a `collect` tool. Snapshot collection remains a CLI concern.

## Tool Inputs

### `validate_inputs`

Use this when you want to verify the shape of the incoming JSON before a full scan.

Input shape:

```json
{
  "config": {},
  "tokens": {},
  "snapshots": [],
  "urlOverride": "https://example.com"
}
```

Notes:

- `config` is required
- `tokens` is optional
- `snapshots` is optional
- `urlOverride` is optional

### `scan_compliance`

Use this when you want a full report and evaluation.

Input shape:

```json
{
  "config": {},
  "tokens": {},
  "snapshots": [],
  "urlOverride": "https://example.com"
}
```

Notes:

- `config` is required
- `tokens` is required
- `snapshots` is required
- `urlOverride` is optional

## JSON Structures

### `config`

The config describes selectors and the token-backed CSS expectations to compare.

Example:

```json
{
  "url": "https://app.example.com",
  "rules": [
    {
      "id": "primary-button",
      "selector": ".btn-primary",
      "properties": {
        "backgroundColor": {
          "token": "button.primary.background",
          "tolerance": { "kind": "rgba", "value": 0 },
          "severity": "error"
        },
        "padding": {
          "token": "button.primary.padding",
          "tolerance": { "kind": "px", "value": 1 },
          "severity": "warn"
        }
      }
    }
  ],
  "thresholds": {
    "minScore": 90,
    "failOnSeverity": "error"
  }
}
```

Useful fields:

- `url`: the product page the rules refer to
- `rules[].id`: stable rule identifier
- `rules[].selector`: CSS selector
- `rules[].properties`: CSS property checks
- `properties.<cssProp>.token`: token key to resolve from `tokens`
- `properties.<cssProp>.tolerance`: optional comparison tolerance
- `properties.<cssProp>.severity`: `error` or `warn`
- `thresholds`: optional pass/fail evaluation settings

### `tokens`

Tokens define the expected design values. These must match the token keys referenced in `config.rules[*].properties[*].token`.

Example:

```json
{
  "button.primary.background": {
    "kind": "color",
    "rgba": { "r": 0, "g": 114, "b": 216, "a": 1 }
  },
  "button.primary.padding": {
    "kind": "box",
    "unit": "px",
    "top": 12,
    "right": 20,
    "bottom": 12,
    "left": 20
  },
  "button.primary.radius": {
    "kind": "number",
    "value": 8,
    "unit": "px"
  },
  "button.primary.labelWeight": {
    "kind": "string",
    "value": "600"
  }
}
```

Supported token styles used in this repo:

- `color`
- `number`
- `string`
- `box`

### `snapshots`

Snapshots are the observed runtime styles for the selectors being evaluated.

Example:

```json
[
  {
    "selector": ".btn-primary",
    "url": "https://app.example.com",
    "computed": {
      "backgroundColor": "rgb(0, 114, 216)",
      "padding": "12px 20px",
      "borderRadius": "8px"
    },
    "text": "Continue"
  }
]
```

Useful fields:

- `selector`: must match the selector in config
- `url`: runtime page URL
- `computed`: CSS property map from the live UI
- `text`: optional element text

## Agent Prompting Guide

If you want an AI agent to generate the inline JSON for MCP, be explicit about:

- which object(s) you want back
- that the response must be valid JSON only
- that no prose or Markdown fences should be included
- which CSS properties and token names should be used

Good instruction pattern:

```text
Return valid JSON only. Do not include prose. Do not wrap the answer in Markdown code fences.
```

## Example Prompts

### 1. Generate config, tokens, and snapshots for a simple button

```text
Generate three JSON values for DesignLatch MCP: config, tokens, and snapshots.

The component is a primary button with selector ".btn-primary".
Expected styles:
- background color rgb(0, 114, 216)
- text color rgb(255, 255, 255)
- padding 12px 20px
- border radius 8px
- font weight 600
- button text "Continue"

Use token keys starting with "button.primary.".
Add a threshold with minScore 95 and failOnSeverity "error".

Return valid JSON only with this exact top-level shape:
{
  "config": {},
  "tokens": {},
  "snapshots": []
}

Do not include explanations or Markdown fences.
```

### 2. Generate only a config object for a card with header and footer

```text
Create a DesignLatch config JSON object only.

The target page URL is "https://app.example.com/profile".
I need rules for:
- ".profile-card"
- ".profile-card .card-header"
- ".profile-card .card-body"
- ".profile-card .card-footer"

Use token names under the "card." namespace.
For backgroundColor and padding use severity "error".
For boxShadow, display, justifyContent, and gap use severity "warn".
Use px tolerance 0 for padding and radius. Use rgba tolerance 0 for colors.
Add thresholds with minScore 90 and failOnSeverity "error".

Return valid JSON only. No prose. No Markdown.
```

### 3. Generate only tokens for a described component style system

```text
Generate a DesignLatch tokens JSON object only.

Create tokens for a modal dialog using these values:
- overlay background rgba(0, 0, 0, 0.6)
- panel background rgba(255, 255, 255, 1)
- panel radius 16px
- panel shadow "rgba(0, 0, 0, 0.18) 0px 12px 32px 0px"
- title font size 24px
- title line height 32px
- title font weight 700
- body padding 24px 28px 24px 28px
- footer gap 12px

Use valid DesignLatch token shapes only. Prefer:
- kind=color for colors
- kind=number for single numeric values
- kind=string for shadow and font weight
- kind=box for four-sided padding

Return valid JSON only. No comments. No Markdown.
```

### 4. Generate only snapshots from observed CSS values

```text
Generate a DesignLatch snapshots JSON array only.

I observed these runtime values on https://app.example.com/settings:

Selector ".settings-save-btn":
- backgroundColor: "rgb(0, 114, 216)"
- color: "rgb(255, 255, 255)"
- padding: "12px 20px"
- borderRadius: "8px"
- text: "Save Changes"

Selector ".settings-panel":
- backgroundColor: "rgb(255, 255, 255)"
- boxShadow: "rgba(0, 0, 0, 0.1) 0px 2px 8px 0px"
- padding: "24px 24px 24px 24px"

Return valid JSON only as an array of snapshot objects with selector, url, computed, and optional text.
Do not include any explanation.
```

### 5. Use Playwright MCP plus Figma MCP before calling DesignLatch MCP

```text
Use Playwright MCP to open https://live-site-url and get the computed styles for the ".btn-primary" selector.

Then use Figma MCP to inspect the component or design token data for "btn-primary" in this Figma file:
https://www.figma.com/file/your-figma-file-id/example

From those two sources, generate three valid JSON values for DesignLatch:
- config
- tokens
- snapshots

Requirements:
- the config must include a rule for ".btn-primary"
- the token names should use the "button.primary." namespace
- the snapshots array must contain the observed computed styles from the live site
- the tokens object must contain the expected design values from Figma

After generating the JSON:
1. call DesignLatch MCP tool `validate_inputs`
2. if validation passes, call DesignLatch MCP tool `scan_compliance`
3. summarize any failures, score, and top mismatches

Return valid JSON only when generating config/tokens/snapshots.
Do not wrap JSON in Markdown fences.
```

## Common Mistakes

- Referencing token keys in `config` that do not exist in `tokens`
- Using token shapes that DesignLatch does not understand
- Passing `snapshots` as an object instead of an array
- Omitting the `computed` object inside a snapshot
- Using selector names in snapshots that do not match the selectors in config
- Confusing CLI file paths with MCP inline JSON payloads

## Typical MCP Flow

1. Ask your AI agent to generate `config`, `tokens`, and optionally `snapshots`
2. Call `validate_inputs` first to verify structure
3. Fix any schema or token-reference issues
4. Call `scan_compliance` once the payloads are valid
5. Use the returned report and evaluation in your agent workflow

Example multi-tool agent flow:

1. Use Playwright MCP to inspect a live selector and capture computed styles
2. Use Figma MCP to retrieve the expected design token values for the same component
3. Convert those results into DesignLatch `config`, `tokens`, and `snapshots`
4. Call `validate_inputs`
5. Call `scan_compliance`
6. Return the score, fail reasons, and property-level mismatches

## When To Use MCP vs CLI

Use MCP when:

- an AI agent is already orchestrating the workflow
- inputs are already in memory as JSON
- you want tool-call results instead of file-based commands

Use CLI when:

- you need Playwright collection
- you want HTML report generation and serving
- you want local files as the primary interface
