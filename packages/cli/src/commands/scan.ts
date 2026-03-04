import {
  compare,
  compareWithDesign,
  diffReports,
  evaluate,
  lintRules,
  parsePluginExport,
  resolveTokenMap,
  topFailures,
  validateScanConfig,
  validateTokenMap,
  type ScanConfig,
  type ScanReport,
  type StyleSnapshot,
  type PluginNode,
  type TokenMap
} from "@alignui/core";
import { writeFile } from "node:fs/promises";
import { readJsonFile } from "../lib/json.js";
import { parseSnapshots } from "../lib/snapshots.js";
import { ExitCode } from "../lib/exit-codes.js";

type ScanOpts = {
  configPath?: string;
  url?: string;
  out?: string;
  tokensPath?: string;
  snapshotsPath?: string;
  designPath?: string;
  baselinePath?: string;
  diffOut?: string;
};

function printTopFailures(report: ScanReport, max = 10) {
  const top = topFailures(report, max);
  for (const r of top) {
    const exp = r.expected ? JSON.stringify(r.expected) : "null";
    const act = r.actual ?? "null";
    console.log(`- ${r.severity} ${r.selector} ${r.property} expected=${exp} actual=${act}`);
  }
}

export async function runScan(opts: ScanOpts): Promise<number> {
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

  const url = opts.url ?? config.url;
  if (!url) throw new Error("Missing url (provide --url or config.url).");

  const needsTokens = config.rules.some((r) => Object.values(r.properties).some((p) => "token" in p));
  const needsDesign = config.rules.some((r) => Object.values(r.properties).some((p) => "design" in p));

  for (const r of config.rules) {
    const usesDesign = Object.values(r.properties).some((p) => "design" in p);
    if (usesDesign && (!r.design?.figmaPath || r.design.figmaPath.length === 0)) {
      throw new Error(`Rule "${r.id}" uses { design: true } properties but is missing rule.design.figmaPath`);
    }
  }

  let tokens: TokenMap = {};
  if (needsTokens) {
    if (!opts.tokensPath) throw new Error("Missing --tokens <tokens.json> (required because some properties use { token: ... }).");
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
    tokens = resolved.resolved;
  }

  let designRoots: PluginNode[] | undefined = undefined;
  if (needsDesign) {
    if (!opts.designPath) throw new Error("Missing --design <plugin-export.json> (required because some properties use { design: true }).");
    const designRaw = await readJsonFile(opts.designPath);
    const parsed = parsePluginExport(designRaw);
    if (!parsed.ok) {
      const msg = parsed.errors.map((e) => `${e.path}: ${e.message}`).join("\n");
      throw new Error(`Invalid design export (${opts.designPath}):\n${msg}`);
    }
    designRoots = parsed.value;
  }

  if (!opts.snapshotsPath) throw new Error("Missing --snapshots <snapshots.json> (Playwright mode comes later).");
  const snapsRaw = await readJsonFile(opts.snapshotsPath);
  const snapshots: StyleSnapshot[] = parseSnapshots(snapsRaw).map((s) => ({ ...s, url }));

  const report = needsDesign ? compareWithDesign(tokens, snapshots, config.rules, designRoots) : compare(tokens, snapshots, config.rules);
  const outPath = opts.out ?? "report.json";
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  const ev = evaluate(report, config.thresholds);
  console.log(`Score: ${report.summary.score} (${report.summary.passed}/${report.summary.total} passed)`);
  if (!ev.pass) {
    console.log("Fail reasons:");
    for (const r of ev.reasons) console.log(`- ${r}`);
    console.log("Top failures:");
    printTopFailures(report, 10);
  }

  if (opts.baselinePath) {
    const baselineRaw = await readJsonFile(opts.baselinePath);
    const baseline = baselineRaw as ScanReport; // v1: assume correct shape, can validate later
    const diff = diffReports(baseline, report);
    const diffOut = opts.diffOut ?? "diff.json";
    await writeFile(diffOut, JSON.stringify(diff, null, 2), "utf8");
    console.log(`Diff: added=${diff.summary.added} becameFail=${diff.summary.becameFail} scoreDelta=${diff.summary.scoreDelta}`);
  }

  return ev.pass ? ExitCode.Ok : ExitCode.Fail;
}
