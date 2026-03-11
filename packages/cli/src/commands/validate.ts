import { lintRules, resolveTokenMap, validateScanConfig, validateTokenMap, type ScanConfig, type TokenMap } from "@alignui/core";
import { readJsonFile } from "../lib/json.js";
import { parseSnapshots } from "../lib/snapshots.js";
import { ExitCode } from "../lib/exit-codes.js";

type ValidateOpts = {
  configPath?: string;
  url?: string;
  tokensPath?: string;
  snapshotsPath?: string;
};

export async function runValidate(opts: ValidateOpts): Promise<number> {
  const configPath = opts.configPath ?? ".alignui.json";
  const configRaw = await readJsonFile(configPath);
  const validated = validateScanConfig(configRaw);
  if (!validated.ok) {
    const msg = validated.errors.map((e) => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`Invalid config (${configPath}):\n${msg}`);
  }
  const config: ScanConfig = validated.value;

  const lint = lintRules(config.rules);
  if (lint.errors.length > 0) {
    const msg = lint.errors.map((e) => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`Config lint errors (${configPath}):\n${msg}`);
  }
  if (lint.warnings.length > 0) {
    console.log(`Config lint warnings (${configPath}):`);
    for (const w of lint.warnings) console.log(`- ${w.path}: ${w.message}`);
  }

  if (!opts.tokensPath) throw new Error("Missing --tokens <tokens.json>.");
  const tokensRaw = await readJsonFile(opts.tokensPath);
  const tv = validateTokenMap(tokensRaw);
  if (!tv.ok) {
    const msg = tv.errors.map((e) => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`Invalid tokens (${opts.tokensPath}):\n${msg}`);
  }
  const resolved = resolveTokenMap(tv.value);
  if (resolved.errors.length > 0) {
    throw new Error(`Token resolution errors:\n${resolved.errors.join("\n")}`);
  }
  const tokens: TokenMap = resolved.resolved;

  if (!opts.snapshotsPath) throw new Error("Missing --snapshots <snapshots.json>.");
  const snapsRaw = await readJsonFile(opts.snapshotsPath);
  const snapshots = parseSnapshots(snapsRaw);

  const url = opts.url ?? config.url;
  if (!url) throw new Error("Missing url (provide --url or config.url).");

  console.log(`Config: ${config.rules.length} rule(s)`);
  console.log(`Tokens: ${Object.keys(tokens).length} token(s)`);
  console.log(`Snapshots: ${snapshots.length} selector(s)`);
  console.log(`URL: ${url}`);

  return ExitCode.Ok;
}

