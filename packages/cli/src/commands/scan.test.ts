import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runScan } from "./scan.js";
import { ExitCode } from "../lib/exit-codes.js";

async function writeJson(p: string, v: unknown) {
  await writeFile(p, JSON.stringify(v, null, 2), "utf8");
}

test("runScan returns Ok for matching token vs snapshot", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "alignui-scan-"));
  const configPath = path.join(dir, "config.json");
  const tokensPath = path.join(dir, "tokens.json");
  const snapsPath = path.join(dir, "snapshots.json");
  const reportDir = path.join(dir, "report");
  const outPath = path.join(reportDir, "report.json");
  const htmlPath = path.join(reportDir, "index.html");

  await writeJson(configPath, {
    url: "https://x.test",
    rules: [
      {
        id: "btn",
        selector: ".btn",
        properties: { backgroundColor: { token: "color.primary", tolerance: { kind: "rgba", value: 0 } } }
      }
    ]
  });
  await writeJson(tokensPath, {
    "color.primary": { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } }
  });
  await writeJson(snapsPath, [
    { selector: ".btn", url: "https://x.test", computed: { backgroundColor: "rgb(0, 0, 0)" } }
  ]);

  const code = await runScan({ configPath, tokensPath, snapshotsPath: snapsPath, reportDir });
  expect(code).toBe(ExitCode.Ok);
  const txt = await readFile(outPath, "utf8");
  expect(txt).toMatch(/\"score\"/);
  const html = await readFile(htmlPath, "utf8");
  expect(html).toMatch(/AlignUI - Compliance Report/);
  expect(html).not.toMatch(/\n\s+</);
});

test("runScan returns Fail when token is missing", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "alignui-scan-"));
  const configPath = path.join(dir, "config.json");
  const tokensPath = path.join(dir, "tokens.json");
  const snapsPath = path.join(dir, "snapshots.json");
  const outPath = path.join(dir, "out.json");

  await writeJson(configPath, {
    url: "https://x.test",
    rules: [
      {
        id: "btn",
        selector: ".btn",
        properties: { backgroundColor: { token: "color.missing", tolerance: { kind: "rgba", value: 0 } } }
      }
    ]
  });
  await writeJson(tokensPath, {
    "color.primary": { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } }
  });
  await writeJson(snapsPath, [
    { selector: ".btn", url: "https://x.test", computed: { backgroundColor: "rgb(0, 0, 0)" } }
  ]);

  const code = await runScan({ configPath, tokensPath, snapshotsPath: snapsPath, out: outPath });
  expect(code).toBe(ExitCode.Fail);
});

test("runScan defaults to report/ folder when no out/reportDir are provided", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "alignui-scan-"));
  const configPath = path.join(dir, "config.json");
  const tokensPath = path.join(dir, "tokens.json");
  const snapsPath = path.join(dir, "snapshots.json");

  await writeJson(configPath, {
    url: "https://x.test",
    rules: [
      {
        id: "btn",
        selector: ".btn",
        properties: { backgroundColor: { token: "color.primary", tolerance: { kind: "rgba", value: 0 } } }
      }
    ]
  });
  await writeJson(tokensPath, {
    "color.primary": { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } }
  });
  await writeJson(snapsPath, [
    { selector: ".btn", url: "https://x.test", computed: { backgroundColor: "rgb(0, 0, 0)" } }
  ]);

  const cwd = process.cwd();
  try {
    process.chdir(dir);
    const code = await runScan({ configPath, tokensPath, snapshotsPath: snapsPath });
    expect(code).toBe(ExitCode.Ok);
    const json = await readFile(path.join(dir, "report", "report.json"), "utf8");
    const html = await readFile(path.join(dir, "report", "index.html"), "utf8");
    expect(json).toMatch(/\"score\"/);
    expect(html).toMatch(/AlignUI - Compliance Report/);
    expect(html).not.toMatch(/\n\s+</);
  } finally {
    process.chdir(cwd);
  }
});
