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

  const dir = await mkdtemp(path.join(os.tmpdir(), "alignui-collect-"));
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
