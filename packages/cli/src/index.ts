#!/usr/bin/env node
import "dotenv/config";
import { ExitCode } from "./lib/exit-codes.js";
import { parseArgs } from "./lib/args.js";
import { runScan } from "./commands/scan.js";
import { runValidate } from "./commands/validate.js";
import { runInit } from "./commands/init.js";
import { runCollect } from "./commands/collect.js";
import { runTokens } from "./commands/tokens.js";

function printHelp() {
  console.log(`
 █████╗ ██╗     ██╗ ██████╗ ███╗   ██╗██╗   ██╗██╗
██╔══██╗██║     ██║██╔════╝ ████╗  ██║██║   ██║██║
███████║██║     ██║██║  ███╗██╔██╗ ██║██║   ██║██║
██╔══██║██║     ██║██║   ██║██║ ╚██╗██║██║   ██║██║
██║  ██║███████╗██║╚██████╔╝██║  ╚████║╚██████╔╝██║
╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝   ╚═══╝ ╚═════╝ ╚═╝
    `);
  console.log("Design-to-code compliance checks");
  console.log("");
  console.log("Commands:");
  console.log("  tokens     Pull tokens from Figma variables");
  console.log("  collect    Collect snapshots from a live URL (Playwright)");
  console.log("  scan       Run compliance scan (tokens + snapshots)");
  console.log("  validate   Validate config/tokens/snapshots (no scan)");
  console.log("  init       Create starter config + templates");
  console.log("  help       Show help");
  console.log("");
  console.log("Examples:");
  console.log("  alignui tokens --figma-file <key> --figma-token <token> --out alignui/tokens.json");
  console.log("  alignui collect --config .alignui.json --url https://app.example.com --out alignui/snapshots.json");
  console.log("  alignui validate --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json");
  console.log("  alignui scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --out report.json");
  console.log("  alignui scan ... --baseline report.json --diff-out diff.json");
  console.log("");
  console.log("Tokens options:");
  console.log("  --collection <name>     Variable collection name (default: first)");
  console.log("  --mode <name>           Mode name within collection (default: first)");
  console.log("  --prefix-collection     Prefix keys with collection name");
  console.log("  --float-unit px|ratio   Treat FLOAT variables as px (default) or ratio");
  console.log("");
  console.log("Collect options:");
  console.log("  --wait-for <selector>   Wait for selector before collecting");
  console.log("  --timeout-ms <ms>       Default timeout (default 30000)");
  console.log("  --headed                Run browser in headed mode");
  console.log("");
  console.log("Defaults:");
  console.log("  --config .alignui.json");
  console.log("  --out report.json");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.cmd === "help") {
    printHelp();
    process.exit(ExitCode.Ok);
  }

  try {
    const code =
      args.cmd === "scan"
        ? await runScan(args)
        : args.cmd === "tokens"
          ? await runTokens(args)
        : args.cmd === "collect"
          ? await runCollect(args)
          : args.cmd === "validate"
            ? await runValidate(args)
            : args.cmd === "init"
              ? await runInit(args)
              : ExitCode.Ok;
    process.exit(code);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(ExitCode.RuntimeError);
  }
}

await main();
