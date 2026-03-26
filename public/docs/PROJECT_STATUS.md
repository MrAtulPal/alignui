# DesignLatch Project Status

## Shipped
- Core comparison engine is live in `@designlatch/core` with validation, token resolution, compare, evaluate, and report scoring.
- Shared workflow layer is live in `@designlatch/app` for reusable validation and compliance scan flows.
- CLI workflow is live in `@designlatch/cli` with `init`, `collect`, `validate`, `scan`, and `serve`.
- CLI generates JSON and offline HTML reports and can serve the report locally.
- MCP v1 is live in `@designlatch/mcp` as a `stdio` server for AI agents.
- MCP v1 exposes two tools:
  - `validate_inputs`
  - `scan_compliance`
- MCP accepts inline JSON and returns JSON-only results in v1.
- `collect` remains CLI-only in v1.

## Current Architecture
- `@designlatch/core`
  - pure engine and domain logic
- `@designlatch/app`
  - shared workflows and shared runtime logger
- `@designlatch/cli`
  - file-based user workflow, Playwright collection, HTML report flow
- `@designlatch/mcp`
  - AI-agent adapter over `stdio`

## Still Pending
- Token import adapters such as Figma Variables and Style Dictionary.
- CI-focused integrations such as an official GitHub Action.
- Hosted/SaaS dashboard and report history.
- MCP support for baseline/diff flows, if that becomes part of the product direction.
