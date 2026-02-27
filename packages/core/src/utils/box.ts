import { parseCssPx } from "./normalize.js";

export type BoxPx = { top: number; right: number; bottom: number; left: number };

export function parseCssBoxPx(input: string): BoxPx | null {
  const parts = input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 1 || parts.length > 4) return null;

  const nums = parts.map((p) => parseCssPx(p));
  if (nums.some((n) => n === null)) return null;
  const v = nums as number[];

  if (v.length === 1) return { top: v[0]!, right: v[0]!, bottom: v[0]!, left: v[0]! };
  if (v.length === 2) return { top: v[0]!, right: v[1]!, bottom: v[0]!, left: v[1]! };
  if (v.length === 3) return { top: v[0]!, right: v[1]!, bottom: v[2]!, left: v[1]! };
  return { top: v[0]!, right: v[1]!, bottom: v[2]!, left: v[3]! };
}

