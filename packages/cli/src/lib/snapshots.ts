import type { StyleSnapshot } from "@designlatch/core";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseSnapshots(input: unknown): StyleSnapshot[] {
  if (!Array.isArray(input)) throw new Error("snapshots: expected an array");
  const out: StyleSnapshot[] = [];
  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    if (!isRecord(row)) throw new Error(`snapshots[${i}]: expected object`);
    if (typeof row.selector !== "string") throw new Error(`snapshots[${i}].selector: expected string`);
    if (typeof row.url !== "string") throw new Error(`snapshots[${i}].url: expected string`);
    if (!isRecord(row.computed)) throw new Error(`snapshots[${i}].computed: expected object`);
    const computed: Record<string, string> = {};
    for (const [k, v] of Object.entries(row.computed)) {
      if (typeof v === "string") computed[k] = v;
    }
    out.push({ selector: row.selector, url: row.url, computed });
  }
  return out;
}

