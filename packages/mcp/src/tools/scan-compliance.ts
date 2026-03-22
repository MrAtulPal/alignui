import { createLogger, scanCompliance, type ScanComplianceParams } from "@designlatch/app";

const logger = createLogger("mcp.scan_compliance");

export function runScanCompliance(params: ScanComplianceParams) {
  logger.info("tool started");
  const result = scanCompliance(params);
  logger.info("tool completed", {
    total: result.report.summary.total,
    passed: result.report.summary.passed,
    score: result.report.summary.score,
    pass: result.evaluation.pass
  });
  return result;
}
