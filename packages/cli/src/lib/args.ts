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

  const configPath = typeof flags.get("config") === "string" ? (flags.get("config") as string) : undefined;
  const url = typeof flags.get("url") === "string" ? (flags.get("url") as string) : undefined;
  const out = typeof flags.get("out") === "string" ? (flags.get("out") as string) : undefined;
  const reportDir = typeof flags.get("report-dir") === "string" ? (flags.get("report-dir") as string) : undefined;
  const file = typeof flags.get("file") === "string" ? (flags.get("file") as string) : undefined;
  const tokensPath = typeof flags.get("tokens") === "string" ? (flags.get("tokens") as string) : undefined;
  const snapshotsPath = typeof flags.get("snapshots") === "string" ? (flags.get("snapshots") as string) : undefined;
  const baselinePath = typeof flags.get("baseline") === "string" ? (flags.get("baseline") as string) : undefined;
  const diffOut = typeof flags.get("diff-out") === "string" ? (flags.get("diff-out") as string) : undefined;
  const waitFor = typeof flags.get("wait-for") === "string" ? (flags.get("wait-for") as string) : undefined;
  const timeoutMsRaw = typeof flags.get("timeout-ms") === "string" ? (flags.get("timeout-ms") as string) : undefined;
  const timeoutMs = timeoutMsRaw ? Number(timeoutMsRaw) : undefined;
  const portRaw = typeof flags.get("port") === "string" ? (flags.get("port") as string) : undefined;
  const port = portRaw ? Number(portRaw) : undefined;
  const host = typeof flags.get("host") === "string" ? (flags.get("host") as string) : undefined;
  const headed = flags.get("headed") === true;
  const noOpen = flags.get("no-open") === true;
  const noServe = flags.get("no-serve") === true;

  if (cmd === "scan") {
    return {
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
    };
  }
  if (cmd === "validate") return { cmd: "validate", configPath, url, tokensPath, snapshotsPath };
  if (cmd === "collect") return { cmd: "collect", configPath, url, out, waitFor, timeoutMs, headed };
  if (cmd === "serve") return { cmd: "serve", reportDir, file, noOpen, host, port };
  if (cmd === "init") {
    const force = flags.get("force") === true;
    return { cmd: "init", configPath, force };
  }

  return { cmd: "help" };
}
