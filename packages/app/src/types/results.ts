import type { Evaluation, ScanConfig, ScanReport, StyleSnapshot, Thresholds, TokenMap } from "@designlatch/core";

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidateInputsParams = {
  config: unknown;
  tokens?: unknown;
  snapshots?: unknown;
  urlOverride?: string;
};

export type ValidateInputsResult = {
  config: ScanConfig;
  url: string;
  thresholds?: Thresholds;
  lintWarnings: ValidationIssue[];
  tokens?: TokenMap;
  snapshots?: StyleSnapshot[];
  counts: {
    rules: number;
    tokens: number;
    snapshots: number;
  };
};

export type ScanComplianceParams = {
  config: unknown;
  tokens: unknown;
  snapshots: unknown;
  urlOverride?: string;
};

export type ScanComplianceResult = {
  config: ScanConfig;
  url: string;
  lintWarnings: ValidationIssue[];
  tokens: TokenMap;
  snapshots: StyleSnapshot[];
  report: ScanReport;
  evaluation: Evaluation;
};
