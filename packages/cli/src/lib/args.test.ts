import { parseArgs } from "./args.js";

test("parseArgs parses scan flags", () => {
  const a = parseArgs([
    "scan",
    "--config",
    "c.json",
    "--tokens",
    "t.json",
    "--snapshots",
    "s.json",
    "--out",
    "r.json",
    "--baseline",
    "b.json",
    "--diff-out",
    "d.json"
  ]);
  expect(a.cmd).toBe("scan");
  if (a.cmd === "scan") {
    expect(a.configPath).toBe("c.json");
    expect(a.tokensPath).toBe("t.json");
    expect(a.snapshotsPath).toBe("s.json");
    expect(a.out).toBe("r.json");
    expect(a.baselinePath).toBe("b.json");
    expect(a.diffOut).toBe("d.json");
  }
});

test("parseArgs parses collect flags", () => {
  const a = parseArgs(["collect", "--config", "c.json", "--url", "https://x.test", "--out", "o.json", "--headed"]);
  expect(a.cmd).toBe("collect");
  if (a.cmd === "collect") {
    expect(a.configPath).toBe("c.json");
    expect(a.url).toBe("https://x.test");
    expect(a.out).toBe("o.json");
    expect(a.headed).toBe(true);
  }
});

test("parseArgs defaults to help on unknown command", () => {
  const a = parseArgs(["wat"]);
  expect(a.cmd).toBe("help");
});

