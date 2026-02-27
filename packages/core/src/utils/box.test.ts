import { parseCssBoxPx } from "../index.js";

test("parseCssBoxPx parses 1..4 value shorthands", () => {
  expect(parseCssBoxPx("8px")).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  expect(parseCssBoxPx("8px 16px")).toEqual({ top: 8, right: 16, bottom: 8, left: 16 });
  expect(parseCssBoxPx("8px 16px 4px")).toEqual({ top: 8, right: 16, bottom: 4, left: 16 });
  expect(parseCssBoxPx("1px 2px 3px 4px")).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
});

test("parseCssBoxPx rejects non-px values", () => {
  expect(parseCssBoxPx("1rem")).toBeNull();
  expect(parseCssBoxPx("8px 1rem")).toBeNull();
});

