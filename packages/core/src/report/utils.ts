import type { RuleResult, ScanReport } from "../domain/types.js";

export type GroupedResults = Record<string, RuleResult[]>;

function stableSort<T>(items: T[], key: (t: T) => string): T[] {
  return items
    .map((v, i) => ({ v, i }))
    .sort((a, b) => {
      const ka = key(a.v);
      const kb = key(b.v);
      if (ka < kb) return -1;
      if (ka > kb) return 1;
      return a.i - b.i;
    })
    .map((x) => x.v);
}

export function sortResultsDeterministic(results: RuleResult[]): RuleResult[] {
  // Keeps output stable for CI diffs and future report rendering.
  return stableSort(results, (r) => `${r.selector}\n${r.ruleId}\n${r.property}\n${r.token}`);
}

export function filterFailures(report: ScanReport, opts?: { includeWarn?: boolean }): RuleResult[] {
  const includeWarn = opts?.includeWarn ?? true;
  return report.results.filter((r) => !r.pass && (includeWarn ? true : r.severity === "error"));
}

export function groupResultsBySelector(results: RuleResult[]): GroupedResults {
  const out: GroupedResults = {};
  for (const r of results) {
    (out[r.selector] ??= []).push(r);
  }
  for (const k of Object.keys(out)) out[k] = sortResultsDeterministic(out[k]!);
  return out;
}

export function groupResultsByRuleId(results: RuleResult[]): GroupedResults {
  const out: GroupedResults = {};
  for (const r of results) {
    (out[r.ruleId] ??= []).push(r);
  }
  for (const k of Object.keys(out)) out[k] = sortResultsDeterministic(out[k]!);
  return out;
}

export function topFailures(report: ScanReport, n: number, opts?: { includeWarn?: boolean }): RuleResult[] {
  const failures = filterFailures(report, opts);
  // Rank: error first, then missing data, then deterministic tie-break.
  const ranked = failures.slice().sort((a, b) => {
    const sevA = a.severity === "error" ? 0 : 1;
    const sevB = b.severity === "error" ? 0 : 1;
    if (sevA !== sevB) return sevA - sevB;

    const missA = (a.expected === null ? 1 : 0) + (a.actual === null ? 1 : 0);
    const missB = (b.expected === null ? 1 : 0) + (b.actual === null ? 1 : 0);
    if (missA !== missB) return missB - missA;

    const ka = `${a.selector}\n${a.ruleId}\n${a.property}\n${a.token}`;
    const kb = `${b.selector}\n${b.ruleId}\n${b.property}\n${b.token}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  return ranked.slice(0, Math.max(0, n));
}

