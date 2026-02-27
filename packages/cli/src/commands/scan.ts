import { compare, type ScanConfig, type StyleSnapshot, type TokenMap } from "@alignui/core";
import { readFile, writeFile } from "node:fs/promises";

export async function runScan(opts: { configPath?: string; url?: string; out?: string }): Promise<number> {
  if (!opts.configPath) {
    throw new Error("Missing --config path (v1 uses config-driven rules).");
  }

  const raw = await readFile(opts.configPath, "utf8");
  const config = JSON.parse(raw) as ScanConfig;
  const url = opts.url ?? config.url;
  if (!url) throw new Error("Missing url (provide --url or config.url).");

  // Core is browser-agnostic. For now, CLI uses placeholders until Playwright adapter is added.
  const tokens: TokenMap = {};
  const snapshots: StyleSnapshot[] = config.rules.map((r) => ({
    selector: r.selector,
    url,
    computed: {}
  }));

  const report = compare(tokens, snapshots, config.rules);
  const outPath = opts.out ?? "report.json";
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  // v1 stub: fail if any checks fail once real comparators land.
  return 0;
}

