export type ParsedArgs =
  | { cmd: "help" }
  | { cmd: "init"; configPath?: string; force?: boolean }
  | { cmd: "validate"; configPath?: string; url?: string; tokensPath?: string; snapshotsPath?: string; designPath?: string }
  | { cmd: "collect"; configPath?: string; url?: string; out?: string; timeoutMs?: number; waitFor?: string; headed?: boolean }
  | {
      cmd: "tokens";
      figmaFile?: string;
      figmaToken?: string;
      out?: string;
      collection?: string;
      mode?: string;
      prefixCollection?: boolean;
      floatUnit?: "px" | "ratio";
    }
  | {
      cmd: "scan";
      configPath?: string;
      url?: string;
      out?: string;
      tokensPath?: string;
      snapshotsPath?: string;
      designPath?: string;
      baselinePath?: string;
      diffOut?: string;
    }
  | { cmd: "design"; subcmd: "ls"; inPath?: string; contains?: string; type?: string; max?: number };

export function parseArgs(argv: string[]): ParsedArgs {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") return { cmd: "help" };

  if (rest.includes("--help") || rest.includes("-h")) return { cmd: "help" };

  // Minimal parser (no deps). We'll replace with a proper parser later if needed.
  const flags = new Map<string, string | true>();
  const positionals: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i]!;
    if (!tok.startsWith("--")) {
      positionals.push(tok);
      continue;
    }
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
  const tokensPath = typeof flags.get("tokens") === "string" ? (flags.get("tokens") as string) : undefined;
  const snapshotsPath = typeof flags.get("snapshots") === "string" ? (flags.get("snapshots") as string) : undefined;
  const designPath = typeof flags.get("design") === "string" ? (flags.get("design") as string) : undefined;
  const inPath = typeof flags.get("in") === "string" ? (flags.get("in") as string) : undefined;
  const contains = typeof flags.get("contains") === "string" ? (flags.get("contains") as string) : undefined;
  const type = typeof flags.get("type") === "string" ? (flags.get("type") as string) : undefined;
  const maxRaw = typeof flags.get("max") === "string" ? (flags.get("max") as string) : undefined;
  const max = maxRaw ? Number(maxRaw) : undefined;
  const baselinePath = typeof flags.get("baseline") === "string" ? (flags.get("baseline") as string) : undefined;
  const diffOut = typeof flags.get("diff-out") === "string" ? (flags.get("diff-out") as string) : undefined;
  const waitFor = typeof flags.get("wait-for") === "string" ? (flags.get("wait-for") as string) : undefined;
  const timeoutMsRaw = typeof flags.get("timeout-ms") === "string" ? (flags.get("timeout-ms") as string) : undefined;
  const timeoutMs = timeoutMsRaw ? Number(timeoutMsRaw) : undefined;
  const headed = flags.get("headed") === true;
  const prefixCollection = flags.get("prefix-collection") === true;
  const figmaFile = typeof flags.get("figma-file") === "string" ? (flags.get("figma-file") as string) : undefined;
  const figmaToken = typeof flags.get("figma-token") === "string" ? (flags.get("figma-token") as string) : undefined;
  const collection = typeof flags.get("collection") === "string" ? (flags.get("collection") as string) : undefined;
  const mode = typeof flags.get("mode") === "string" ? (flags.get("mode") as string) : undefined;
  const floatUnitRaw = typeof flags.get("float-unit") === "string" ? (flags.get("float-unit") as string) : undefined;
  const floatUnit = floatUnitRaw === "ratio" ? "ratio" : floatUnitRaw === "px" ? "px" : undefined;

  if (cmd === "scan") return { cmd: "scan", configPath, url, out, tokensPath, snapshotsPath, designPath, baselinePath, diffOut };
  if (cmd === "validate") return { cmd: "validate", configPath, url, tokensPath, snapshotsPath, designPath };
  if (cmd === "collect") return { cmd: "collect", configPath, url, out, waitFor, timeoutMs, headed };
  if (cmd === "tokens") return { cmd: "tokens", figmaFile, figmaToken, out, collection, mode, prefixCollection, floatUnit };
  if (cmd === "init") {
    const force = flags.get("force") === true;
    return { cmd: "init", configPath, force };
  }
  if (cmd === "design") {
    // Subcommand is the first positional token (e.g. "ls").
    // Example: alignui design ls --in report.json --contains Button
    const subcmd = positionals[0];
    if (!subcmd || subcmd === "help" || subcmd === "--help" || subcmd === "-h") return { cmd: "help" };
    if (subcmd === "ls") return { cmd: "design", subcmd: "ls", inPath, contains, type, max };
    return { cmd: "help" };
  }

  return { cmd: "help" };
}
