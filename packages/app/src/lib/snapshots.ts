import type { StyleSnapshot } from "@designlatch/core";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSnapshots(input: unknown): StyleSnapshot[] {
  if (!Array.isArray(input)) throw new Error("snapshots: expected an array");

  const snapshots: StyleSnapshot[] = [];
  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    if (!isRecord(row)) throw new Error(`snapshots[${i}]: expected object`);
    if (typeof row.selector !== "string") throw new Error(`snapshots[${i}].selector: expected string`);
    if (typeof row.url !== "string") throw new Error(`snapshots[${i}].url: expected string`);
    if (!isRecord(row.computed)) throw new Error(`snapshots[${i}].computed: expected object`);

    const computed: Record<string, string> = {};
    for (const [key, value] of Object.entries(row.computed)) {
      if (typeof value === "string") computed[key] = value;
    }

    const snapshot: StyleSnapshot = {
      selector: row.selector,
      url: row.url,
      computed
    };

    if (typeof row.text === "string") snapshot.text = row.text;
    snapshots.push(snapshot);
  }

  return snapshots;
}
