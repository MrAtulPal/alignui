import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ExitCode } from "../lib/exit-codes.js";
import { runValidate } from "./validate.js";

async function writeJson(p: string, v: unknown) {
  await writeFile(p, JSON.stringify(v, null, 2), "utf8");
}

test("runValidate returns Ok for valid inputs", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "designlatch-validate-"));
  const configPath = path.join(dir, "config.json");
  const tokensPath = path.join(dir, "tokens.json");
  const snapsPath = path.join(dir, "snapshots.json");

  await writeJson(configPath, {
    url: "https://x.test",
    rules: [{ id: "btn", selector: ".btn", properties: { backgroundColor: { token: "color.primary" } } }]
  });
  await writeJson(tokensPath, { "color.primary": { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } } });
  await writeJson(snapsPath, [{ selector: ".btn", url: "https://x.test", computed: { backgroundColor: "rgb(0,0,0)" } }]);

  const code = await runValidate({ configPath, tokensPath, snapshotsPath: snapsPath });
  expect(code).toBe(ExitCode.Ok);
});

test("runValidate accepts a config directory and merges rules", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "designlatch-validate-dir-"));
  const configDir = path.join(dir, "components");
  const tokensPath = path.join(dir, "tokens.json");
  const snapsPath = path.join(dir, "snapshots.json");
  await mkdir(configDir, { recursive: true });

  await writeJson(path.join(configDir, "01-header.json"), {
    url: "https://x.test",
    thresholds: { minScore: 90 },
    rules: [{ id: "header", selector: ".header", properties: { backgroundColor: { token: "color.header" } } }]
  });
  await writeJson(path.join(configDir, "02-card.json"), {
    rules: [{ id: "card", selector: ".card", properties: { backgroundColor: { token: "color.card" } } }]
  });
  await writeJson(tokensPath, {
    "color.header": { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } },
    "color.card": { kind: "color", rgba: { r: 255, g: 255, b: 255, a: 1 } }
  });
  await writeJson(snapsPath, [
    { selector: ".header", url: "https://x.test", computed: { backgroundColor: "rgb(0,0,0)" } },
    { selector: ".card", url: "https://x.test", computed: { backgroundColor: "rgb(255,255,255)" } }
  ]);

  const code = await runValidate({ configPath: configDir, tokensPath, snapshotsPath: snapsPath });
  expect(code).toBe(ExitCode.Ok);
});
