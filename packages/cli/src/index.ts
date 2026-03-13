#!/usr/bin/env node
import { ExitCode } from "./lib/exit-codes.js";
import { parseArgs, type ParsedArgs } from "./lib/args.js";

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
  console.log("  collect    Collect snapshots from a live URL (Playwright)");
  console.log("  scan       Run compliance scan (tokens + snapshots)");
  console.log("  serve      Serve the generated HTML report locally");
  console.log("  validate   Validate config/tokens/snapshots (no scan)");
  console.log("  init       Create starter config + templates");
  console.log("  help       Show help");
  console.log("");
  console.log("Examples:");
  console.log("  alignui collect --config .alignui.json --url https://app.example.com --out alignui/snapshots.json");
  console.log("  alignui validate --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json");
  console.log("  alignui scan --config .alignui.json --tokens alignui/tokens.json --snapshots alignui/snapshots.json --report-dir report");
  console.log("  alignui serve --report-dir report");
  console.log("  alignui serve --file report/index.html --no-open");
  console.log("");
  console.log("Collect options:");
  console.log("  --wait-for <selector>   Wait for selector before collecting");
  console.log("  --timeout-ms <ms>       Default timeout (default 30000)");
  console.log("  --headed                Run browser in headed mode");
  console.log("");
  console.log("Serve options:");
  console.log("  --host 127.0.0.1        Bind host (default 127.0.0.1)");
  console.log("  --port 4173             Starting port (auto-increments if busy)");
  console.log("  --no-open               Serve without opening a browser");
  console.log("  --no-serve              Skip auto-serving after scan");
  console.log("");
  console.log("Defaults:");
  console.log("  --config .alignui.json");
  console.log("  scan writes report/report.json + report/index.html and serves it automatically");
}

function scanWillWriteHtml(args: Extract<ParsedArgs, { cmd: "scan" }>): boolean {
  return Boolean(args.reportDir ?? (args.out ? undefined : "report"));
}

function scanReportDir(args: Extract<ParsedArgs, { cmd: "scan" }>): string {
  return args.reportDir ?? "report";
}

async function handleHelp(): Promise<number> {
  printHelp();
  return ExitCode.Ok;
}

async function handleScan(args: Extract<ParsedArgs, { cmd: "scan" }>): Promise<number> {
  const { runScan } = await import("./commands/scan.js");
  const code = await runScan(args);
  if (args.serveReport && scanWillWriteHtml(args)) {
    const { runServe } = await import("./commands/serve.js");
    await runServe({ reportDir: scanReportDir(args), host: args.host, port: args.port, noOpen: args.noOpen });
  } else if (args.serveReport && !scanWillWriteHtml(args)) {
    console.log("Skipping report server: HTML report is not generated when using --out without --report-dir.");
  }
  return code;
}

type HandlerMap = {
  [K in ParsedArgs["cmd"]]: (args: Extract<ParsedArgs, { cmd: K }>) => Promise<number>;
};

const handlers: HandlerMap = {
  help: async () => await handleHelp(),
  init: async (args) => {
    const { runInit } = await import("./commands/init.js");
    return await runInit(args);
  },
  validate: async (args) => {
    const { runValidate } = await import("./commands/validate.js");
    return await runValidate(args);
  },
  collect: async (args) => {
    const { runCollect } = await import("./commands/collect.js");
    return await runCollect(args);
  },
  scan: async (args) => await handleScan(args),
  serve: async (args) => {
    const { runServe } = await import("./commands/serve.js");
    return await runServe(args);
  }
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  try {
    const code = await handlers[args.cmd](args as never);
    process.exit(code);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(ExitCode.RuntimeError);
  }
}

await main();
