import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ExitCode } from "../lib/exit-codes.js";
import { __setChromiumLaunch } from "../test/playwright-mock.js";
import { runCollect } from "./collect.js";

async function writeJson(p: string, v: unknown) {
  await writeFile(p, JSON.stringify(v, null, 2), "utf8");
}

test("runCollect writes snapshots for configured selectors (mocked playwright)", async () => {
  const page = {
    setDefaultTimeout: (_ms: number) => {},
    goto: async (_url: string, _opts: any) => {},
    waitForSelector: async (_sel: string) => {},
    click: async (_sel: string) => {},
    hover: async (_sel: string) => {},
    focus: async (_sel: string) => {},
    type: async (_sel: string, _text: string) => {},
    press: async (_sel: string, _key: string) => {},
    waitForTimeout: async (_ms: number) => {},
    locator: (_sel: string) => ({ scrollIntoViewIfNeeded: async () => {} }),
    evaluate: async (_fn: any, args: any) => {
      if (args.selector === ".btn") {
        return { computed: { backgroundColor: "rgb(0, 0, 0)" }, text: "OK" };
      }
      return null;
    }
  };
  const browser = {
    newPage: async () => page,
    close: async () => {}
  };

  __setChromiumLaunch(async () => browser);

  const dir = await mkdtemp(path.join(os.tmpdir(), "designlatch-collect-"));
  const configPath = path.join(dir, "config.json");
  const outPath = path.join(dir, "snapshots.json");

  await writeJson(configPath, {
    url: "https://x.test",
    rules: [
      {
        id: "btn",
        selector: ".btn",
        properties: { backgroundColor: { token: "color.primary" } }
      }
    ]
  });

  const code = await runCollect({ configPath, out: outPath, url: "https://x.test", waitFor: "body", timeoutMs: 1000 });
  expect(code).toBe(ExitCode.Ok);

  const txt = await readFile(outPath, "utf8");
  const j = JSON.parse(txt) as any[];
  expect(j).toHaveLength(1);
  expect(j[0].selector).toBe(".btn");
  expect(j[0].computed.backgroundColor).toBe("rgb(0, 0, 0)");
});

test("runCollect executes steps and respects reloadPage settings", async () => {
  const calls: string[] = [];
  const page = {
    setDefaultTimeout: (_ms: number) => {},
    goto: async (url: string, _opts: any) => {
      calls.push(`goto:${url}`);
    },
    waitForSelector: async (sel: string) => {
      calls.push(`waitForSelector:${sel}`);
    },
    click: async (sel: string) => {
      calls.push(`click:${sel}`);
    },
    hover: async (sel: string) => {
      calls.push(`hover:${sel}`);
    },
    focus: async (sel: string) => {
      calls.push(`focus:${sel}`);
    },
    type: async (sel: string, text: string) => {
      calls.push(`type:${sel}:${text}`);
    },
    press: async (sel: string, key: string) => {
      calls.push(`press:${sel}:${key}`);
    },
    waitForTimeout: async (ms: number) => {
      calls.push(`waitForTimeout:${ms}`);
    },
    locator: (sel: string) => ({
      scrollIntoViewIfNeeded: async () => {
        calls.push(`scrollIntoView:${sel}`);
      }
    }),
    evaluate: async (_fn: any, args: any) => {
      if (args.selector === ".a") return { computed: { backgroundColor: "rgb(0, 0, 0)" } };
      if (args.selector === ".b") return { computed: { backgroundColor: "rgb(0, 0, 0)" } };
      return null;
    }
  };
  const browser = {
    newPage: async () => page,
    close: async () => {}
  };

  __setChromiumLaunch(async () => browser);

  const dir = await mkdtemp(path.join(os.tmpdir(), "designlatch-collect-"));
  const configPath = path.join(dir, "config.json");
  const outPath = path.join(dir, "snapshots.json");

  await writeJson(configPath, {
    url: "https://x.test",
    collect: { reloadPage: true },
    rules: [
      {
        id: "a",
        selector: ".a",
        reloadPageBefore: false,
        steps: [
          { type: "click", selector: "#tab" },
          { type: "waitForSelector", selector: ".panel" }
        ],
        properties: { backgroundColor: { token: "color.primary" } }
      },
      {
        id: "b",
        selector: ".b",
        steps: [
          { type: "type", selector: "#input", text: "hi" },
          { type: "press", selector: "#input", key: "Enter" },
          { type: "scrollIntoView", selector: ".b" },
          { type: "waitForTimeout", ms: 50 }
        ],
        properties: { backgroundColor: { token: "color.primary" } }
      }
    ]
  });

  const code = await runCollect({ configPath, out: outPath, url: "https://x.test", waitFor: "body" });
  expect(code).toBe(ExitCode.Ok);

  expect(calls).toEqual([
    "goto:https://x.test",
    "waitForSelector:body",
    "click:#tab",
    "waitForSelector:.panel",
    "goto:https://x.test",
    "waitForSelector:body",
    "type:#input:hi",
    "press:#input:Enter",
    "scrollIntoView:.b",
    "waitForTimeout:50"
  ]);
});

test("runCollect throws on invalid steps", async () => {
  const page = {
    setDefaultTimeout: (_ms: number) => {},
    goto: async (_url: string, _opts: any) => {},
    waitForSelector: async (_sel: string) => {},
    click: async (_sel: string) => {},
    hover: async (_sel: string) => {},
    focus: async (_sel: string) => {},
    type: async (_sel: string, _text: string) => {},
    press: async (_sel: string, _key: string) => {},
    waitForTimeout: async (_ms: number) => {},
    locator: (_sel: string) => ({ scrollIntoViewIfNeeded: async () => {} }),
    evaluate: async (_fn: any, _args: any) => null
  };
  const browser = {
    newPage: async () => page,
    close: async () => {}
  };

  __setChromiumLaunch(async () => browser);

  const dir = await mkdtemp(path.join(os.tmpdir(), "designlatch-collect-"));
  const configPath = path.join(dir, "config.json");

  await writeJson(configPath, {
    url: "https://x.test",
    rules: [
      {
        id: "bad",
        selector: ".bad",
        steps: [{ type: "click" }],
        properties: { backgroundColor: { token: "color.primary" } }
      }
    ]
  });

  await expect(runCollect({ configPath, url: "https://x.test" })).rejects.toThrow(/Invalid collect config/);
});
