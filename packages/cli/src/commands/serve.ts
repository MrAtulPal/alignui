import { createLogger } from "@designlatch/app";
import { ExitCode } from "../lib/exit-codes.js";
import { startReportServer, waitForShutdown } from "../lib/report-server.js";

const logger = createLogger("cli.serve");

type ServeOpts = {
  reportDir?: string;
  file?: string;
  host?: string;
  port?: number;
  noOpen?: boolean;
};

export async function runServe(opts: ServeOpts): Promise<number> {
  const server = await startReportServer({
    reportDir: opts.reportDir,
    file: opts.file,
    host: opts.host,
    port: opts.port,
    open: !opts.noOpen
  });

  logger.info("report server started", { url: server.url });
  console.log(`Serving report at ${server.url}`);
  console.log("Press Ctrl+C to stop.");
  await waitForShutdown(server);
  return ExitCode.Ok;
}

