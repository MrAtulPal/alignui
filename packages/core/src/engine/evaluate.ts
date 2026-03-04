import type { Evaluation, ScanReport, Thresholds } from "../domain/types.js";

export function evaluate(report: ScanReport, thresholds?: Thresholds): Evaluation {
  const t: Required<Thresholds> = {
    minScore: thresholds?.minScore ?? 100,
    failOnSeverity: thresholds?.failOnSeverity ?? "error",
    failOnUnmatchedSelectors: thresholds?.failOnUnmatchedSelectors ?? false,
    failOnMissingTokens: thresholds?.failOnMissingTokens ?? true,
    failOnMissingDesign: thresholds?.failOnMissingDesign ?? true,
    failOnMissingComputed: thresholds?.failOnMissingComputed ?? true
  };

  const reasons: string[] = [];

  if (report.summary.score < t.minScore) {
    reasons.push(`Score ${report.summary.score} < ${t.minScore}`);
  }

  if (t.failOnSeverity === "warn") {
    if (report.summary.failed > 0) reasons.push(`Has failures (${report.summary.failed})`);
  } else {
    if (report.summary.errorFailed > 0) reasons.push(`Has error failures (${report.summary.errorFailed})`);
  }

  if (t.failOnUnmatchedSelectors && report.summary.unmatchedSelectors > 0) {
    reasons.push(`Unmatched selectors (${report.summary.unmatchedSelectors})`);
  }
  if (t.failOnMissingTokens && report.summary.missingTokens > 0) {
    reasons.push(`Missing tokens (${report.summary.missingTokens})`);
  }
  if (t.failOnMissingDesign && report.summary.missingDesign > 0) {
    reasons.push(`Missing design values (${report.summary.missingDesign})`);
  }
  if (t.failOnMissingComputed && report.summary.missingComputed > 0) {
    reasons.push(`Missing computed values (${report.summary.missingComputed})`);
  }

  return { pass: reasons.length === 0, reasons };
}
