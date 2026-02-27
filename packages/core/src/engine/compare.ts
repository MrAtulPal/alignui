import type { Rule, RuleResult, ScanReport, StyleSnapshot, TokenMap, TokenValue } from "../domain/types.js";
import {
  normalizeFontFamilyList,
  normalizeRgbaToBytes,
  parseCssColor,
  parseCssPx,
  parseCssPxList,
  parseCssUnitlessNumber
} from "../utils/normalize.js";

function compareTokenToActual(
  expected: TokenValue,
  actual: string,
  tolerance: { kind: "px"; value: number } | { kind: "rgba"; value: number } | { kind: "ratio"; value: number } | undefined
): { pass: boolean; details?: string } {
  if (expected.kind === "ref") {
    return { pass: false, details: `Unresolved token reference: ${expected.token}` };
  }
  if (expected.kind === "color") {
    const a = parseCssColor(actual);
    if (!a) return { pass: false, details: `Unparseable CSS color: ${actual}` };
    const exp = normalizeRgbaToBytes(expected.rgba);
    const act = normalizeRgbaToBytes(a);
    const delta = Math.max(
      Math.abs(exp.r - act.r),
      Math.abs(exp.g - act.g),
      Math.abs(exp.b - act.b),
      Math.abs(exp.a - act.a)
    );
    const tol = tolerance?.kind === "rgba" ? tolerance.value : 0;
    return delta <= tol ? { pass: true } : { pass: false, details: `Color delta ${delta} > ${tol}` };
  }

  if (expected.kind === "number") {
    if (expected.unit === "px") {
      const n = parseCssPx(actual);
      if (n !== null) {
        const delta = Math.abs(expected.value - n);
        const tol = tolerance?.kind === "px" ? tolerance.value : 0;
        return delta <= tol ? { pass: true } : { pass: false, details: `Px delta ${delta} > ${tol}` };
      }

      // Handle computed shorthands like "8px 8px 0px 0px" (border-radius).
      const list = parseCssPxList(actual);
      if (!list) return { pass: false, details: `Unparseable px value: ${actual}` };
      const deltas = list.map((v) => Math.abs(expected.value - v));
      const worst = Math.max(...deltas);
      const tol = tolerance?.kind === "px" ? tolerance.value : 0;
      return worst <= tol
        ? { pass: true }
        : { pass: false, details: `Px list worst-delta ${worst} > ${tol}` };
    }

    if (expected.unit === "ratio") {
      const n = parseCssUnitlessNumber(actual);
      if (n === null) return { pass: false, details: `Unparseable ratio value: ${actual}` };
      const delta = Math.abs(expected.value - n);
      const tol = tolerance?.kind === "ratio" ? tolerance.value : 0;
      // Avoid tiny float rounding issues around the threshold.
      return delta <= tol + 1e-9 ? { pass: true } : { pass: false, details: `Ratio delta ${delta} > ${tol}` };
    }

    return { pass: false, details: `Unsupported number unit: ${expected.unit}` };
  }

  // string
  const exp = expected.value.trim().toLowerCase();
  const act = actual.trim().toLowerCase();
  if (exp === act) return { pass: true };

  // Special-case font family: expected "Inter" should match within computed list.
  if (act.includes(",") || exp.includes(" ")) {
    const fams = normalizeFontFamilyList(actual);
    if (fams.includes(exp)) return { pass: true };
  }
  return { pass: false, details: `String mismatch: expected "${expected.value}", got "${actual}"` };
}

function getSeverity(rule: Rule, property: string): "error" | "warn" {
  return rule.properties[property]?.severity ?? "error";
}

export function compare(tokens: TokenMap, snapshots: StyleSnapshot[], rules: Rule[]): ScanReport {
  const startedAt = new Date().toISOString();
  const results: RuleResult[] = [];

  const snapshotBySelector = new Map<string, StyleSnapshot>();
  for (const snap of snapshots) snapshotBySelector.set(snap.selector, snap);

  let unmatchedSelectors = 0;
  let missingTokens = 0;
  let missingComputed = 0;

  for (const rule of rules) {
    const snap = snapshotBySelector.get(rule.selector);
    if (!snap) unmatchedSelectors++;
    for (const [property, spec] of Object.entries(rule.properties)) {
      const expected: TokenValue | null = tokens[spec.token] ?? null;
      const actual: string | null = snap?.computed[property] ?? null;
      let pass = false;
      let details: string | undefined;
      if (expected === null) {
        missingTokens++;
        details = `Missing token: ${spec.token}`;
      } else if (actual === null) {
        missingComputed++;
        details = `Missing computed style: ${property}`;
      } else {
        const r = compareTokenToActual(expected, actual, spec.tolerance);
        pass = r.pass;
        details = r.details;
      }

      results.push({
        ruleId: rule.id,
        selector: rule.selector,
        property,
        token: spec.token,
        expected,
        actual,
        pass,
        severity: getSeverity(rule, property),
        details: pass ? undefined : details
      });
    }
  }

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  const errorFailed = results.filter((r) => !r.pass && r.severity === "error").length;
  const warnFailed = results.filter((r) => !r.pass && r.severity === "warn").length;
  const score = total === 0 ? 100 : Math.round((passed / total) * 1000) / 10;

  // Use first snapshot URL if present; CLI will set this reliably.
  const url = snapshots[0]?.url ?? "";
  return {
    meta: { startedAt, url },
    results,
    summary: {
      total,
      passed,
      failed,
      score,
      errorFailed,
      warnFailed,
      unmatchedSelectors,
      missingTokens,
      missingComputed
    }
  };
}
