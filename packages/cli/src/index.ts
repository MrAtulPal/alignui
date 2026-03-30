#!/usr/bin/env node
import { createLogger } from "@designlatch/app";
import { ExitCode } from "./lib/exit-codes.js";
import { parseArgs, type ParsedArgs } from "./lib/args.js";

const DOCS_URL = "https://mratulpal.github.io/alignui/";
const logger = createLogger("cli");

function printHelp() {
  console.log("DesignLatch");
  console.log("Design-to-code compliance checks");
  console.log("");
  console.log("Commands:");
  console.log("  init       Create starter config and templates");
  console.log("  collect    Capture live computed styles with Playwright");
  console.log("  validate   Validate config, tokens, and snapshots");
  console.log("  scan       Compare tokens vs snapshots and write reports");
  console.log("  serve      Serve the generated HTML report locally");
  console.log("");
  console.log("Quick start:");
  console.log("  designlatch scan --config .designlatch.json --tokens designlatch/tokens.json --snapshots designlatch/snapshots.json --report-dir report");
  console.log("");
  console.log(`For more details refer : ${DOCS_URL}`);
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
    logger.warn("report server skipped", { reason: "html-not-generated" });
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
  logger.debug("command parsed", { cmd: args.cmd });

  try {
    const code = await handlers[args.cmd](args as never);
    process.exit(code);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("command failed", { error: message });
    console.error(message);
    process.exit(ExitCode.RuntimeError);
  }
}

await main();

