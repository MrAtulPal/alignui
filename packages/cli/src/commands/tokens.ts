import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getFile, getLocalVariables, getNodes } from "../lib/figma.js";
import { ExitCode } from "../lib/exit-codes.js";
import { exportTokensFromFileStyles, rgba01ToToken, toTokenKey, type TokenMap } from "../lib/figma-styles.js";

type TokensOpts = {
  figmaFile?: string;
  figmaToken?: string;
  out?: string;
  collection?: string;
  mode?: string;
  prefixCollection?: boolean;
  floatUnit?: "px" | "ratio";
  source?: "auto" | "variables" | "file";
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function exportFromFileStyles(fileKey: string, figmaToken: string, outPath: string): Promise<{ tokens: TokenMap; meta: string }> {
  // Use shallow depth to avoid huge responses.
  const file = await getFile(fileKey, figmaToken, { depth: 1 });
  const styles = file.styles ?? {};

  const styleValues = Object.values(styles);
  const nodeIds = styleValues
    .map((s) => (typeof s?.node_id === "string" ? s.node_id : typeof s?.nodeId === "string" ? s.nodeId : ""))
    .filter((id) => id.length > 0);

  const nodesById: Record<string, any | null> = {};
  for (const ids of chunk(nodeIds, 50)) {
    const resp = await getNodes(fileKey, figmaToken, ids);
    for (const [id, wrap] of Object.entries(resp.nodes ?? {})) nodesById[id] = wrap;
  }

  const r = exportTokensFromFileStyles({ styles, nodesById });
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(r.tokens, null, 2), "utf8");

  const note = r.notes.length ? ` notes=${r.notes.length}` : "";
  const meta = `Source: Figma file_content styles file=${fileKey} styles=${Object.keys(styles).length} exported=${Object.keys(r.tokens).length} skipped=${r.skipped}${note}`;
  return { tokens: r.tokens, meta };
}

export async function runTokens(opts: TokensOpts): Promise<number> {
  const fileKey = opts.figmaFile;
  const figmaToken = opts.figmaToken ?? process.env.FIGMA_TOKEN;
  if (!fileKey) throw new Error("Missing --figma-file <key>.");
  if (!figmaToken) throw new Error("Missing --figma-token <token> (or set FIGMA_TOKEN env var).");

  const outPath = opts.out ?? "alignui/tokens.json";
  const floatUnit = opts.floatUnit ?? "px";
  const source = opts.source ?? "auto";

  if (source === "file") {
    const r = await exportFromFileStyles(fileKey, figmaToken, outPath);
    console.log(`Wrote ${outPath}`);
    console.log(r.meta);
    return ExitCode.Ok;
  }

  // variables or auto
  let resp: Awaited<ReturnType<typeof getLocalVariables>> | null = null;
  let variablesError: string | null = null;
  try {
    resp = await getLocalVariables(fileKey, figmaToken);
  } catch (e) {
    variablesError = e instanceof Error ? e.message : String(e);
    resp = null;
    if (source === "variables") {
      throw new Error(
        `${variablesError}\nNote: Figma variables API requires Enterprise + file_variables:read scope. If unavailable, rerun with --source file (uses file_content:read styles).`
      );
    }
  }

  if (!resp) {
    const r = await exportFromFileStyles(fileKey, figmaToken, outPath);
    console.log(`Wrote ${outPath}`);
    console.log(`Variables API failed, fell back to file styles. Error: ${variablesError}`);
    console.log(r.meta);
    return ExitCode.Ok;
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
