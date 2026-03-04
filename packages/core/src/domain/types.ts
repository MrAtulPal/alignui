export type Rgba = { r: number; g: number; b: number; a: number };

export type TokenValue =
  | { kind: "color"; rgba: Rgba }
  | { kind: "number"; value: number; unit: "px" | "ratio" }
  | { kind: "string"; value: string }
  | { kind: "box"; unit: "px"; top: number; right: number; bottom: number; left: number }
  | { kind: "ref"; token: string };

export type TokenMap = Record<string, TokenValue>;

export type StyleSnapshot = {
  selector: string;
  url: string;
  text?: string;
  computed: Record<string, string>;
};

export type RuleDesignLocator = {
  // Deterministic path into a design tree (e.g. plugin-export JSON).
  // Use array segments to avoid delimiter escaping issues (names can include "." or "/").
  figmaPath: string[];
  // Optional disambiguation when names collide under the same parent.
  figmaType?: string;
  // Optional disambiguation when multiple nodes still match after figmaType filter.
  // 0-based index.
  figmaNth?: number;
};

export type RulePropertySpec =
  | {
      token: string;
      tolerance?: { kind: "px"; value: number } | { kind: "rgba"; value: number } | { kind: "ratio"; value: number };
      severity?: "error" | "warn";
    }
  | {
      design: true;
      tolerance?: { kind: "px"; value: number } | { kind: "rgba"; value: number } | { kind: "ratio"; value: number };
      severity?: "error" | "warn";
    };

export type Rule = {
  id: string;
  selector: string;
  // Optional: enables "design expected values" for properties marked { design: true }.
  design?: RuleDesignLocator;
  properties: Record<string, RulePropertySpec>;
};

export type ScanConfig = {
  url: string;
  rules: Rule[];
  thresholds?: Thresholds;
};

export type Thresholds = {
  minScore?: number;
  failOnSeverity?: "error" | "warn";
  failOnUnmatchedSelectors?: boolean;
  failOnMissingTokens?: boolean;
  failOnMissingDesign?: boolean;
  failOnMissingComputed?: boolean;
};

export type RuleResult = {
  ruleId: string;
  selector: string;
  property: string;
  // For token-based checks: the token key. For design-based checks: a stable synthetic key.
  token: string;
  expected: TokenValue | null;
  actual: string | null;
  pass: boolean;
  severity: "error" | "warn";
  details?: string;
};

export type ScanReport = {
  meta: { startedAt: string; url: string };
  results: RuleResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    score: number;
    errorFailed: number;
    warnFailed: number;
    unmatchedSelectors: number;
    missingTokens: number;
    missingDesign: number;
    missingComputed: number;
  };
};

export type Evaluation = {
  pass: boolean;
  reasons: string[];
};
