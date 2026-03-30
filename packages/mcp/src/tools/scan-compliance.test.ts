import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runScanCompliance } from "./scan-compliance.js";

test("runScanCompliance returns report and evaluation and writes default report files", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "designlatch-mcp-scan-"));
  const cwd = process.cwd();

  try {
    process.chdir(dir);

    const result = await runScanCompliance({
      config: {
        url: "https://x.test",
        rules: [
          {
            id: "btn",
            selector: ".btn",
            properties: {
              backgroundColor: { token: "color.primary", tolerance: { kind: "rgba", value: 0 } }
            }
          }
        ]
      },
      tokens: {
        "color.primary": { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } }
      },
      snapshots: [{ selector: ".btn", url: "https://x.test", computed: { backgroundColor: "rgb(0, 0, 0)" } }]
    });

    expect(result.report.summary.total).toBe(1);
    expect(result.evaluation.pass).toBe(true);
    expect(result.reportOutput.reportDir).toBe(path.join(dir, "report"));
    await expect(readFile(path.join(dir, "report", "report.json"), "utf8")).resolves.toMatch(/"score"/);
    await expect(readFile(path.join(dir, "report", "index.html"), "utf8")).resolves.toMatch(/DesignLatch - Compliance Report/);
  } finally {
    process.chdir(cwd);
  }
});
