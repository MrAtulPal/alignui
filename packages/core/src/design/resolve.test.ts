import { listPaths, resolveNodeByPath, type PluginNode } from "../index.js";

function n(name: string, type?: string, children?: Array<PluginNode | null>): PluginNode {
  return { name, type, children };
}

test("resolveNodeByPath resolves a unique path", () => {
  const roots: PluginNode[] = [n("A", "FRAME", [n("B", "FRAME", [n("C", "INSTANCE")])])];
  const r = resolveNodeByPath(roots, ["A", "B", "C"], { type: "INSTANCE" });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.node.name).toBe("C");
});

test("resolveNodeByPath errors on ambiguous intermediate segment", () => {
  const roots: PluginNode[] = [n("A", "FRAME", [n("B"), n("B")])];
  const r = resolveNodeByPath(roots, ["A", "B", "X"]);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toMatch(/ambiguous segment/i);
});

test("resolveNodeByPath can disambiguate target by type + nth", () => {
  const roots: PluginNode[] = [n("A", "FRAME", [n("B", "FRAME"), n("B", "INSTANCE"), n("B", "INSTANCE")])];
  const r1 = resolveNodeByPath(roots, ["A", "B"], { type: "INSTANCE", nth: 0 });
  expect(r1.ok).toBe(true);
  const r2 = resolveNodeByPath(roots, ["A", "B"], { type: "INSTANCE", nth: 1 });
  expect(r2.ok).toBe(true);
});

test("listPaths returns paths and skips null children", () => {
  const roots: PluginNode[] = [n("A", "FRAME", [null, n("B", "TEXT")])];
  const paths = listPaths(roots, { max: 10 });
  expect(paths.some((p) => p.join("/") === "A")).toBe(true);
  expect(paths.some((p) => p.join("/") === "A/B")).toBe(true);
});

