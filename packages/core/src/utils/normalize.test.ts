import {
  normalizeFontFamilyList,
  normalizeRgbaToBytes,
  parseCssColor,
  parseCssPx,
  parseCssPxList,
  parseCssUnitlessNumber
} from "./normalize.js";

test("parseCssColor parses rgb/rgba", () => {
  expect(parseCssColor("rgb(1, 2, 3)")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  expect(parseCssColor("rgba(1,2,3,0.5)")).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
});

test("parseCssColor parses hex and transparent", () => {
  expect(parseCssColor("#0f8")).toEqual({ r: 0, g: 255, b: 136, a: 1 });
  expect(parseCssColor("#00ff88cc")).toEqual({ r: 0, g: 255, b: 136, a: 0.8 });
  expect(parseCssColor("transparent")).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("normalizeRgbaToBytes clamps and converts alpha", () => {
  expect(normalizeRgbaToBytes({ r: 260, g: -5, b: 10.2, a: 0.5 })).toEqual({ r: 255, g: 0, b: 10, a: 128 });
});

test("parseCssPx parses px values", () => {
  expect(parseCssPx("16px")).toBe(16);
  expect(parseCssPx("16.5px")).toBe(16.5);
  expect(parseCssPx("1rem")).toBeNull();
});

test("parseCssUnitlessNumber parses numeric strings", () => {
  expect(parseCssUnitlessNumber("1.5")).toBe(1.5);
  expect(parseCssUnitlessNumber("16px")).toBeNull();
});

test("parseCssPxList parses space-separated px values", () => {
  expect(parseCssPxList("8px 8px 0px 0px")).toEqual([8, 8, 0, 0]);
  expect(parseCssPxList("8px 1rem")).toBeNull();
});

test("normalizeFontFamilyList splits and lowercases", () => {
  expect(normalizeFontFamilyList("\"Inter\", system-ui, sans-serif")).toEqual(["inter", "system-ui", "sans-serif"]);
});
