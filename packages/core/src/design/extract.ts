import type { Rgba, Rule, TokenValue } from "../domain/types.js";
import type { PluginNode } from "./plugin.js";

function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 255) return 255;
  return Math.round(n);
}

function clampAlpha(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function hexToRgba(hex: string): Rgba | null {
  const h = hex.trim().toLowerCase();
  if (!h.startsWith("#")) return null;
  const raw = h.slice(1);
  const ok = /^[0-9a-f]+$/.test(raw);
  if (!ok) return null;

  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  }
  if (raw.length === 8) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    const a = parseInt(raw.slice(6, 8), 16);
    return { r, g, b, a: a / 255 };
  }
  return null;
}

function firstSolidFillHex(node: PluginNode): string | null {
  const fills = node.fills ?? [];
  const solids = fills.filter((f) => (f.type ?? "").toUpperCase() === "SOLID" && typeof f.hex === "string" && f.hex.length > 0);
  if (solids.length === 0) return null;
  if (solids.length > 1) return null; // v1 strict: caller must disambiguate by choosing a different node
  return solids[0]!.hex ?? null;
}

export type ExtractExpectedResult = { ok: true; value: TokenValue } | { ok: false; error: string };

export function extractDesignExpected(node: PluginNode, property: string): ExtractExpectedResult {
  switch (property) {
    case "backgroundColor": {
      const hex = firstSolidFillHex(node);
      if (!hex) return { ok: false, error: "No unique SOLID fill with hex found for backgroundColor" };
      const rgba = hexToRgba(hex);
      if (!rgba) return { ok: false, error: `Unparseable hex: ${hex}` };
      return {
        ok: true,
        value: {
          kind: "color",
          rgba: { r: clampByte(rgba.r), g: clampByte(rgba.g), b: clampByte(rgba.b), a: clampAlpha(rgba.a) }
        }
      };
    }
    case "color": {
      if ((node.type ?? "") !== "TEXT") return { ok: false, error: `color requires a TEXT node (got type="${node.type ?? ""}")` };
      const hex = firstSolidFillHex(node);
      if (!hex) return { ok: false, error: "No unique SOLID fill with hex found for color" };
      const rgba = hexToRgba(hex);
      if (!rgba) return { ok: false, error: `Unparseable hex: ${hex}` };
      return {
        ok: true,
        value: {
          kind: "color",
          rgba: { r: clampByte(rgba.r), g: clampByte(rgba.g), b: clampByte(rgba.b), a: clampAlpha(rgba.a) }
        }
      };
    }
    case "padding": {
      const { paddingTop, paddingRight, paddingBottom, paddingLeft } = node;
      if ([paddingTop, paddingRight, paddingBottom, paddingLeft].some((v) => typeof v !== "number" || !Number.isFinite(v))) {
        return { ok: false, error: "Missing paddingTop/paddingRight/paddingBottom/paddingLeft" };
      }
      return {
        ok: true,
        value: { kind: "box", unit: "px", top: paddingTop!, right: paddingRight!, bottom: paddingBottom!, left: paddingLeft! }
      };
    }
    case "borderRadius": {
      if (typeof node.cornerRadius !== "number" || !Number.isFinite(node.cornerRadius)) return { ok: false, error: "Missing cornerRadius" };
      return { ok: true, value: { kind: "number", value: node.cornerRadius, unit: "px" } };
    }
    case "fontSize": {
      if (typeof node.fontSize !== "number" || !Number.isFinite(node.fontSize)) return { ok: false, error: "Missing fontSize" };
      return { ok: true, value: { kind: "number", value: node.fontSize, unit: "px" } };
    }
    case "fontFamily": {
      const family = node.fontName?.family;
      if (!family) return { ok: false, error: "Missing fontName.family" };
      return { ok: true, value: { kind: "string", value: family } };
    }
    case "lineHeight": {
      const lh = node.lineHeight;
      if (!lh || (lh.unit ?? "").toUpperCase() !== "PIXELS" || typeof lh.value !== "number" || !Number.isFinite(lh.value)) {
        return { ok: false, error: "Missing lineHeight.unit=PIXELS and lineHeight.value" };
      }
      return { ok: true, value: { kind: "number", value: lh.value, unit: "px" } };
    }
    default:
      return { ok: false, error: `Unsupported design property: ${property}` };
  }
}

export function designExpectedKey(rule: Rule, property: string): string {
  const segs = rule.design?.figmaPath ?? [];
  const path = segs.join(" / ");
  const t = rule.design?.figmaType ? `:${rule.design.figmaType}` : "";
  const n = typeof rule.design?.figmaNth === "number" ? `#${rule.design.figmaNth}` : "";
  return `design:${path}${t}${n}:${property}`;
}
