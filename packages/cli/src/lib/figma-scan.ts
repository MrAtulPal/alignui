import { rgba01ToToken, toTokenKey, type TokenMap, type TokenValue } from "./figma-styles.js";

type IndexEntry = {
  key: string;
  kind: TokenValue["kind"];
  count: number;
  examples: Array<{ nodeId?: string; nodeName?: string; nodeType?: string; path?: string }>;
};

export type ScanIndex = {
  meta: { rootNode: string; exported: number; uniqueColors: number; uniqueTextStyles: number };
  byKey: Record<string, IndexEntry>;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function byteToHex(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return v.toString(16).padStart(2, "0");
}

function rgbaTokenToHex8(v: TokenValue): string | null {
  if (v.kind !== "color") return null;
  const r = byteToHex(v.rgba.r);
  const g = byteToHex(v.rgba.g);
  const b = byteToHex(v.rgba.b);
  const a = byteToHex(clamp01(v.rgba.a) * 255);
  return `${r}${g}${b}${a}`.toLowerCase();
}

function stableTextKey(fontFamily: string, fontSizePx: number | null, lineHeight: { unit: "px" | "ratio"; value: number } | null): string {
  const fam = toTokenKey(fontFamily || "unknown");
  const fs = fontSizePx !== null && Number.isFinite(fontSizePx) ? `fs${Math.round(fontSizePx)}` : "fsna";
  const lh =
    lineHeight && Number.isFinite(lineHeight.value)
      ? lineHeight.unit === "px"
        ? `lh${Math.round(lineHeight.value)}`
        : `lhr${Math.round(lineHeight.value * 1000) / 1000}`
      : "lhna";
  return `${fam}.${fs}.${lh}`;
}

function addIndex(idx: ScanIndex, key: string, kind: TokenValue["kind"], ex: IndexEntry["examples"][number]) {
  const cur = idx.byKey[key];
  if (!cur) {
    idx.byKey[key] = { key, kind, count: 1, examples: [ex] };
    return;
  }
  cur.count++;
  if (cur.examples.length < 5) cur.examples.push(ex);
}

function nodeName(n: any): string {
  return typeof n?.name === "string" ? n.name : "";
}

function nodeType(n: any): string {
  return typeof n?.type === "string" ? n.type : "";
}

function nodeId(n: any): string {
  return typeof n?.id === "string" ? n.id : "";
}

function walk(node: any, path: string[], visit: (n: any, p: string[]) => void) {
  if (!node || typeof node !== "object") return;
  visit(node, path);
  const kids = Array.isArray(node.children) ? node.children : [];
  for (const c of kids) {
    const nm = nodeName(c);
    walk(c, nm ? [...path, nm] : path, visit);
  }
}

function firstSolidFillToken(node: any): TokenValue | null {
  const fills = Array.isArray(node?.fills) ? node.fills : [];
  for (const p of fills) {
    if (!p || typeof p !== "object") continue;
    if (String(p.type ?? "").toUpperCase() !== "SOLID") continue;
    const c = p.color;
    if (!c || typeof c !== "object") continue;
    const aBase = typeof c.a === "number" ? c.a : 1;
    const opacity = typeof p.opacity === "number" ? p.opacity : 1;
    const tok = rgba01ToToken({ r: c.r, g: c.g, b: c.b, a: clamp01(aBase) * clamp01(opacity) });
    return tok;
  }
  return null;
}

function extractTextTuple(node: any): { fontFamily: string; fontSizePx: number | null; lineHeight: { unit: "px" | "ratio"; value: number } | null } | null {
  const st = node?.style;
  if (!st || typeof st !== "object") return null;
  const fontFamily = typeof st.fontFamily === "string" ? st.fontFamily : "";
  const fontSizePx = typeof st.fontSize === "number" && Number.isFinite(st.fontSize) ? st.fontSize : null;
  const lineHeightPx = typeof st.lineHeightPx === "number" && Number.isFinite(st.lineHeightPx) ? st.lineHeightPx : null;
  const lineHeightPercent = typeof st.lineHeightPercent === "number" && Number.isFinite(st.lineHeightPercent) ? st.lineHeightPercent : null;
  const lineHeight =
    lineHeightPx !== null
      ? { unit: "px" as const, value: lineHeightPx }
      : lineHeightPercent !== null
        ? { unit: "ratio" as const, value: lineHeightPercent / 100 }
        : null;
  if (!fontFamily && fontSizePx === null && lineHeight === null) return null;
  return { fontFamily, fontSizePx, lineHeight };
}

export function exportTokensByScanningNodeSubtree(input: { rootNodeId: string; rootDocument: any }): { tokens: TokenMap; index: ScanIndex } {
  const tokens: TokenMap = {};
  const index: ScanIndex = { meta: { rootNode: input.rootNodeId, exported: 0, uniqueColors: 0, uniqueTextStyles: 0 }, byKey: {} };

  const seenColor = new Set<string>();
  const seenText = new Set<string>();

  walk(input.rootDocument, [nodeName(input.rootDocument) || input.rootNodeId], (n, p) => {
    const ex = { nodeId: nodeId(n) || undefined, nodeName: nodeName(n) || undefined, nodeType: nodeType(n) || undefined, path: p.join(" / ") };

    const fillTok = firstSolidFillToken(n);
    if (fillTok && fillTok.kind === "color") {
      const hex8 = rgbaTokenToHex8(fillTok);
      if (hex8) {
        const key = `color.hex.${hex8}`;
        if (!seenColor.has(key)) {
          tokens[key] = fillTok;
          seenColor.add(key);
        }
        addIndex(index, key, "color", ex);
      }
    }

    if (nodeType(n) === "TEXT") {
      const t = extractTextTuple(n);
      if (t) {
        const base = stableTextKey(t.fontFamily, t.fontSizePx, t.lineHeight);
        const famKey = `text.${base}.fontFamily`;
        const sizeKey = `text.${base}.fontSize`;
        const lhKey = `text.${base}.lineHeight`;

        if (t.fontFamily) {
          if (!seenText.has(famKey)) tokens[famKey] = { kind: "string", value: t.fontFamily };
          seenText.add(famKey);
          addIndex(index, famKey, "string", ex);
        }
        if (t.fontSizePx !== null) {
          if (!seenText.has(sizeKey)) tokens[sizeKey] = { kind: "number", value: t.fontSizePx, unit: "px" };
          seenText.add(sizeKey);
          addIndex(index, sizeKey, "number", ex);
        }
        if (t.lineHeight) {
          if (!seenText.has(lhKey)) tokens[lhKey] = { kind: "number", value: t.lineHeight.value, unit: t.lineHeight.unit };
          seenText.add(lhKey);
          addIndex(index, lhKey, "number", ex);
        }
      }
    }
  });

  index.meta.exported = Object.keys(tokens).length;
  index.meta.uniqueColors = Array.from(seenColor).length;
  // text tokens are 3-per-tuple; approximate unique tuples by counting fontFamily keys
  index.meta.uniqueTextStyles = Object.keys(tokens).filter((k) => k.endsWith(".fontFamily") && k.startsWith("text.")).length;

  return { tokens, index };
}

