# DesignLatch V2

## Summary

DesignLatch V2 adds MCP support for AI agents while keeping the current CLI fully independent and working as it does today.

## Plan

- Add a new `packages/mcp` package.
- Keep `@designlatch/core` as the shared pure engine.
- Keep the CLI standalone and unchanged in behavior.
- MCP will be `stdio`-only in v1.
- MCP will use file-based inputs like config, tokens, and snapshots paths.
- MCP will not expose `collect`.
- AI agents will create `tokens.json` and `snapshots.json` using external tools such as Playwright and Figma MCP.
- MCP v1 will expose two tools:
  - `validate_inputs`
  - `scan_compliance`
- `scan_compliance` will return full report JSON and may also write report files to disk.

## Architecture

- Do not make MCP depend on CLI.
- Keep `@designlatch/core` as the pure engine layer.
- Add a shared workflow layer such as `@designlatch/app` or `@designlatch/shared`.
- Keep `@designlatch/cli` and `@designlatch/mcp` as sibling adapters.

Recommended dependency graph:

```text
core <- app <- cli
core <- app <- mcp
```

Not recommended:

```text
core <- cli <- mcp
```

### Layer responsibilities

- `@designlatch/core`
  - types, validation, token resolution, compare, evaluate
- `@designlatch/app` or `@designlatch/shared`
  - reusable workflows like `validateInputs(...)` and `scanCompliance(...)`
- `@designlatch/cli`
  - arg parsing, console UX, `collect`, `serve`
- `@designlatch/mcp`
  - MCP transport, tool schemas, tool handlers

## Working Model

- Work on engine logic in `core`.
- Work on shared validation/scan flows in `app`.
- Work on terminal UX and browser collection in `cli`.
- Work on AI-agent integration in `mcp`.
- Both CLI and MCP should call the same shared workflow functions instead of calling each other.

## Versioning Plan

- `@designlatch/core` should move to a beta line such as `1.0.0-beta.1`.
- `@designlatch/app` should start at `0.1.0`.
- `@designlatch/cli` and future `@designlatch/mcp` should stay in `0.x` until their external command and tool contracts settle.
- `core` beta means the package is strong enough for early adopters but still allows targeted breaking changes before stable `1.0.0`.
- `app` should remain `0.x` until shared workflow APIs like `validateInputs(...)` and `scanCompliance(...)` stabilize across both CLI and MCP.
- Internal package dependency versions should always stay consistent.

## Assumptions

- `collect` remains CLI-only.
- MCP is a separate package, not a CLI subcommand.
- Baseline/diff support is deferred from v1.
