import { createLogger, validateInputs, type ValidateInputsParams } from "@designlatch/app";

const logger = createLogger("mcp.validate_inputs");

export function runValidateInputs(params: ValidateInputsParams) {
  logger.info("tool started");
  const result = validateInputs(params);
  logger.info("tool completed", {
    rules: result.counts.rules,
    tokens: result.counts.tokens,
    snapshots: result.counts.snapshots
  });
  return result;
}
