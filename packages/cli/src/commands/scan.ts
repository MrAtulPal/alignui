import { scanCompliance, writeScanReport } from "@designlatch/app";
import { diffReports, topFailures, type ScanReport } from "@designlatch/core";
import { writeFile } from "node:fs/promises";
import { ExitCode } from "../lib/exit-codes.js";
import { readJsonFile } from "../lib/json.js";
import { loadConfigInput } from "../lib/config-loader.js";

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

export async function runScan(opts: ScanOpts): Promise<number> {
  const configPath = opts.configPath ?? ".designlatch.json";
  const loaded = await loadConfigInput(configPath);

  if (!opts.tokensPath) throw new Error("Missing --tokens <tokens.json> (Figma mode comes later).");
  if (!opts.snapshotsPath) throw new Error("Missing --snapshots <snapshots.json> (Playwright mode comes later).");

  const [tokensRaw, snapshotsRaw] = await Promise.all([
    readJsonFile(opts.tokensPath),
    readJsonFile(opts.snapshotsPath)
  ]);

  const scanned = scanCompliance({
    config: loaded.configRaw,
    tokens: tokensRaw,
    snapshots: snapshotsRaw,
    urlOverride: opts.url
  });

  if (scanned.lintWarnings.length > 0) {
    console.log(`Config lint warnings (${loaded.configPath}):`);
    for (const warning of scanned.lintWarnings) console.log(`- ${warning.path}: ${warning.message}`);
  }

  const reportDir = opts.reportDir ?? (opts.out ? undefined : "report");
  if (reportDir) {
    const output = await writeScanReport(reportDir, scanned.report, scanned.evaluation);
    console.log(`Wrote ${output.jsonPath}`);
    console.log(`Wrote ${output.htmlPath}`);
  } else {
    const outPath = opts.out ?? "report.json";
    await writeFile(outPath, JSON.stringify(scanned.report, null, 2), "utf8");
  }
  console.log(`Score: ${scanned.report.summary.score} (${scanned.report.summary.passed}/${scanned.report.summary.total} passed)`);
  if (!scanned.evaluation.pass) {
    console.log("Fail reasons:");
    for (const r of scanned.evaluation.reasons) console.log(`- ${r}`);
    console.log("Top failures:");
    printTopFailures(scanned.report, 10);
  }

  if (opts.baselinePath) {
    const baselineRaw = await readJsonFile(opts.baselinePath);
    const baseline = baselineRaw as ScanReport;
    const diff = diffReports(baseline, scanned.report);
    const diffOut = opts.diffOut ?? "diff.json";
    await writeFile(diffOut, JSON.stringify(diff, null, 2), "utf8");
    console.log(`Diff: added=${diff.summary.added} becameFail=${diff.summary.becameFail} scoreDelta=${diff.summary.scoreDelta}`);
  }

  return scanned.evaluation.pass ? ExitCode.Ok : ExitCode.Fail;
}
