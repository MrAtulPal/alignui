import type { RuleResult, ScanReport } from "../domain/types.js";

export type ResultKey = string;

export type ResultChange = {
  key: ResultKey;
  selector: string;
  ruleId: string;
  property: string;
  token: string;
  severity: "error" | "warn";
  from: { pass: boolean; expected: RuleResult["expected"]; actual: RuleResult["actual"] } | null;
  to: { pass: boolean; expected: RuleResult["expected"]; actual: RuleResult["actual"] } | null;
};

export type ReportDiff = {
  meta: {
    baselineStartedAt: string;
    currentStartedAt: string;
    baselineUrl: string;
    currentUrl: string;
  };
  summary: {
    scoreDelta: number;
    failedDelta: number;
    errorFailedDelta: number;
    warnFailedDelta: number;
    added: number;
    removed: number;
    becameFail: number;
    becamePass: number;
    changed: number;
    unchanged: number;
  };
  changes: {
    added: ResultChange[];
    removed: ResultChange[];
    becameFail: ResultChange[];
    becamePass: ResultChange[];
    changed: ResultChange[];
    unchanged: ResultChange[];
  };
};

export function resultKey(r: Pick<RuleResult, "selector" | "ruleId" | "property" | "token">): ResultKey {
  // Stable identity for a single check across runs.
  return `${r.selector}\n${r.ruleId}\n${r.property}\n${r.token}`;
}

function equalValues(a: RuleResult | null, b: RuleResult | null): boolean {
  if (a === null || b === null) return a === b;
  return a.pass === b.pass && a.actual === b.actual && JSON.stringify(a.expected) === JSON.stringify(b.expected);
}

export function diffReports(baseline: ScanReport, current: ScanReport): ReportDiff {
  const baseByKey = new Map<ResultKey, RuleResult>();
  const currByKey = new Map<ResultKey, RuleResult>();

  for (const r of baseline.results) baseByKey.set(resultKey(r), r);
  for (const r of current.results) currByKey.set(resultKey(r), r);

  const allKeys = new Set<ResultKey>([...baseByKey.keys(), ...currByKey.keys()]);

  const added: ResultChange[] = [];
  const removed: ResultChange[] = [];
  const becameFail: ResultChange[] = [];
  const becamePass: ResultChange[] = [];
  const changed: ResultChange[] = [];
  const unchanged: ResultChange[] = [];

  for (const key of allKeys) {
    const from = baseByKey.get(key) ?? null;
    const to = currByKey.get(key) ?? null;

    const ref = to ?? from;
    if (!ref) continue;

    const ch: ResultChange = {
      key,
      selector: ref.selector,
      ruleId: ref.ruleId,
      property: ref.property,
      token: ref.token,
      severity: ref.severity,
      from: from ? { pass: from.pass, expected: from.expected, actual: from.actual } : null,
      to: to ? { pass: to.pass, expected: to.expected, actual: to.actual } : null
    };

    if (from === null && to !== null) {
      added.push(ch);
      continue;
    }
    if (from !== null && to === null) {
      removed.push(ch);
      continue;
    }
    if (from && to) {
      if (from.pass && !to.pass) becameFail.push(ch);
      else if (!from.pass && to.pass) becamePass.push(ch);
      else if (!equalValues(from, to)) changed.push(ch);
      else unchanged.push(ch);
    }
  }

  const scoreDelta = Math.round((current.summary.score - baseline.summary.score) * 10) / 10;
  const failedDelta = current.summary.failed - baseline.summary.failed;
  const errorFailedDelta = current.summary.errorFailed - baseline.summary.errorFailed;
  const warnFailedDelta = current.summary.warnFailed - baseline.summary.warnFailed;

  return {
    meta: {
      baselineStartedAt: baseline.meta.startedAt,
      currentStartedAt: current.meta.startedAt,
      baselineUrl: baseline.meta.url,
      currentUrl: current.meta.url
    },
    summary: {
      scoreDelta,
      failedDelta,
      errorFailedDelta,
      warnFailedDelta,
      added: added.length,
      removed: removed.length,
      becameFail: becameFail.length,
      becamePass: becamePass.length,
      changed: changed.length,
      unchanged: unchanged.length
    },
    changes: { added, removed, becameFail, becamePass, changed, unchanged }
  };
}

