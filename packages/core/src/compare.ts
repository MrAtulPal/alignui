import type { Rule, RuleResult, ScanReport, StyleSnapshot, TokenMap, TokenValue } from "./types.js";

function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 255) return 255;
  return Math.round(n);
}

function normalizeRgba(v: { r: number; g: number; b: number; a: number }) {
  // Store alpha as 0..255 too, so we can use a single tolerance scale.
  return { r: clampByte(v.r), g: clampByte(v.g), b: clampByte(v.b), a: clampByte(v.a * 255) };
}

function parseCssColor(input: string): { r: number; g: number; b: number; a: number } | null {
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
    const aa =
      h.length === 4 ? expand(h[3]!) : h.length === 8 ? h.slice(6, 8) : "ff";
    const r = parseInt(rr, 16);
    const g = parseInt(gg, 16);
    const b = parseInt(bb, 16);
    const a = parseInt(aa, 16) / 255;
    return { r, g, b, a };
  }

  return null;
}

function parseCssPx(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (s === "") return null;
  const m = s.match(/^(-?[0-9.]+)px$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function normalizeFontFamilyList(input: string): string[] {
  // Computed styles look like: "\"Inter\", system-ui, -apple-system, sans-serif"
  return input
    .split(",")
    .map((p) => p.trim().replace(/^['"]|['"]$/g, "").toLowerCase())
    .filter(Boolean);
}

function compareTokenToActual(expected: TokenValue, actual: string, tolerance: { kind: "px"; value: number } | { kind: "rgba"; value: number } | undefined): { pass: boolean; details?: string } {
  if (expected.kind === "color") {
    const a = parseCssColor(actual);
    if (!a) return { pass: false, details: `Unparseable CSS color: ${actual}` };
    const exp = normalizeRgba(expected.rgba);
    const act = normalizeRgba(a);
    const delta = Math.max(
      Math.abs(exp.r - act.r),
      Math.abs(exp.g - act.g),
      Math.abs(exp.b - act.b),
      Math.abs(exp.a - act.a)
    );
    const tol = tolerance?.kind === "rgba" ? tolerance.value : 0;
    return delta <= tol ? { pass: true } : { pass: false, details: `Color delta ${delta} > ${tol}` };
  }

  if (expected.kind === "number") {
    if (expected.unit !== "px") return { pass: false, details: `Unsupported number unit: ${expected.unit}` };
    const n = parseCssPx(actual);
    if (n === null) return { pass: false, details: `Unparseable px value: ${actual}` };
    const delta = Math.abs(expected.value - n);
    const tol = tolerance?.kind === "px" ? tolerance.value : 0;
    return delta <= tol ? { pass: true } : { pass: false, details: `Px delta ${delta} > ${tol}` };
  }

  // string
  const exp = expected.value.trim().toLowerCase();
  const act = actual.trim().toLowerCase();
  if (exp === act) return { pass: true };

  // Special-case font family: expected "Inter" should match within computed list.
  if (act.includes(",") || exp.includes(" ")) {
    const fams = normalizeFontFamilyList(actual);
    if (fams.includes(exp)) return { pass: true };
  }
  return { pass: false, details: `String mismatch: expected "${expected.value}", got "${actual}"` };
}

function getSeverity(rule: Rule, property: string): "error" | "warn" {
  return rule.properties[property]?.severity ?? "error";
}

export function compare(tokens: TokenMap, snapshots: StyleSnapshot[], rules: Rule[]): ScanReport {
  const startedAt = new Date().toISOString();
  const results: RuleResult[] = [];

  const snapshotBySelector = new Map<string, StyleSnapshot>();
  for (const snap of snapshots) snapshotBySelector.set(snap.selector, snap);

  for (const rule of rules) {
    const snap = snapshotBySelector.get(rule.selector);
    for (const [property, spec] of Object.entries(rule.properties)) {
      const expected: TokenValue | null = tokens[spec.token] ?? null;
      const actual: string | null = snap?.computed[property] ?? null;
      let pass = false;
      let details: string | undefined;
      if (expected === null) {
        details = `Missing token: ${spec.token}`;
      } else if (actual === null) {
        details = `Missing computed style: ${property}`;
      } else {
        const r = compareTokenToActual(expected, actual, spec.tolerance);
        pass = r.pass;
        details = r.details;
      }

      results.push({
        ruleId: rule.id,
        selector: rule.selector,
        property,
        token: spec.token,
        expected,
        actual,
        pass,
        severity: getSeverity(rule, property),
        details: pass ? undefined : details
      });
    }
  }

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  const score = total === 0 ? 100 : Math.round((passed / total) * 1000) / 10;

  // Use first snapshot URL if present; CLI will set this reliably.
  const url = snapshots[0]?.url ?? "";
  return { meta: { startedAt, url }, results, summary: { total, passed, failed, score } };
}
