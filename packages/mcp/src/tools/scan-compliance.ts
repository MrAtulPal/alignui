import { createLogger, scanCompliance, writeScanReport, type ScanComplianceParams } from "@designlatch/app";

const logger = createLogger("mcp.scan_compliance");

export async function runScanCompliance(params: ScanComplianceParams) {
  logger.info("tool started");
  const result = scanCompliance(params);
  const output = await writeScanReport("report", result.report, result.evaluation);
  logger.info("tool completed", {
    total: result.report.summary.total,
    passed: result.report.summary.passed,
    score: result.report.summary.score,
    pass: result.evaluation.pass,
    reportDir: output.reportDir
  });
  return {
    ...result,
    reportOutput: output
  };
}
