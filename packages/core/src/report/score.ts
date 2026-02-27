import type { RuleResult } from "../domain/types.js";

export type ScoreWeights = {
  defaultWeight?: number;
  severity?: { error?: number; warn?: number };
  byRuleId?: Record<string, number>;
  byProperty?: Record<string, number>;
};

export type WeightedScore = {
  totalWeight: number;
  passedWeight: number;
  failedWeight: number;
  score: number; // 0..100, 1 decimal
};

function numOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clampNonNegative(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n;
}

function weightFor(result: RuleResult, w?: ScoreWeights): number {
  const base = clampNonNegative(numOr(w?.defaultWeight, 1));
  const sevMul = clampNonNegative(
    result.severity === "error" ? numOr(w?.severity?.error, 1) : numOr(w?.severity?.warn, 1)
  );
  const ruleMul = clampNonNegative(numOr(w?.byRuleId?.[result.ruleId], 1));
  const propMul = clampNonNegative(numOr(w?.byProperty?.[result.property], 1));
  return base * sevMul * ruleMul * propMul;
}

export function computeWeightedScore(results: RuleResult[], weights?: ScoreWeights): WeightedScore {
  let totalWeight = 0;
  let passedWeight = 0;

  for (const r of results) {
    const wt = weightFor(r, weights);
    totalWeight += wt;
    if (r.pass) passedWeight += wt;
  }

  const failedWeight = totalWeight - passedWeight;
  const score = totalWeight <= 0 ? 100 : Math.round((passedWeight / totalWeight) * 1000) / 10;
  return { totalWeight, passedWeight, failedWeight, score };
}

