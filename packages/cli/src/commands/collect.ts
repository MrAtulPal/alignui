import { validateScanConfig, type ScanConfig, type StyleSnapshot } from "@alignui/core";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { readJsonFile } from "../lib/json.js";
import { ExitCode } from "../lib/exit-codes.js";

type CollectOpts = {
  configPath?: string;
  url?: string;
  out?: string;
  timeoutMs?: number;
  waitFor?: string;
  headed?: boolean;
};

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
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
  const configPath = opts.configPath ?? ".alignui.json";
  const configRaw = await readJsonFile(configPath);
  const validated = validateScanConfig(configRaw);
  if (!validated.ok) {
    const msg = validated.errors.map((e) => `${e.path}: ${e.message}`).join("\n");
    throw new Error(`Invalid config (${configPath}):\n${msg}`);
  }
  const config: ScanConfig = validated.value;

  const url = opts.url ?? config.url;
  if (!url) throw new Error("Missing url (provide --url or config.url).");

  const outPath = opts.out ?? "alignui/snapshots.json";
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

    for (const rule of config.rules) {
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

