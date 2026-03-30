import { validateInputs } from "@designlatch/app";
import { ExitCode } from "../lib/exit-codes.js";
import { readJsonFile } from "../lib/json.js";
import { loadConfigInput } from "../lib/config-loader.js";

type ValidateOpts = {
  configPath?: string;
  url?: string;
  tokensPath?: string;
  snapshotsPath?: string;
};

export async function runValidate(opts: ValidateOpts): Promise<number> {
  const configPath = opts.configPath ?? ".designlatch.json";
  const loaded = await loadConfigInput(configPath);

  if (!opts.tokensPath) throw new Error("Missing --tokens <tokens.json>.");
  if (!opts.snapshotsPath) throw new Error("Missing --snapshots <snapshots.json>.");

  const [tokensRaw, snapshotsRaw] = await Promise.all([
    readJsonFile(opts.tokensPath),
    readJsonFile(opts.snapshotsPath)
  ]);

  const validated = validateInputs({
    config: loaded.configRaw,
    tokens: tokensRaw,
    snapshots: snapshotsRaw,
    urlOverride: opts.url
  });

  if (validated.lintWarnings.length > 0) {
    console.log(`Config lint warnings (${loaded.configPath}):`);
    for (const warning of validated.lintWarnings) console.log(`- ${warning.path}: ${warning.message}`);
  }

  console.log(`Config: ${validated.counts.rules} rule(s)`);
  console.log(`Tokens: ${validated.counts.tokens} token(s)`);
  console.log(`Snapshots: ${validated.counts.snapshots} selector(s)`);
  console.log(`URL: ${validated.url}`);

  return ExitCode.Ok;
}
