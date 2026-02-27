export type Rgba = { r: number; g: number; b: number; a: number };

export type TokenValue =
  | { kind: "color"; rgba: Rgba }
  | { kind: "number"; value: number; unit: "px" | "ratio" }
  | { kind: "string"; value: string }
  | { kind: "ref"; token: string };

export type TokenMap = Record<string, TokenValue>;

export type StyleSnapshot = {
  selector: string;
  url: string;
  text?: string;
  computed: Record<string, string>;
};

export type Rule = {
  id: string;
  selector: string;
  properties: Record<
    string,
    {
      token: string;
      tolerance?: { kind: "px"; value: number } | { kind: "rgba"; value: number } | { kind: "ratio"; value: number };
      severity?: "error" | "warn";
    }
  >;
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
  failOnMissingComputed?: boolean;
};

export type RuleResult = {
  ruleId: string;
  selector: string;
  property: string;
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
    missingComputed: number;
  };
};

export type Evaluation = {
  pass: boolean;
  reasons: string[];
};
