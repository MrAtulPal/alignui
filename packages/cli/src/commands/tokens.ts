import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getLocalVariables } from "../lib/figma.js";
import { ExitCode } from "../lib/exit-codes.js";

type TokensOpts = {
  figmaFile?: string;
  figmaToken?: string;
  out?: string;
  collection?: string;
  mode?: string;
  prefixCollection?: boolean;
  floatUnit?: "px" | "ratio";
};

type TokenValue =
  | { kind: "color"; rgba: { r: number; g: number; b: number; a: number } }
  | { kind: "number"; value: number; unit: "px" | "ratio" }
  | { kind: "string"; value: string }
  | { kind: "box"; unit: "px"; top: number; right: number; bottom: number; left: number }
  | { kind: "ref"; token: string };

type TokenMap = Record<string, TokenValue>;

function toTokenKey(name: string): string {
  // Figma variable names are often like "Color/Primary" or "Spacing/4".
  // Convert to a conservative dotted token key.
  const s = name.trim();
  const replaced = s.replace(/[\/:]+/g, ".").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "-");
  return replaced.replace(/\.+/g, ".").replace(/-+/g, "-").replace(/^\.+|\.+$/g, "");
}

function rgba01ToToken(v: any) {
  // Figma API returns r/g/b in 0..1, alpha 0..1.
  const r = typeof v?.r === "number" ? v.r : 0;
  const g = typeof v?.g === "number" ? v.g : 0;
  const b = typeof v?.b === "number" ? v.b : 0;
  const a = typeof v?.a === "number" ? v.a : 1;
  return {
    kind: "color" as const,
    rgba: { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a }
  };
}

export async function runTokens(opts: TokensOpts): Promise<number> {
  const fileKey = opts.figmaFile;
  const figmaToken = opts.figmaToken ?? process.env.FIGMA_TOKEN;
  if (!fileKey) throw new Error("Missing --figma-file <key>.");
  if (!figmaToken) throw new Error("Missing --figma-token <token> (or set FIGMA_TOKEN env var).");

  const outPath = opts.out ?? "alignui/tokens.json";
  const floatUnit = opts.floatUnit ?? "px";

  let resp;
  try {
    resp = await getLocalVariables(fileKey, figmaToken);
  } catch (e) {
    // Variables endpoint may be unavailable for non-Enterprise accounts.
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${msg}\nNote: Figma variables API requires Enterprise + file_variables:read scope. If unavailable, use a manual tokens.json for now.`);
  }

  const collections = Object.values(resp.meta.variableCollections);
  if (collections.length === 0) throw new Error("No variable collections found in file.");

  const chosenCollection =
    (opts.collection ? collections.find((c) => c.name === opts.collection) : undefined) ?? collections[0]!;
  const modes = chosenCollection.modes ?? [];
  if (modes.length === 0) throw new Error(`Variable collection has no modes: ${chosenCollection.name}`);

  const chosenMode =
    (opts.mode ? modes.find((m) => m.name === opts.mode) : undefined) ?? modes[0]!;

  const vars = Object.values(resp.meta.variables).filter((v) => v.variableCollectionId === chosenCollection.id);
  const idToName = new Map<string, string>();
  for (const v of vars) idToName.set(v.id, v.name);

  const tokens: TokenMap = {};
  for (const v of vars) {
    const raw = v.valuesByMode?.[chosenMode.modeId];
    if (raw === undefined) continue;

    const baseKey = toTokenKey(v.name);
    const key = opts.prefixCollection ? `${toTokenKey(chosenCollection.name)}.${baseKey}` : baseKey;

    if (v.resolvedType === "COLOR") {
      tokens[key] = rgba01ToToken(raw as any);
      continue;
    }
    if (v.resolvedType === "STRING") {
      tokens[key] = { kind: "string", value: String(raw) };
      continue;
    }
    if (v.resolvedType === "FLOAT") {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) continue;
      tokens[key] = { kind: "number", value: n, unit: floatUnit };
      continue;
    }

    // Variable alias (reference) object: { type: "VARIABLE_ALIAS", id: "..." }
    if (typeof raw === "object" && raw !== null && (raw as any).type === "VARIABLE_ALIAS") {
      const refId = String((raw as any).id ?? "");
      const refName = idToName.get(refId);
      if (refName) {
        const refKey = opts.prefixCollection ? `${toTokenKey(chosenCollection.name)}.${toTokenKey(refName)}` : toTokenKey(refName);
        tokens[key] = { kind: "ref", token: refKey };
      }
      continue;
    }
  }

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(tokens, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`Source: Figma file=${fileKey} collection="${chosenCollection.name}" mode="${chosenMode.name}" vars=${vars.length} exported=${Object.keys(tokens).length}`);
  return ExitCode.Ok;
}

