import { validateScanConfig, type ScanConfig, type StyleSnapshot } from "@designlatch/core";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { ExitCode } from "../lib/exit-codes.js";
import { loadConfigInput, sliceRulesBySource } from "../lib/config-loader.js";

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

type SelectorStep = Extract<Step, { selector: string }>;

type StepValidator = (input: Record<string, unknown>, path: string, errors: string[]) => Step | null;
type StepRunner<T extends Step = Step> = (page: Page, step: T) => Promise<void>;

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

function validateSelectorStep<T extends SelectorStep["type"]>(
  type: T,
  input: Record<string, unknown>,
  path: string,
  errors: string[]
): Extract<Step, { type: T }> | null {
  if (!isString(input.selector)) {
    errors.push(`${path}.selector: Expected string`);
    return null;
  }
  return { type, selector: input.selector } as Extract<Step, { type: T }>;
}

const stepValidators: Record<Step["type"], StepValidator> = {
  click: (input, path, errors) => validateSelectorStep("click", input, path, errors),
  hover: (input, path, errors) => validateSelectorStep("hover", input, path, errors),
  focus: (input, path, errors) => validateSelectorStep("focus", input, path, errors),
  scrollIntoView: (input, path, errors) => validateSelectorStep("scrollIntoView", input, path, errors),
  waitForSelector: (input, path, errors) => validateSelectorStep("waitForSelector", input, path, errors),
  type: (input, path, errors) => {
    if (!isString(input.selector)) errors.push(`${path}.selector: Expected string`);
    if (!isString(input.text)) errors.push(`${path}.text: Expected string`);
    if (!isString(input.selector) || !isString(input.text)) return null;
    return { type: "type", selector: input.selector, text: input.text };
  },
  press: (input, path, errors) => {
    if (!isString(input.selector)) errors.push(`${path}.selector: Expected string`);
    if (!isString(input.key)) errors.push(`${path}.key: Expected string`);
    if (!isString(input.selector) || !isString(input.key)) return null;
    return { type: "press", selector: input.selector, key: input.key };
  },
  waitForTimeout: (input, path, errors) => {
    if (!isNumber(input.ms)) {
      errors.push(`${path}.ms: Expected number`);
      return null;
    }
    return { type: "waitForTimeout", ms: input.ms };
  }
};

const stepRunners: { [K in Step["type"]]: StepRunner<Extract<Step, { type: K }>> } = {
  click: async (page, step) => await page.click(step.selector),
  hover: async (page, step) => await page.hover(step.selector),
  focus: async (page, step) => await page.focus(step.selector),
  type: async (page, step) => await page.type(step.selector, step.text),
  press: async (page, step) => await page.press(step.selector, step.key),
  scrollIntoView: async (page, step) => await page.locator(step.selector).scrollIntoViewIfNeeded(),
  waitForSelector: async (page, step) => { await page.waitForSelector(step.selector); },
  waitForTimeout: async (page, step) => await page.waitForTimeout(step.ms)
};

function parseStep(input: unknown, path: string, errors: string[]): Step | null {
  if (!isRecord(input)) {
    errors.push(`${path}: Expected object`);
    return null;
  }
  if (!isString(input.type)) {
    errors.push(`${path}.type: Expected string`);
    return null;
  }

  const validator = stepValidators[input.type as Step["type"]];
  if (!validator) {
    errors.push(`${path}.type: Unknown step type "${input.type}"`);
    return null;
  }
  return validator(input, path, errors);
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
    const runner = stepRunners[step.type] as StepRunner;
    await runner(page, step);
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
  const loaded = await loadConfigInput(configPath);
  const validated = validateScanConfig(loaded.configRaw);
  if (!validated.ok) {
    const msg = validated.errors.map((e: ErrItem) => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`Invalid config (${loaded.configPath}):\n${msg}`);
  }
  const config: ScanConfig = validated.value;
  const extras = validateCollectExtras(loaded.configRaw);
  const ruleGroups = sliceRulesBySource(config, loaded.ruleSources);

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

    const snapshots: StyleSnapshot[] = [];
    let extrasOffset = 0;

    for (const group of ruleGroups) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      if (waitFor) await page.waitForSelector(waitFor);

      for (const rule of group.rules) {
        const ruleExtras = extras.ruleExtras[extrasOffset] ?? {};
        extrasOffset++;
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
    }

    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(snapshots, null, 2), "utf8");
    console.log(`Wrote ${outPath} (${snapshots.length} snapshot(s))`);
    return ExitCode.Ok;
  } finally {
    await browser.close();
  }
}
