import { validateScanConfig, type ScanConfig, type StyleSnapshot } from "@designlatch/core";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { readJsonFile } from "../lib/json.js";
import { ExitCode } from "../lib/exit-codes.js";

type ErrItem = { path: string; message: string };


type CollectOpts = {
  configPath?: string;
  url?: string;
  out?: string;
  timeoutMs?: number;
  waitFor?: string;
  headed?: boolean;
};

type Step =
  | { type: "click"; selector: string }
  | { type: "hover"; selector: string }
  | { type: "focus"; selector: string }
  | { type: "type"; selector: string; text: string }
  | { type: "press"; selector: string; key: string }
  | { type: "scrollIntoView"; selector: string }
  | { type: "waitForSelector"; selector: string }
  | { type: "waitForTimeout"; ms: number };

type RuleExtras = {
  steps?: Step[];
  reloadPageBefore?: boolean;
};

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function parseStep(input: unknown, path: string, errors: string[]): Step | null {
  if (!isRecord(input)) {
    errors.push(`${path}: Expected object`);
    return null;
  }
  const type = input.type;
  if (!isString(type)) {
    errors.push(`${path}.type: Expected string`);
    return null;
  }

  const selector = input.selector;
  switch (type) {
    case "click":
    case "hover":
    case "focus":
    case "scrollIntoView":
    case "waitForSelector":
      if (!isString(selector)) {
        errors.push(`${path}.selector: Expected string`);
        return null;
      }
      return { type, selector };
    case "type": {
      const text = input.text;
      if (!isString(selector)) errors.push(`${path}.selector: Expected string`);
      if (!isString(text)) errors.push(`${path}.text: Expected string`);
      if (!isString(selector) || !isString(text)) return null;
      return { type, selector, text };
    }
    case "press": {
      const key = input.key;
      if (!isString(selector)) errors.push(`${path}.selector: Expected string`);
      if (!isString(key)) errors.push(`${path}.key: Expected string`);
      if (!isString(selector) || !isString(key)) return null;
      return { type, selector, key };
    }
    case "waitForTimeout": {
      const ms = input.ms;
      if (!isNumber(ms)) {
        errors.push(`${path}.ms: Expected number`);
        return null;
      }
      return { type, ms };
    }
    default:
      errors.push(`${path}.type: Unknown step type "${type}"`);
      return null;
  }
}

function validateCollectExtras(configRaw: unknown): { reloadPage?: boolean; ruleExtras: RuleExtras[] } {
  const errors: string[] = [];
  const ruleExtras: RuleExtras[] = [];

  if (!isRecord(configRaw)) {
    throw new Error("Invalid config: expected object");
  }

  const collectRaw = (configRaw as any).collect;
  let reloadPage: boolean | undefined;
  if (collectRaw !== undefined) {
    if (!isRecord(collectRaw)) {
      errors.push("$.collect: Expected object");
    } else if ("reloadPage" in collectRaw) {
      if (!isBoolean(collectRaw.reloadPage)) errors.push("$.collect.reloadPage: Expected boolean");
      else reloadPage = collectRaw.reloadPage;
    }
  }

  const rulesRaw = Array.isArray((configRaw as any).rules) ? ((configRaw as any).rules as unknown[]) : [];
  for (let i = 0; i < rulesRaw.length; i++) {
    const rule = rulesRaw[i];
    const extras: RuleExtras = {};
    const basePath = `$.rules[${i}]`;
    if (isRecord(rule)) {
      if ("reloadPageBefore" in rule) {
        if (!isBoolean(rule.reloadPageBefore)) errors.push(`${basePath}.reloadPageBefore: Expected boolean`);
        else extras.reloadPageBefore = rule.reloadPageBefore;
      }
      if ("steps" in rule) {
        if (!Array.isArray(rule.steps)) {
          errors.push(`${basePath}.steps: Expected array`);
        } else {
          const steps: Step[] = [];
          rule.steps.forEach((step, idx) => {
            const parsed = parseStep(step, `${basePath}.steps[${idx}]`, errors);
            if (parsed) steps.push(parsed);
          });
          extras.steps = steps;
        }
      }
    }
    ruleExtras.push(extras);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid collect config:\n${errors.join("\n")}`);
  }
  return { reloadPage, ruleExtras };
}

async function runSteps(page: Page, steps: Step[]): Promise<void> {
  for (const step of steps) {
    switch (step.type) {
      case "click":
        await page.click(step.selector);
        break;
      case "hover":
        await page.hover(step.selector);
        break;
      case "focus":
        await page.focus(step.selector);
        break;
      case "type":
        await page.type(step.selector, step.text);
        break;
      case "press":
        await page.press(step.selector, step.key);
        break;
      case "scrollIntoView":
        await page.locator(step.selector).scrollIntoViewIfNeeded();
        break;
      case "waitForSelector":
        await page.waitForSelector(step.selector);
        break;
      case "waitForTimeout":
        await page.waitForTimeout(step.ms);
        break;
    }
  }
}

async function collectForSelector(
  page: Page,
  selector: string,
  properties: string[]
): Promise<Pick<StyleSnapshot, "computed" | "text"> | null> {
  return page.evaluate(
    ({ selector, properties }) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const computed: Record<string, string> = {};
      for (const p of properties) {
        const v = (cs as any)[p] ?? cs.getPropertyValue(p);
        if (typeof v === "string") computed[p] = v.trim();
      }
      const text = (el.textContent ?? "").trim();
      return { computed, text: text.length ? text : undefined };
    },
    { selector, properties }
  );
}

export async function runCollect(opts: CollectOpts): Promise<number> {
  const configPath = opts.configPath ?? ".designlatch.json";
  const configRaw = await readJsonFile(configPath);
  const validated = validateScanConfig(configRaw);
  if (!validated.ok) {
    const msg = validated.errors.map((e: ErrItem) => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`Invalid config (${configPath}):\n${msg}`);
  }
  const config: ScanConfig = validated.value;
  const extras = validateCollectExtras(configRaw);

  const url = opts.url ?? config.url;
  if (!url) throw new Error("Missing url (provide --url or config.url).");

  const outPath = opts.out ?? "designlatch/snapshots.json";
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const waitFor = opts.waitFor;
  const headed = opts.headed ?? false;

  const browser = await chromium.launch({ headless: !headed });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);

    await page.goto(url, { waitUntil: "domcontentloaded" });
    if (waitFor) await page.waitForSelector(waitFor);

    const snapshots: StyleSnapshot[] = [];

    for (let i = 0; i < config.rules.length; i++) {
      const rule = config.rules[i]!;
      const ruleExtras = extras.ruleExtras[i] ?? {};
      const shouldReload = ruleExtras.reloadPageBefore ?? extras.reloadPage ?? false;
      if (shouldReload) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        if (waitFor) await page.waitForSelector(waitFor);
      }
      if (ruleExtras.steps && ruleExtras.steps.length > 0) {
        try {
          await runSteps(page, ruleExtras.steps);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(`Step failed for rule ${rule.id}: ${msg}`);
          continue;
        }
      }
      const properties = unique(Object.keys(rule.properties));
      const picked = await collectForSelector(page, rule.selector, properties);
      if (!picked) {
        console.log(`Missing selector: ${rule.selector}`);
        continue;
      }
      snapshots.push({ selector: rule.selector, url, computed: picked.computed, text: picked.text });
    }

    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(snapshots, null, 2), "utf8");
    console.log(`Wrote ${outPath} (${snapshots.length} snapshot(s))`);
    return ExitCode.Ok;
  } finally {
    await browser.close();
  }
}

