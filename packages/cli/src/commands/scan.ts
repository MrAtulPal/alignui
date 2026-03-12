import {
  compare,
  diffReports,
  evaluate,
  lintRules,
  resolveTokenMap,
  topFailures,
  validateScanConfig,
  validateTokenMap,
  type ScanConfig,
  type ScanReport,
  type StyleSnapshot,
  type TokenMap
} from "@alignui/core";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { readJsonFile } from "../lib/json.js";
import { parseSnapshots } from "../lib/snapshots.js";
import { ExitCode } from "../lib/exit-codes.js";
import { renderHtmlReport } from "../lib/html-report.js";

type ScanOpts = {
  configPath?: string;
  url?: string;
  out?: string;
  reportDir?: string;
  tokensPath?: string;
  snapshotsPath?: string;
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

async function readBundledFontWoff2Base64(): Promise<string | undefined> {
  // Prefer resolving relative to the actual CLI entrypoint (dist/index.js).
  // Jest runs scan.ts directly, so this may fail there; it's fine to fall back.
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
  const fromArgv = argv1
    ? path.resolve(path.dirname(argv1), "..", "assets", "fonts", "nunito-sans.woff2")
    : undefined;

  const candidates = [
    fromArgv,
    path.resolve("packages/cli/assets/fonts/nunito-sans.woff2"),
    path.resolve("assets/fonts/nunito-sans.woff2")
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      const buf = await readFile(p);
      return buf.toString("base64");
    } catch {
      // keep trying
    }
  }

  return undefined;
}

async function writeHtmlReport(reportDir: string, report: ScanReport, ev: ReturnType<typeof evaluate>) {
  const jsonPath = path.join(reportDir, "report.json");
  const htmlPath = path.join(reportDir, "index.html");

  await mkdir(reportDir, { recursive: true });

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  const fontWoff2Base64 = await readBundledFontWoff2Base64();
  if (!fontWoff2Base64) {
    console.warn("Warning: Nunito Sans font not found; HTML report will render with fallback system fonts.");
  }
  const html = renderHtmlReport(report, ev, { fontWoff2Base64 });
  await writeFile(htmlPath, html, "utf8");
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${htmlPath}`);
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

  if (!opts.tokensPath) throw new Error("Missing --tokens <tokens.json> (Figma mode comes later).");
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

  if (!opts.snapshotsPath) throw new Error("Missing --snapshots <snapshots.json> (Playwright mode comes later).");
  const snapsRaw = await readJsonFile(opts.snapshotsPath);
  const snapshots: StyleSnapshot[] = parseSnapshots(snapsRaw).map((s) => ({ ...s, url }));

  const report = compare(tokens, snapshots, config.rules, config.defaults);

  const ev = evaluate(report, config.thresholds);

  const reportDir = opts.reportDir ?? (opts.out ? undefined : "report");
  if (reportDir) {
    await writeHtmlReport(reportDir, report, ev);
  } else {
    const outPath = opts.out ?? "report.json";
    await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  }
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
