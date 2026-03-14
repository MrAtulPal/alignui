import { writeFile, mkdir, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { ExitCode } from "../lib/exit-codes.js";

type InitOpts = { configPath?: string; force?: boolean };

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function runInit(opts: InitOpts): Promise<number> {
  const configPath = opts.configPath ?? ".designlatch.json";
  const force = opts.force ?? false;

  if (!force && (await exists(configPath))) {
    throw new Error(`Refusing to overwrite existing ${configPath}. Use --force to overwrite.`);
  }

  const config = {
    url: "https://example.com",
    rules: [
      {
        id: "example",
        selector: ".btn-primary",
        properties: {
          backgroundColor: { token: "color.primary", tolerance: { kind: "rgba", value: 0 }, severity: "error" },
          padding: { token: "pad.md", tolerance: { kind: "px", value: 0 }, severity: "warn" }
        }
      }
    ],
    thresholds: { minScore: 100, failOnSeverity: "error" }
  };

  await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
  await mkdir("designlatch", { recursive: true });

  const tokensPath = "designlatch/tokens.json";
  const snapsPath = "designlatch/snapshots.json";

  if (force || !(await exists(tokensPath))) {
    const tokens = {
      "color.primary": { kind: "color", rgba: { r: 47, g: 107, b: 255, a: 1 } },
      "pad.md": { kind: "box", unit: "px", top: 10, right: 16, bottom: 10, left: 16 }
    };
    await writeFile(tokensPath, JSON.stringify(tokens, null, 2), "utf8");
  }

  if (force || !(await exists(snapsPath))) {
    const snapshots = [
      {
        selector: ".btn-primary",
        url: "https://example.com",
        computed: { backgroundColor: "rgb(47, 107, 255)", padding: "10px 16px" }
      }
    ];
    await writeFile(snapsPath, JSON.stringify(snapshots, null, 2), "utf8");
  }

  console.log(`Wrote ${configPath}`);
  console.log(`Wrote ${tokensPath}`);
  console.log(`Wrote ${snapsPath}`);
  return ExitCode.Ok;
}

