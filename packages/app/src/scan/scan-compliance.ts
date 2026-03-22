import { compare, evaluate, type StyleSnapshot } from "@designlatch/core";
import { validateInputs } from "../validate/validate-inputs.js";
import type { ScanComplianceParams, ScanComplianceResult } from "../types/results.js";

export function scanCompliance(params: ScanComplianceParams): ScanComplianceResult {
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

  return {
    config: validated.config,
    url: validated.url,
    lintWarnings: validated.lintWarnings,
    tokens: validated.tokens,
    snapshots,
    report,
    evaluation
  };
}
