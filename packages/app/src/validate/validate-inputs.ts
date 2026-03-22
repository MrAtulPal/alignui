import {
  lintRules,
  resolveTokenMap,
  validateScanConfig,
  validateTokenMap,
  type ScanConfig,
  type TokenMap
} from "@designlatch/core";
import { parseSnapshots } from "../lib/snapshots.js";
import type { ValidateInputsParams, ValidateInputsResult, ValidationIssue } from "../types/results.js";

function formatIssues(issues: ValidationIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}

function requireValidConfig(input: unknown): ScanConfig {
  const validated = validateScanConfig(input);
  if (!validated.ok) {
    throw new Error(`Invalid config:\n${formatIssues(validated.errors)}`);
  }
  return validated.value;
}

function lintConfig(config: ScanConfig): ValidationIssue[] {
  const lint = lintRules(config.rules);
  if (lint.errors.length > 0) {
    throw new Error(`Config lint errors:\n${formatIssues(lint.errors)}`);
  }
  return lint.warnings;
}

function resolveTokens(input: unknown): TokenMap {
  const validated = validateTokenMap(input);
  if (!validated.ok) {
    throw new Error(`Invalid tokens:\n${formatIssues(validated.errors)}`);
  }

  const resolved = resolveTokenMap(validated.value);
  if (resolved.errors.length > 0) {
    throw new Error(`Token resolution errors:\n${resolved.errors.join("\n")}`);
  }

  return resolved.resolved;
}

export function validateInputs(params: ValidateInputsParams): ValidateInputsResult {
  const config = requireValidConfig(params.config);
  const lintWarnings = lintConfig(config);
  const url = params.urlOverride ?? config.url;
  if (!url) throw new Error("Missing url (provide urlOverride or config.url).");

  const tokens = params.tokens === undefined ? undefined : resolveTokens(params.tokens);
  const snapshots = params.snapshots === undefined ? undefined : parseSnapshots(params.snapshots);

  return {
    config,
    url,
    thresholds: config.thresholds,
    lintWarnings,
    tokens,
    snapshots,
    counts: {
      rules: config.rules.length,
      tokens: tokens ? Object.keys(tokens).length : 0,
      snapshots: snapshots ? snapshots.length : 0
    }
  };
}
