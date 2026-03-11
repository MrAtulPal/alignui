import { exportTokensFromFileStyles } from "./figma-styles.js";

test("exportTokensFromFileStyles exports FILL style as color token", () => {
  const styles = {
    s1: { name: "Brand/Primary", styleType: "FILL", node_id: "1:2" }
  };
  const nodesById = {
    "1:2": {
      document: {
        fills: [{ type: "SOLID", color: { r: 1, g: 0.5, b: 0, a: 1 } }]
      }
    }
  };

  const r = exportTokensFromFileStyles({ styles, nodesById });
  expect(r.tokens["color.Brand.Primary"]?.kind).toBe("color");
  const v = r.tokens["color.Brand.Primary"] as any;
  expect(v.rgba.r).toBe(255);
  expect(v.rgba.g).toBe(128);
});

test("exportTokensFromFileStyles exports TEXT style as typography tokens", () => {
  const styles = {
    s1: { name: "Body/Default", styleType: "TEXT", node_id: "9:9" }
  };
  const nodesById = {
    "9:9": {
      document: {
        style: { fontFamily: "Inter", fontSize: 16, lineHeightPx: 24 }
      }
    }
  };

  const r = exportTokensFromFileStyles({ styles, nodesById });
  expect(r.tokens["text.Body.Default.fontFamily"]).toEqual({ kind: "string", value: "Inter" });
  expect(r.tokens["text.Body.Default.fontSize"]).toEqual({ kind: "number", value: 16, unit: "px" });
  expect(r.tokens["text.Body.Default.lineHeight"]).toEqual({ kind: "number", value: 24, unit: "px" });
});

