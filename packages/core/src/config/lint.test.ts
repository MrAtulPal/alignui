import type { Rule, TokenMap } from "../domain/types.js";
import { lintRules } from "../index.js";

test("lintRules catches duplicate rule ids and warns on duplicate selector+property", () => {
  const rules: Rule[] = [
    { id: "a", selector: ".btn", properties: { color: { token: "color.primary" } } },
    { id: "a", selector: ".btn", properties: { color: { token: "color.primary" } } }
  ];
  const r = lintRules(rules);
  expect(r.errors[0]!.message).toMatch(/duplicate rule id/i);
  expect(r.warnings.some((w) => /duplicate selector\+property/i.test(w.message))).toBe(true);
});

test("lintRules warns when tolerance kind mismatches token kind", () => {
  const tokens: TokenMap = {
    "color.primary": { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } },
    "line.tight": { kind: "number", value: 1.2, unit: "ratio" }
  };
  const rules: Rule[] = [
    {
      id: "x",
      selector: ".x",
      properties: {
        lineHeight: { token: "line.tight", tolerance: { kind: "px", value: 1 } },
        color: { token: "color.primary", tolerance: { kind: "rgba", value: 0 } }
      }
    }
  ];
  const r = lintRules(rules, tokens);
  expect(r.warnings.some((w) => /px tolerance used/i.test(w.message))).toBe(true);
});

