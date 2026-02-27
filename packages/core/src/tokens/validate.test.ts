import { validateTokenMap } from "../index.js";

test("validateTokenMap accepts valid tokens", () => {
  const r = validateTokenMap({
    "color.primary": { kind: "color", rgba: { r: 1, g: 2, b: 3, a: 1 } },
    "font.size": { kind: "number", value: 16, unit: "px" },
    "line.tight": { kind: "number", value: 1.25, unit: "ratio" },
    "pad.md": { kind: "box", unit: "px", top: 10, right: 16, bottom: 10, left: 16 },
    "font.family": { kind: "string", value: "Inter" },
    "color.brand": { kind: "ref", token: "color.primary" }
  });
  expect(r.ok).toBe(true);
});

test("validateTokenMap reports invalid keys and shapes", () => {
  const r = validateTokenMap({
    "bad key": { kind: "string", value: "x" },
    ok: { kind: "number", value: "nope", unit: "px" }
  });
  expect(r.ok).toBe(false);
  if (!r.ok) {
    const joined = r.errors.map((e) => e.path).join("\n");
    expect(joined).toMatch(/\$\.bad key/);
    expect(joined).toMatch(/\$\.ok\.value/);
  }
});
