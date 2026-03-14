# DesignLatch Project Status

## Done (v1 core)
- Completed CLI workflow: `init`, `collect`, `validate`, `scan`, `serve` with Playwright snapshots, token comparison, and local HTML report.
- Inlined fonts and minified the HTML report so it works offline and serves without external requests.
- Built landing + docs experience, pointing users at the published `@DesignLatch/cli` package and documenting how to run `npx DesignLatch`.
- Added a dedicated `public/` folder with the hosted assets and refreshed onboarding copy for GitHub Pages.

## Next version (v1.x)
- Add token import adapters (Figma Variables, Style Dictionary) so users no longer maintain `tokens.json` manually.
- Publish official GitHub Action and npm hooks so CI workflows can run DesignLatch without long scripts.
- Ship a hosted/SaaS dashboard that aggregates reports, audits, and history across scans.
- Expand CLI automation (automated sample snapshots, config wizards, etc.) and improve doc automation.
