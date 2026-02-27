export type ParsedRgba = { r: number; g: number; b: number; a: number };

function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 255) return 255;
  return Math.round(n);
}

export function normalizeRgbaToBytes(v: ParsedRgba) {
  // Represent alpha as 0..255 so tolerance can be a single scale.
  return { r: clampByte(v.r), g: clampByte(v.g), b: clampByte(v.b), a: clampByte(v.a * 255) };
}

export function parseCssColor(input: string): ParsedRgba | null {
  const s = input.trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  // rgb(1,2,3) or rgba(1,2,3,0.5)
  const rgb = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+)\s*)?\)$/);
  if (rgb) {
    const r = Number(rgb[1]);
    const g = Number(rgb[2]);
    const b = Number(rgb[3]);
    const a = rgb[4] === undefined ? 1 : Number(rgb[4]);
    if (![r, g, b, a].every(Number.isFinite)) return null;
    return { r, g, b, a };
  }

  // #rgb, #rgba, #rrggbb, #rrggbbaa
  const hex = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    const h = hex[1]!;
    const expand = (c: string) => c + c;
    const rr = h.length === 3 || h.length === 4 ? expand(h[0]!) : h.slice(0, 2);
    const gg = h.length === 3 || h.length === 4 ? expand(h[1]!) : h.slice(2, 4);
    const bb = h.length === 3 || h.length === 4 ? expand(h[2]!) : h.slice(4, 6);
    const aa = h.length === 4 ? expand(h[3]!) : h.length === 8 ? h.slice(6, 8) : "ff";
    const r = parseInt(rr, 16);
    const g = parseInt(gg, 16);
    const b = parseInt(bb, 16);
    const a = parseInt(aa, 16) / 255;
    return { r, g, b, a };
  }

  return null;
}

export function parseCssPx(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (s === "") return null;
  const m = s.match(/^(-?[0-9.]+)px$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function normalizeFontFamilyList(input: string): string[] {
  // Computed styles look like: "\"Inter\", system-ui, -apple-system, sans-serif"
  return input
    .split(",")
    .map((p) => p.trim().replace(/^['"]|['"]$/g, "").toLowerCase())
    .filter(Boolean);
}

