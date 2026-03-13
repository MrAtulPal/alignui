import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { startReportServer } from "./report-server.js";

test("startReportServer serves report directory", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "alignui-serve-"));
  await mkdir(path.join(dir, "report"), { recursive: true });
  await writeFile(path.join(dir, "report", "index.html"), "<html><body>hello</body></html>", "utf8");
  await writeFile(path.join(dir, "report", "report.json"), '{"ok":true}', "utf8");

  const server = await startReportServer({ reportDir: path.join(dir, "report"), open: false, port: 4300 });
  try {
    const html = await fetch(server.url).then((r) => r.text());
    const json = await fetch(`${server.url}report.json`).then((r) => r.json() as Promise<{ ok: boolean }>);
    expect(html).toContain("hello");
    expect(json.ok).toBe(true);
  } finally {
    await server.close();
  }
});

test("startReportServer serves explicit file", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "alignui-serve-file-"));
  const file = path.join(dir, "custom.html");
  await writeFile(file, "<html><body>custom</body></html>", "utf8");

  const server = await startReportServer({ file, open: false, port: 4310 });
  try {
    const html = await fetch(server.url).then((r) => r.text());
    expect(html).toContain("custom");
  } finally {
    await server.close();
  }
});

test("startReportServer increments port when busy", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "alignui-serve-port-"));
  await writeFile(path.join(dir, "index.html"), "<html><body>port</body></html>", "utf8");

  const blocker = createServer();
  await new Promise<void>((resolve) => blocker.listen(4320, "127.0.0.1", resolve));

  const server = await startReportServer({ reportDir: dir, open: false, port: 4320 });
  try {
    expect(server.port).toBe(4321);
  } finally {
    await server.close();
    await new Promise<void>((resolve, reject) => blocker.close((err) => (err ? reject(err) : resolve())));
  }
});
