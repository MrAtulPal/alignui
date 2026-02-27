#!/usr/bin/env node
import { ExitCode } from "./lib/exit-codes.js";
import { parseArgs } from "./lib/args.js";
import { runScan } from "./commands/scan.js";
import { runValidate } from "./commands/validate.js";
import { runInit } from "./commands/init.js";

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
  console.log("  scan       Run compliance scan (tokens + snapshots)");
  console.log("  validate   Validate config/tokens/snapshots (no scan)");
  console.log("  init       Create starter config + templates");
  console.log("  help       Show help");
  console.log("");
  console.log("Examples:");
  console.log("  alignui validate --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json");
  console.log("  alignui scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --out report.json");
  console.log("  alignui scan ... --baseline report.json --diff-out diff.json");
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
