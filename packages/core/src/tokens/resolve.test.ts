import { resolveTokenMap, type TokenMap } from "../index.js";

test("resolves a simple token reference", () => {
  const tokens: TokenMap = {
    "color.primary": { kind: "color", rgba: { r: 1, g: 2, b: 3, a: 1 } },
    "color.brand": { kind: "ref", token: "color.primary" }
  };

  const r = resolveTokenMap(tokens);
  expect(r.errors).toEqual([]);
  expect(r.resolved["color.brand"]).toEqual(tokens["color.primary"]);
});

test("reports missing references and leaves ref intact", () => {
  const tokens: TokenMap = {
    "color.brand": { kind: "ref", token: "color.missing" }
  };

  const r = resolveTokenMap(tokens);
  expect(r.errors[0]).toMatch(/missing token reference/i);
  expect(r.resolved["color.brand"]).toEqual(tokens["color.brand"]);
});

test("detects reference cycles", () => {
  const tokens: TokenMap = {
    a: { kind: "ref", token: "b" },
    b: { kind: "ref", token: "a" }
  };

  const r = resolveTokenMap(tokens);
  expect(r.errors.join("\n")).toMatch(/cycle/i);
});

