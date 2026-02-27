import type { ScanReport, TokenMap } from "../domain/types.js";
import { compare, topFailures, groupResultsBySelector, sortResultsDeterministic } from "../index.js";

function mkReport(): ScanReport {
  const tokens: TokenMap = {
    "color.primary": { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } },
    "font.size": { kind: "number", value: 16, unit: "px" }
  };
  const rules = [
    {
      id: "a",
      selector: ".a",
      properties: {
        color: { token: "color.primary" },
        fontSize: { token: "font.size", tolerance: { kind: "px", value: 0 } }
      }
    },
    {
      id: "b",
      selector: ".b",
      properties: {
        color: { token: "missing.token" } // forces missing token failure
      }
    }
  ];
  const snaps = [
    { selector: ".a", url: "https://x.test", computed: { color: "rgb(255, 255, 255)", fontSize: "16px" } }
  ];
  return compare(tokens, snaps, rules as any);
}

test("sortResultsDeterministic is stable and deterministic", () => {
  const report = mkReport();
  const a = sortResultsDeterministic(report.results);
  const b = sortResultsDeterministic(report.results.slice().reverse());
  expect(a.map((r) => `${r.selector}/${r.ruleId}/${r.property}`)).toEqual(
    b.map((r) => `${r.selector}/${r.ruleId}/${r.property}`)
  );
});

test("groupResultsBySelector groups and sorts per selector", () => {
  const report = mkReport();
  const grouped = groupResultsBySelector(report.results);
  expect(Object.keys(grouped).sort()).toEqual([".a", ".b"]);
  expect(grouped[".a"]!.every((r) => r.selector === ".a")).toBe(true);
});

test("topFailures ranks missing data and severity first", () => {
  const report = mkReport();
  const top = topFailures(report, 2);
  expect(top).toHaveLength(2);
  // Missing token failure should be ranked ahead of a normal mismatch.
  expect(top[0]!.expected).toBeNull();
});

