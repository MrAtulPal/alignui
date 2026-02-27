import { isValidTokenKey, joinTokenKey, splitTokenKey } from "../index.js";

test("isValidTokenKey accepts dotted segments and rejects spaces", () => {
  expect(isValidTokenKey("color.primary")).toBe(true);
  expect(isValidTokenKey("font.body.sm.size")).toBe(true);
  expect(isValidTokenKey("spacing.4")).toBe(true);
  expect(isValidTokenKey("color primary")).toBe(false);
});

test("splitTokenKey/joinTokenKey round-trip", () => {
  const key = "font.body.sm.size";
  expect(joinTokenKey(splitTokenKey(key))).toBe(key);
});

