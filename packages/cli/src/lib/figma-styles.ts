export type TokenValue =
  | { kind: "color"; rgba: { r: number; g: number; b: number; a: number } }
  | { kind: "number"; value: number; unit: "px" | "ratio" }
  | { kind: "string"; value: string }
  | { kind: "box"; unit: "px"; top: number; right: number; bottom: number; left: number }
  | { kind: "ref"; token: string };

export type TokenMap = Record<string, TokenValue>;

export function toTokenKey(name: string): string {
  const s = name.trim();
  const replaced = s.replace(/[\/:]+/g, ".").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "-");
  return replaced.replace(/\.+/g, ".").replace(/-+/g, "-").replace(/^\.+|\.+$/g, "");
}

function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 255) return 255;
  return Math.round(n);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function rgba01ToToken(v: any): TokenValue {
  const r = typeof v?.r === "number" ? v.r : 0;
  const g = typeof v?.g === "number" ? v.g : 0;
  const b = typeof v?.b === "number" ? v.b : 0;
  const a = typeof v?.a === "number" ? v.a : 1;
  return {
    kind: "color",
    rgba: { r: clampByte(r * 255), g: clampByte(g * 255), b: clampByte(b * 255), a: clamp01(a) }
  };
}

function getPaintSolidColor01(paint: any): any | null {
  if (!paint || typeof paint !== "object") return null;
  if (String(paint.type ?? "").toUpperCase() !== "SOLID") return null;
  const c = paint.color;
  if (!c || typeof c !== "object") return null;
  // Some responses include paint.opacity separate from color.a.
  const a = typeof paint.opacity === "number" ? paint.opacity : c.a;
  return { r: c.r, g: c.g, b: c.b, a: typeof a === "number" ? a : 1 };
}

export type ExportFromFileStylesResult = {
  tokens: TokenMap;
  exported: number;
  skipped: number;
  notes: string[];
};

export function exportTokensFromFileStyles(input: {
  styles: Record<string, any> | undefined;
  nodesById: Record<string, any | null>;
  prefix?: { fill?: string; text?: string };
}): ExportFromFileStylesResult {
  const styles = input.styles ?? {};
  const tokens: TokenMap = {};
  const notes: string[] = [];
  let exported = 0;
  let skipped = 0;

  const fillPrefix = input.prefix?.fill ?? "color";
  const textPrefix = input.prefix?.text ?? "text";

  for (const style of Object.values(styles)) {
    const name = typeof style?.name === "string" ? style.name : "";
    const styleType = String(style?.styleType ?? style?.style_type ?? "").toUpperCase();
    const nodeId = typeof style?.node_id === "string" ? style.node_id : typeof style?.nodeId === "string" ? style.nodeId : "";
    if (!name || !styleType || !nodeId) {
      skipped++;
      continue;
    }

    const nodeWrap = input.nodesById[nodeId] ?? null;
    const node = nodeWrap?.document ?? nodeWrap ?? null;
    if (!node) {
      skipped++;
      continue;
    }

    const baseKey = toTokenKey(name);

    if (styleType === "FILL") {
      const fills = Array.isArray(node.fills) ? node.fills : [];
      const solid = fills.map(getPaintSolidColor01).find(Boolean);
      if (!solid) {
        skipped++;
        continue;
      }
      tokens[`${fillPrefix}.${baseKey}`] = rgba01ToToken(solid);
      exported++;
      continue;
    }

    if (styleType === "TEXT") {
      const st = node.style ?? {};
      const fontFamily = typeof st.fontFamily === "string" ? st.fontFamily : "";
      const fontSize = typeof st.fontSize === "number" ? st.fontSize : NaN;
      const lineHeightPx = typeof st.lineHeightPx === "number" ? st.lineHeightPx : NaN;
      if (!fontFamily && !Number.isFinite(fontSize) && !Number.isFinite(lineHeightPx)) {
        skipped++;
        continue;
      }

      if (fontFamily) {
        tokens[`${textPrefix}.${baseKey}.fontFamily`] = { kind: "string", value: fontFamily };
        exported++;
      }
      if (Number.isFinite(fontSize)) {
        tokens[`${textPrefix}.${baseKey}.fontSize`] = { kind: "number", value: fontSize, unit: "px" };
        exported++;
      }
      if (Number.isFinite(lineHeightPx)) {
        tokens[`${textPrefix}.${baseKey}.lineHeight`] = { kind: "number", value: lineHeightPx, unit: "px" };
        exported++;
      } else if (Number.isFinite(fontSize) && typeof st.lineHeightPercent === "number") {
        // Optional: export ratio if px not present.
        const ratio = st.lineHeightPercent / 100;
        tokens[`${textPrefix}.${baseKey}.lineHeight`] = { kind: "number", value: ratio, unit: "ratio" };
        exported++;
        notes.push(`Exported ratio lineHeight for text style "${name}" (no lineHeightPx)`); // informational
      }
      continue;
    }

    // Other style types exist (EFFECT, GRID, etc.). Skip for v1.
    skipped++;
  }

  if (Object.keys(styles).length === 0) {
    notes.push("No styles found in file response. This usually means the file has no local styles.");
  }

  return { tokens, exported, skipped, notes };
}

