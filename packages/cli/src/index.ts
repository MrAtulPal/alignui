#!/usr/bin/env node
import { ExitCode } from "./lib/exit-codes.js";
import { parseArgs } from "./lib/args.js";
import { runScan } from "./commands/scan.js";

function printHelp() {
  // Keep help simple; this will expand once commands stabilize.
  console.log("alignui scan [--config <file>] [--url <url>] --tokens <tokens.json> --snapshots <snapshots.json> [--out <report.json>] [--baseline <report.json>] [--diff-out <diff.json>]");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.cmd === "help") {
    printHelp();
    process.exit(ExitCode.Ok);
  }

  try {
    const code = await runScan(args);
    process.exit(code);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(ExitCode.RuntimeError);
  }
}

await main();
