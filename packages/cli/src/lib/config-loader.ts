import type { ScanConfig } from "@designlatch/core";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { readJsonFile } from "./json.js";

type RuleSource = {
  filePath: string;
  ruleCount: number;
};

type LoadedConfigInput = {
  configPath: string;
  configRaw: unknown;
  ruleSources: RuleSource[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function configError(message: string): never {
  throw new Error(`Invalid config input: ${message}`);
}

async function loadDirectoryConfig(dirPath: string): Promise<LoadedConfigInput> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(dirPath, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

  if (files.length === 0) {
    configError(`No .json config files found in directory: ${dirPath}`);
  }

  const mergedRules: unknown[] = [];
  const ruleSources: RuleSource[] = [];
  let url: unknown;
  let thresholds: unknown;
  let defaults: unknown;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]!;
    const raw = await readJsonFile(filePath);
    if (!isRecord(raw)) configError(`${filePath}: expected object`);
    if (!Array.isArray(raw.rules)) configError(`${filePath}: expected rules array`);

    if (i === 0) {
      url = raw.url;
      thresholds = raw.thresholds;
      defaults = raw.defaults;
    }

    mergedRules.push(...raw.rules);
    ruleSources.push({ filePath, ruleCount: raw.rules.length });
  }

  return {
    configPath: dirPath,
    configRaw: {
      url,
      thresholds,
      defaults,
      rules: mergedRules
    },
    ruleSources
  };
}

export async function loadConfigInput(configPath: string): Promise<LoadedConfigInput> {
  const stats = await stat(configPath);
  if (stats.isDirectory()) return loadDirectoryConfig(configPath);

  const raw = await readJsonFile(configPath);
  return {
    configPath,
    configRaw: raw,
    ruleSources: [{ filePath: configPath, ruleCount: isRecord(raw) && Array.isArray(raw.rules) ? raw.rules.length : 0 }]
  };
}

export function sliceRulesBySource(config: ScanConfig, ruleSources: RuleSource[]): Array<{ filePath: string; rules: ScanConfig["rules"] }> {
  const out: Array<{ filePath: string; rules: ScanConfig["rules"] }> = [];
  let offset = 0;
  for (const source of ruleSources) {
    const rules = config.rules.slice(offset, offset + source.ruleCount);
    out.push({ filePath: source.filePath, rules });
    offset += source.ruleCount;
  }
  return out;
}
