import { compare, type Rule, type StyleSnapshot, type TokenMap } from "./index.js";

function mkSnap(selector: string, url: string, computed: Record<string, string>): StyleSnapshot {
  return { selector, url, computed };
}

test("compares color tokens against computed rgb()", () => {
  const tokens: TokenMap = {
    "color.primary": { kind: "color", rgba: { r: 47, g: 107, b: 255, a: 1 } }
  };
  const rules: Rule[] = [
    {
      id: "btn-primary",
      selector: ".btn-primary",
      properties: {
        backgroundColor: { token: "color.primary", tolerance: { kind: "rgba", value: 0 } }
      }
    }
  ];
  const snaps = [mkSnap(".btn-primary", "https://x.test", { backgroundColor: "rgb(47, 107, 255)" })];

  const report = compare(tokens, snaps, rules);
  expect(report.summary.failed).toBe(0);
  expect(report.summary.score).toBe(100);
});

test("fails color compare when beyond rgba tolerance", () => {
  const tokens: TokenMap = {
    "color.primary": { kind: "color", rgba: { r: 47, g: 107, b: 255, a: 1 } }
  };
  const rules: Rule[] = [
    {
      id: "btn-primary",
      selector: ".btn-primary",
      properties: {
        backgroundColor: { token: "color.primary", tolerance: { kind: "rgba", value: 1 } }
      }
    }
  ];
  const snaps = [mkSnap(".btn-primary", "https://x.test", { backgroundColor: "rgb(47, 107, 252)" })];

  const report = compare(tokens, snaps, rules);
  expect(report.summary.failed).toBe(1);
  expect(report.results[0]!.details).toMatch(/delta/i);
});

test("compares px number tokens with px tolerance", () => {
  const tokens: TokenMap = {
    "font.button.size": { kind: "number", value: 16, unit: "px" }
  };
  const rules: Rule[] = [
    {
      id: "btn-primary",
      selector: ".btn-primary",
      properties: {
        fontSize: { token: "font.button.size", tolerance: { kind: "px", value: 1 } }
      }
    }
  ];
  const snaps = [mkSnap(".btn-primary", "https://x.test", { fontSize: "16.5px" })];

  const report = compare(tokens, snaps, rules);
  expect(report.summary.failed).toBe(0);
});

test("matches expected font family within computed fallback list", () => {
  const tokens: TokenMap = {
    "font.body.family": { kind: "string", value: "Inter" }
  };
  const rules: Rule[] = [
    {
      id: "body",
      selector: "body",
      properties: {
        fontFamily: { token: "font.body.family" }
      }
    }
  ];
  const snaps = [
    mkSnap("body", "https://x.test", { fontFamily: "\"Inter\", system-ui, -apple-system, sans-serif" })
  ];

  const report = compare(tokens, snaps, rules);
  expect(report.summary.failed).toBe(0);
});

test("fails when selector snapshot is missing", () => {
  const tokens: TokenMap = {
    "radius.md": { kind: "number", value: 8, unit: "px" }
  };
  const rules: Rule[] = [
    {
      id: "card",
      selector: ".card",
      properties: {
        borderRadius: { token: "radius.md" }
      }
    }
  ];
  const report = compare(tokens, [], rules);
  expect(report.summary.failed).toBe(1);
  expect(report.results[0]!.details).toMatch(/missing computed style/i);
});

