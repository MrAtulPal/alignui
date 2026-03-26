import type { Evaluation, ScanReport } from "@designlatch/core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildInlinedFontFaceCss } from "./font-assets.js";
import { renderHtmlReport } from "./html-report.js";

export type ReportOutput = {
  reportDir: string;
  jsonPath: string;
  htmlPath: string;
};

export async function writeScanReport(reportDir: string, report: ScanReport, evaluation: Evaluation): Promise<ReportOutput> {
  const resolvedDir = path.resolve(reportDir);
  const jsonPath = path.join(resolvedDir, "report.json");
  const htmlPath = path.join(resolvedDir, "index.html");

  await mkdir(resolvedDir, { recursive: true });
  const fontFaceCss = await buildInlinedFontFaceCss();

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  const html = renderHtmlReport(report, evaluation, { fontFaceCss });
  await writeFile(htmlPath, html, "utf8");

  return { reportDir: resolvedDir, jsonPath, htmlPath };
}
