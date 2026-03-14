import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runValidate } from "./validate.js";
import { ExitCode } from "../lib/exit-codes.js";

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

