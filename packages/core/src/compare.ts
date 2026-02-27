import type { Rule, RuleResult, ScanReport, StyleSnapshot, TokenMap, TokenValue } from "./types.js";

function getSeverity(rule: Rule, property: string): "error" | "warn" {
  return rule.properties[property]?.severity ?? "error";
}

export function compare(tokens: TokenMap, snapshots: StyleSnapshot[], rules: Rule[]): ScanReport {
  const startedAt = new Date().toISOString();
  const results: RuleResult[] = [];

  const snapshotBySelector = new Map<string, StyleSnapshot>();
  for (const snap of snapshots) snapshotBySelector.set(snap.selector, snap);

  for (const rule of rules) {
    const snap = snapshotBySelector.get(rule.selector);
    for (const [property, spec] of Object.entries(rule.properties)) {
      const expected: TokenValue | null = tokens[spec.token] ?? null;
      const actual: string | null = snap?.computed[property] ?? null;
      const pass = expected !== null && actual !== null; // placeholder; real comparators come next

      results.push({
        ruleId: rule.id,
        selector: rule.selector,
        property,
        token: spec.token,
        expected,
        actual,
        pass,
        severity: getSeverity(rule, property),
        details: pass ? undefined : "Missing expected token or computed style value"
      });
    }
  }

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  const score = total === 0 ? 100 : Math.round((passed / total) * 1000) / 10;

  // Use first snapshot URL if present; CLI will set this reliably.
  const url = snapshots[0]?.url ?? "";
  return { meta: { startedAt, url }, results, summary: { total, passed, failed, score } };
}

