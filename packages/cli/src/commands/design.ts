import { listPaths, parsePluginExport } from "@alignui/core";
import { readJsonFile } from "../lib/json.js";
import { ExitCode } from "../lib/exit-codes.js";

type DesignLsOpts = {
  inPath?: string;
  contains?: string;
  type?: string;
  max?: number;
};

export async function runDesignLs(opts: DesignLsOpts): Promise<number> {
  const inPath = opts.inPath ?? "report.json";
  const raw = await readJsonFile(inPath);
  const parsed = parsePluginExport(raw);
  if (!parsed.ok) {
    const msg = parsed.errors.map((e) => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`Invalid plugin export (${inPath}):\n${msg}`);
  }

  const paths = listPaths(parsed.value, { contains: opts.contains, type: opts.type, max: opts.max });
  for (const p of paths) {
    console.log(JSON.stringify(p));
  }
  return ExitCode.Ok;
}

