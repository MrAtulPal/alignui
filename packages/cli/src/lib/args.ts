export type ParsedArgs =
  | { cmd: "help" }
  | { cmd: "init"; configPath?: string; force?: boolean }
  | { cmd: "validate"; configPath?: string; url?: string; tokensPath?: string; snapshotsPath?: string }
  | { cmd: "collect"; configPath?: string; url?: string; out?: string; timeoutMs?: number; waitFor?: string; headed?: boolean }
  | {
      cmd: "scan";
      configPath?: string;
      url?: string;
      out?: string;
      reportDir?: string;
      tokensPath?: string;
      snapshotsPath?: string;
      baselinePath?: string;
      diffOut?: string;
      serveReport: boolean;
      noOpen?: boolean;
      host?: string;
      port?: number;
    }
  | {
      cmd: "serve";
      reportDir?: string;
      file?: string;
      noOpen?: boolean;
      host?: string;
      port?: number;
    };

type BaseParsedFlags = {
  configPath?: string;
  url?: string;
  out?: string;
  reportDir?: string;
  file?: string;
  tokensPath?: string;
  snapshotsPath?: string;
  baselinePath?: string;
  diffOut?: string;
  waitFor?: string;
  timeoutMs?: number;
  port?: number;
  host?: string;
  headed: boolean;
  noOpen: boolean;
  noServe: boolean;
};

type CommandParser<K extends Exclude<ParsedArgs["cmd"], "help">> = (flags: BaseParsedFlags & { cmd: K }) => Extract<ParsedArgs, { cmd: K }>;

const commandParsers: {
  init: CommandParser<"init">;
  validate: CommandParser<"validate">;
  collect: CommandParser<"collect">;
  scan: CommandParser<"scan">;
  serve: CommandParser<"serve">;
} = {
  init: ({ configPath }) => ({ cmd: "init", configPath, force: false }),
  validate: ({ configPath, url, tokensPath, snapshotsPath }) => ({ cmd: "validate", configPath, url, tokensPath, snapshotsPath }),
  collect: ({ configPath, url, out, waitFor, timeoutMs, headed }) => ({ cmd: "collect", configPath, url, out, waitFor, timeoutMs, headed }),
  scan: ({ configPath, url, out, reportDir, tokensPath, snapshotsPath, baselinePath, diffOut, noOpen, host, port, noServe }) => ({
    cmd: "scan",
    configPath,
    url,
    out,
    reportDir,
    tokensPath,
    snapshotsPath,
    baselinePath,
    diffOut,
    serveReport: !noServe,
    noOpen,
    host,
    port
  }),
  serve: ({ reportDir, file, noOpen, host, port }) => ({ cmd: "serve", reportDir, file, noOpen, host, port })
};

export function parseArgs(argv: string[]): ParsedArgs {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") return { cmd: "help" };

  if (rest.includes("--help") || rest.includes("-h")) return { cmd: "help" };

  const flags = new Map<string, string | true>();
  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i]!;
    if (!tok.startsWith("--")) continue;
    const key = tok.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith("--")) {
      flags.set(key, next);
      i++;
    } else {
      flags.set(key, true);
    }
  }

  const parsedFlags: BaseParsedFlags = {
    configPath: typeof flags.get("config") === "string" ? (flags.get("config") as string) : undefined,
    url: typeof flags.get("url") === "string" ? (flags.get("url") as string) : undefined,
    out: typeof flags.get("out") === "string" ? (flags.get("out") as string) : undefined,
    reportDir: typeof flags.get("report-dir") === "string" ? (flags.get("report-dir") as string) : undefined,
    file: typeof flags.get("file") === "string" ? (flags.get("file") as string) : undefined,
    tokensPath: typeof flags.get("tokens") === "string" ? (flags.get("tokens") as string) : undefined,
    snapshotsPath: typeof flags.get("snapshots") === "string" ? (flags.get("snapshots") as string) : undefined,
    baselinePath: typeof flags.get("baseline") === "string" ? (flags.get("baseline") as string) : undefined,
    diffOut: typeof flags.get("diff-out") === "string" ? (flags.get("diff-out") as string) : undefined,
    waitFor: typeof flags.get("wait-for") === "string" ? (flags.get("wait-for") as string) : undefined,
    timeoutMs: typeof flags.get("timeout-ms") === "string" ? Number(flags.get("timeout-ms")) : undefined,
    port: typeof flags.get("port") === "string" ? Number(flags.get("port")) : undefined,
    host: typeof flags.get("host") === "string" ? (flags.get("host") as string) : undefined,
    headed: flags.get("headed") === true,
    noOpen: flags.get("no-open") === true,
    noServe: flags.get("no-serve") === true
  };

  if (cmd === "init") {
    const parsed = commandParsers.init({ cmd: "init", ...parsedFlags });
    parsed.force = flags.get("force") === true;
    return parsed;
  }
  if (cmd === "validate") return commandParsers.validate({ cmd: "validate", ...parsedFlags });
  if (cmd === "collect") return commandParsers.collect({ cmd: "collect", ...parsedFlags });
  if (cmd === "scan") return commandParsers.scan({ cmd: "scan", ...parsedFlags });
  if (cmd === "serve") return commandParsers.serve({ cmd: "serve", ...parsedFlags });

  return { cmd: "help" };
}
