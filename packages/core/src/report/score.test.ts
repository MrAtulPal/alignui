import type { RuleResult } from "../domain/types.js";
import { computeWeightedScore } from "../index.js";

function r(partial: Partial<RuleResult>): RuleResult {
  return {
    ruleId: partial.ruleId ?? "r",
    selector: partial.selector ?? ".x",
    property: partial.property ?? "color",
    token: partial.token ?? "color.primary",
    expected: partial.expected ?? null,
    actual: partial.actual ?? null,
    pass: partial.pass ?? false,
    severity: partial.severity ?? "error",
    details: partial.details
  };
}

test("computeWeightedScore defaults to simple pass ratio", () => {
  const results = [r({ pass: true }), r({ pass: false })];
  const s = computeWeightedScore(results);
  expect(s.score).toBe(50);
});

test("computeWeightedScore applies severity weights", () => {
  const results = [r({ pass: false, severity: "error" }), r({ pass: true, severity: "warn" })];
  const s = computeWeightedScore(results, { severity: { error: 10, warn: 1 } });
  // error fail dominates: passedWeight=1, total=11 => 9.09.. => 9.1
  expect(s.score).toBe(9.1);
});

test("computeWeightedScore treats non-positive total weight as 100", () => {
  const results = [r({ pass: false })];
  const s = computeWeightedScore(results, { defaultWeight: 0 });
  expect(s.totalWeight).toBe(0);
  expect(s.score).toBe(100);
});

