import { exportTokensByScanningNodeSubtree } from "./figma-scan.js";

test("exportTokensByScanningNodeSubtree exports unique solid fill colors by value", () => {
  const root = {
    id: "1:1",
    name: "Root",
    type: "FRAME",
    children: [
      {
        id: "2:2",
        name: "A",
        type: "RECTANGLE",
        fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }]
      },
      {
        id: "3:3",
        name: "B",
        type: "RECTANGLE",
        fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }]
      }
    ]
  };

  const r = exportTokensByScanningNodeSubtree({ rootNodeId: "1:1", rootDocument: root });
  const keys = Object.keys(r.tokens).filter((k) => k.startsWith("color.hex."));
  expect(keys).toHaveLength(1);
  expect(r.index.byKey[keys[0]!]!.count).toBe(2);
});

test("exportTokensByScanningNodeSubtree exports text tokens by tuple", () => {
  const root = {
    id: "1:1",
    name: "Root",
    type: "FRAME",
    children: [
      {
        id: "t:1",
        name: "Title",
        type: "TEXT",
        style: { fontFamily: "Inter", fontSize: 16, lineHeightPx: 24 }
      }
    ]
  };

  const r = exportTokensByScanningNodeSubtree({ rootNodeId: "1:1", rootDocument: root });
  const fam = Object.keys(r.tokens).find((k) => k.endsWith(".fontFamily"))!;
  expect(r.tokens[fam]).toEqual({ kind: "string", value: "Inter" });
});

