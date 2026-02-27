import { readFile } from "node:fs/promises";

export async function readJsonFile(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    throw new Error(`Invalid JSON: ${path}`);
  }
}

