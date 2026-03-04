import type { ScanReport } from "../domain/types.js";
import { diffReports } from "../index.js";

function mkReport(partial: Partial<ScanReport>): ScanReport {
  return {
    meta: { startedAt: partial.meta?.startedAt ?? "t", url: partial.meta?.url ?? "u" },
    results: partial.results ?? [],
    summary:
      partial.summary ??
      ({
        total: 0,
        passed: 0,
        failed: 0,
        score: 100,
        errorFailed: 0,
        warnFailed: 0,
        unmatchedSelectors: 0,
        missingTokens: 0,
        missingDesign: 0,
        missingComputed: 0
      } as any)
  };
}

test("diffReports detects added/removed and pass/fail flips", () => {
  const baseline = mkReport({
    meta: { startedAt: "b", url: "https://b" },
    summary: {
      total: 1,
      passed: 1,
      failed: 0,
      score: 100,
      errorFailed: 0,
      warnFailed: 0,
      unmatchedSelectors: 0,
      missingTokens: 0,
      missingDesign: 0,
      missingComputed: 0
    },
    results: [
      {
        ruleId: "r1",
        selector: ".a",
        property: "color",
        token: "color.primary",
        expected: { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } },
        actual: "rgb(0,0,0)",
        pass: true,
        severity: "error"
      }
    ]
  });

  const current = mkReport({
    meta: { startedAt: "c", url: "https://c" },
    summary: {
      total: 2,
      passed: 0,
      failed: 2,
      score: 0,
      errorFailed: 2,
      warnFailed: 0,
      unmatchedSelectors: 0,
      missingTokens: 1,
      missingDesign: 0,
      missingComputed: 0
    },
    results: [
      {
        ruleId: "r1",
        selector: ".a",
        property: "color",
        token: "color.primary",
        expected: { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } },
        actual: "rgb(255,255,255)",
        pass: false,
        severity: "error"
      },
      {
        ruleId: "r2",
        selector: ".b",
        property: "borderRadius",
        token: "radius.md",
        expected: null,
        actual: "8px",
        pass: false,
        severity: "error"
      }
    ]
  });

  const d = diffReports(baseline, current);
  expect(d.meta.baselineStartedAt).toBe("b");
  expect(d.meta.currentStartedAt).toBe("c");
  expect(d.summary.added).toBe(1);
  expect(d.summary.becameFail).toBe(1);
  expect(d.summary.removed).toBe(0);
  expect(d.summary.scoreDelta).toBe(-100);
});

test("diffReports treats identical results as unchanged", () => {
  const baseline = mkReport({
    summary: {
      total: 1,
      passed: 1,
      failed: 0,
      score: 100,
      errorFailed: 0,
      warnFailed: 0,
      unmatchedSelectors: 0,
      missingTokens: 0,
      missingDesign: 0,
      missingComputed: 0
    },
    results: [
      {
        ruleId: "r",
        selector: ".x",
        property: "fontSize",
        token: "font.size",
        expected: { kind: "number", value: 16, unit: "px" },
        actual: "16px",
        pass: true,
        severity: "warn"
      }
    ]
  });
  const current = mkReport({
    summary: baseline.summary,
    results: baseline.results
  });
  const d = diffReports(baseline, current);
  expect(d.summary.unchanged).toBe(1);
  expect(d.summary.changed).toBe(0);
});
