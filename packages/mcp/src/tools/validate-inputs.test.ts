import { runValidateInputs } from "./validate-inputs.js";

test("runValidateInputs returns parsed values", () => {
  const result = runValidateInputs({
    config: {
      url: "https://x.test",
      rules: [{ id: "btn", selector: ".btn", properties: { backgroundColor: { token: "color.primary" } } }]
    },
    tokens: {
      "color.primary": { kind: "color", rgba: { r: 0, g: 0, b: 0, a: 1 } }
    },
    snapshots: [
      { selector: ".btn", url: "https://x.test", text: "Save", computed: { backgroundColor: "rgb(0, 0, 0)" } }
    ]
  });

  expect(result.counts).toEqual({ rules: 1, tokens: 1, snapshots: 1 });
});
