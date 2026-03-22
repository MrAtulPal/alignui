import { runScanCompliance } from "./scan-compliance.js";

test("runScanCompliance returns report and evaluation", () => {
  const result = runScanCompliance({
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
});
