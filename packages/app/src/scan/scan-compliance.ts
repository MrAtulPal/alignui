import { compare, evaluate, type StyleSnapshot } from "@designlatch/core";
import { createLogger } from "../lib/logger.js";
import { validateInputs } from "../validate/validate-inputs.js";
import type { ScanComplianceParams, ScanComplianceResult } from "../types/results.js";

const logger = createLogger("app.scan_compliance");

export function scanCompliance(params: ScanComplianceParams): ScanComplianceResult {
  logger.debug("workflow started", { hasUrlOverride: params.urlOverride !== undefined });
  const validated = validateInputs({
    config: params.config,
    tokens: params.tokens,
    snapshots: params.snapshots,
    urlOverride: params.urlOverride
  });

  if (!validated.tokens) throw new Error("Missing tokens.");
  if (!validated.snapshots) throw new Error("Missing snapshots.");

  const snapshots: StyleSnapshot[] = validated.snapshots.map((snapshot) => ({
    ...snapshot,
    url: validated.url
  }));

  const report = compare(validated.tokens, snapshots, validated.config.rules, validated.config.defaults);
  const evaluation = evaluate(report, validated.config.thresholds);

  const result = {
    config: validated.config,
    url: validated.url,
    lintWarnings: validated.lintWarnings,
    tokens: validated.tokens,
    snapshots,
    report,
    evaluation
  };

  logger.info("workflow completed", {
    total: report.summary.total,
    passed: report.summary.passed,
    score: report.summary.score,
    pass: evaluation.pass
  });
  return result;
}
