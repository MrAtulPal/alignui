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
    "--report-dir",
    "report",
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
    expect(a.reportDir).toBe("report");
    expect(a.baselinePath).toBe("b.json");
    expect(a.diffOut).toBe("d.json");
    expect(a.serveReport).toBe(true);
  }
});

test("parseArgs parses scan serve flags", () => {
  const a = parseArgs(["scan", "--tokens", "t.json", "--snapshots", "s.json", "--no-open", "--no-serve", "--host", "0.0.0.0", "--port", "9000"]);
  expect(a.cmd).toBe("scan");
  if (a.cmd === "scan") {
    expect(a.serveReport).toBe(false);
    expect(a.noOpen).toBe(true);
    expect(a.host).toBe("0.0.0.0");
    expect(a.port).toBe(9000);
  }
});

test("parseArgs parses serve flags", () => {
  const a = parseArgs(["serve", "--report-dir", "report", "--host", "127.0.0.1", "--port", "4173", "--no-open"]);
  expect(a.cmd).toBe("serve");
  if (a.cmd === "serve") {
    expect(a.reportDir).toBe("report");
    expect(a.host).toBe("127.0.0.1");
    expect(a.port).toBe(4173);
    expect(a.noOpen).toBe(true);
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
