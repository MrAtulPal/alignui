import { validateScanConfig } from "../index.js";

test("validateScanConfig accepts a minimal valid config", () => {
  const r = validateScanConfig({
    url: "https://x.test",
    defaults: { severity: "warn", tolerance: { px: 1, rgba: 2 } },
    rules: [
      {
        id: "btn",
        selector: ".btn",
        properties: {
          backgroundColor: { token: "color.primary", tolerance: { kind: "rgba", value: 2 } }
        }
      }
    ]
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.url).toBe("https://x.test");
    expect(r.value.rules).toHaveLength(1);
  }
});

test("validateScanConfig reports useful paths for invalid config", () => {
  const r = validateScanConfig({
    url: 123,
    rules: [
      {
        id: "btn",
        selector: ".btn",
        properties: {
          backgroundColor: { token: 9 }
        }
      }
    ],
    thresholds: { failOnSeverity: "fatal" }
  });
  expect(r.ok).toBe(false);
  if (!r.ok) {
    const joined = r.errors.map((e) => `${e.path}:${e.message}`).join("\n");
    expect(joined).toMatch(/\$\.url/);
    expect(joined).toMatch(/properties\.backgroundColor\.token/);
    expect(joined).toMatch(/\$\.thresholds\.failOnSeverity/);
  }
});
