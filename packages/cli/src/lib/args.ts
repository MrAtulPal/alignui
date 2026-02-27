export type ParsedArgs =
  | { cmd: "help" }
  | { cmd: "scan"; configPath?: string; url?: string; out?: string };

export function parseArgs(argv: string[]): ParsedArgs {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") return { cmd: "help" };

  if (cmd !== "scan") return { cmd: "help" };

  // Minimal parser (no deps). We'll replace with a proper parser later if needed.
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
  return { cmd: "scan", configPath, url, out };
}

