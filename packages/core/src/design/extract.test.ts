import { extractDesignExpected, type PluginNode } from "../index.js";

test("extractDesignExpected extracts backgroundColor from SOLID fill hex", () => {
  const node: PluginNode = { name: "X", type: "FRAME", fills: [{ type: "SOLID", hex: "#ffffff" }] };
  const r = extractDesignExpected(node, "backgroundColor");
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.kind).toBe("color");
    if (r.value.kind === "color") expect(r.value.rgba.a).toBe(1);
  }
});

test("extractDesignExpected extracts padding into a box token", () => {
  const node: PluginNode = { name: "X", paddingTop: 8, paddingRight: 12, paddingBottom: 8, paddingLeft: 12 };
  const r = extractDesignExpected(node, "padding");
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.kind).toBe("box");
    if (r.value.kind === "box") expect(r.value.right).toBe(12);
  }
});

test("extractDesignExpected requires TEXT for color", () => {
  const node: PluginNode = { name: "X", type: "FRAME", fills: [{ type: "SOLID", hex: "#000000" }] };
  const r = extractDesignExpected(node, "color");
  expect(r.ok).toBe(false);
});

