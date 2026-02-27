export type Rgba = { r: number; g: number; b: number; a: number };

export type TokenValue =
  | { kind: "color"; rgba: Rgba }
  | { kind: "number"; value: number; unit: "px" | "ratio" }
  | { kind: "string"; value: string };

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
      tolerance?: { kind: "px"; value: number } | { kind: "rgba"; value: number };
      severity?: "error" | "warn";
    }
  >;
};

export type ScanConfig = {
  url: string;
  rules: Rule[];
  thresholds?: {
    minScore?: number;
    failOnUnmatched?: boolean;
  };
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
  };
};

