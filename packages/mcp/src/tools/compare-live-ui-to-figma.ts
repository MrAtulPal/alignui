import { createLogger, type ScanComplianceParams } from "@designlatch/app";
import { runScanCompliance } from "./scan-compliance.js";
import { runValidateInputs } from "./validate-inputs.js";

const logger = createLogger("mcp.compare_live_ui_to_figma");

type CompareTolerance = { kind: "px"; value: number } | { kind: "rgba"; value: number } | { kind: "ratio"; value: number };
type CompareSeverity = "error" | "warn";

type CompareLiveUiToFigmaParams = {
  request: string;
  liveUrl: string;
  selector: string;
  figmaFileOrUrl: string;
  figmaNodeIdOrComponentName: string;
  urlOverride?: string;
  prerequisites?: {
    playwrightMcpConfigured?: boolean;
    figmaMcpConfigured?: boolean;
    figmaAuthenticated?: boolean;
  };
  liveCapture?: {
    text?: string;
    computed: Record<string, string>;
  };
  figmaDesign?: {
    componentName?: string;
    tokenNamespace?: string;
    thresholds?: {
      minScore?: number;
      failOnSeverity?: CompareSeverity;
      failOnUnmatchedSelectors?: boolean;
      failOnMissingTokens?: boolean;
      failOnMissingComputed?: boolean;
    };
    properties: Record<
      string,
      {
        expected: string;
        tolerance?: CompareTolerance;
        severity?: CompareSeverity;
        tokenKey?: string;
      }
    >;
  };
};

type MissingPrerequisite = "playwright_mcp" | "figma_mcp" | "figma_auth";

function listMissingPrerequisites(
  prerequisites: CompareLiveUiToFigmaParams["prerequisites"]
): MissingPrerequisite[] {
  const missing: MissingPrerequisite[] = [];

  if (!prerequisites?.playwrightMcpConfigured) missing.push("playwright_mcp");
  if (!prerequisites?.figmaMcpConfigured) missing.push("figma_mcp");
  if (!prerequisites?.figmaAuthenticated) missing.push("figma_auth");

  return missing;
}

function formatBlockedMessage(missing: MissingPrerequisite[]): string {
  const steps: string[] = [];

  if (missing.includes("playwright_mcp")) {
    steps.push("Configure Playwright MCP in your AI client so the agent can inspect live computed styles.");
  }
  if (missing.includes("figma_mcp")) {
    steps.push("Configure Figma MCP in your AI client so the agent can read the target component or node.");
  }
  if (missing.includes("figma_auth")) {
    steps.push("Validate Figma MCP authentication before retrying the DesignLatch comparison.");
  }

  return `Cannot run DesignLatch comparison yet. ${steps.join(" ")}`.trim();
}

function slugifySegment(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function toTokenNamespace(params: CompareLiveUiToFigmaParams): string {
  const explicit = params.figmaDesign?.tokenNamespace?.split(".").map(slugifySegment).filter(Boolean).join(".");
  if (explicit) return explicit;

  const fromComponent = params.figmaDesign?.componentName ?? params.figmaNodeIdOrComponentName;
  const namespace = slugifySegment(fromComponent).replace(/-/g, ".");
  return namespace || "figma.component";
}

function parseColor(input: string): { r: number; g: number; b: number; a: number } | null {
  const s = input.trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const rgb = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+)\s*)?\)$/);
  if (!rgb) return null;

  const r = Number(rgb[1]);
  const g = Number(rgb[2]);
  const b = Number(rgb[3]);
  const a = rgb[4] === undefined ? 1 : Number(rgb[4]);

  if (![r, g, b, a].every(Number.isFinite)) return null;
  return { r, g, b, a };
}

function parsePx(input: string): number | null {
  const match = input.trim().toLowerCase().match(/^(-?[0-9.]+)px$/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parsePxBox(input: string): { top: number; right: number; bottom: number; left: number } | null {
  const parts = input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length < 1 || parts.length > 4) return null;

  const values = parts.map(parsePx);
  if (values.some((value) => value === null)) return null;

  const [top, right = top, bottom = top, left = right] = values as number[];
  return { top, right, bottom, left };
}

function isUnitlessNumber(input: string): boolean {
  return /^-?[0-9.]+$/.test(input.trim());
}

function inferTokenValue(property: string, expected: string) {
  const color = parseColor(expected);
  if (color) return { token: { kind: "color" as const, rgba: color }, tolerance: { kind: "rgba" as const, value: 0 } };

  const px = parsePx(expected);
  if (px !== null) {
    return { token: { kind: "number" as const, value: px, unit: "px" as const }, tolerance: { kind: "px" as const, value: 0 } };
  }

  const box = parsePxBox(expected);
  if (box) {
    return {
      token: { kind: "box" as const, unit: "px" as const, top: box.top, right: box.right, bottom: box.bottom, left: box.left },
      tolerance: { kind: "px" as const, value: 0 }
    };
  }

  if (property === "lineHeight" && isUnitlessNumber(expected)) {
    return {
      token: { kind: "number" as const, value: Number(expected), unit: "ratio" as const },
      tolerance: { kind: "ratio" as const, value: 0 }
    };
  }

  return { token: { kind: "string" as const, value: expected } };
}

function summarizeTopMismatches(result: Awaited<ReturnType<typeof runScanCompliance>>) {
  return result.report.results
    .filter((entry) => !entry.pass)
    .slice(0, 5)
    .map((entry) => ({
      selector: entry.selector,
      property: entry.property,
      token: entry.token,
      severity: entry.severity,
      details: entry.details ?? "Mismatch"
    }));
}

function buildScanInputs(params: CompareLiveUiToFigmaParams): ScanComplianceParams {
  const liveCapture = params.liveCapture;
  const figmaDesign = params.figmaDesign;

  if (!liveCapture || !figmaDesign) {
    throw new Error("Missing liveCapture or figmaDesign.");
  }

  const namespace = toTokenNamespace(params);
  const tokens: Record<string, unknown> = {};
  const properties: Record<string, { token: string; tolerance?: CompareTolerance; severity?: CompareSeverity }> = {};

  for (const [property, spec] of Object.entries(figmaDesign.properties)) {
    const inferred = inferTokenValue(property, spec.expected);
    const tokenKey = spec.tokenKey ?? `${namespace}.${slugifySegment(property)}`;
    tokens[tokenKey] = inferred.token;
    properties[property] = {
      token: tokenKey,
      tolerance: spec.tolerance ?? inferred.tolerance,
      severity: spec.severity ?? "error"
    };
  }

  return {
    config: {
      url: params.liveUrl,
      rules: [
        {
          id: `${slugifySegment(params.selector) || "target"}-comparison`,
          selector: params.selector,
          properties
        }
      ],
      thresholds: figmaDesign.thresholds
    },
    tokens,
    snapshots: [
      {
        selector: params.selector,
        url: params.liveUrl,
        text: liveCapture.text,
        computed: liveCapture.computed
      }
    ],
    urlOverride: params.urlOverride
  };
}

export async function runCompareLiveUiToFigma(params: CompareLiveUiToFigmaParams) {
  logger.info("tool started", {
    selector: params.selector,
    liveUrl: params.liveUrl,
    hasLiveCapture: params.liveCapture !== undefined,
    hasFigmaDesign: params.figmaDesign !== undefined
  });

  const missingPrerequisites = listMissingPrerequisites(params.prerequisites);
  if (missingPrerequisites.length > 0) {
    const blocked = {
      status: "blocked" as const,
      message: formatBlockedMessage(missingPrerequisites),
      missingPrerequisites
    };
    logger.warn("tool blocked", { missingPrerequisites });
    return blocked;
  }

  if (!params.liveCapture || !params.figmaDesign) {
    const validated = {
      status: "validated" as const,
      message:
        "Prerequisites are available. Use Playwright MCP to capture the live selector styles and Figma MCP to capture the component design values, then call compare_live_ui_to_figma again with liveCapture and figmaDesign.",
      nextAction: "collect_live_and_figma_data" as const,
      requiredInputs: {
        request: params.request,
        liveUrl: params.liveUrl,
        selector: params.selector,
        figmaFileOrUrl: params.figmaFileOrUrl,
        figmaNodeIdOrComponentName: params.figmaNodeIdOrComponentName
      }
    };
    logger.info("tool waiting for external data");
    return validated;
  }

  try {
    const scanInputs = buildScanInputs(params);
    const validationResult = runValidateInputs(scanInputs);
    const scanResult = await runScanCompliance(scanInputs);

    const completed = {
      status: "completed" as const,
      message: "Comparison completed.",
      validationResult: {
        counts: validationResult.counts,
        lintWarnings: validationResult.lintWarnings
      },
      scanSummary: {
        total: scanResult.report.summary.total,
        passed: scanResult.report.summary.passed,
        failed: scanResult.report.summary.failed,
        score: scanResult.report.summary.score,
        pass: scanResult.evaluation.pass,
        reasons: scanResult.evaluation.reasons
      },
      topMismatches: summarizeTopMismatches(scanResult),
      reportOutput: scanResult.reportOutput
    };
    logger.info("tool completed", {
      total: completed.scanSummary.total,
      passed: completed.scanSummary.passed,
      score: completed.scanSummary.score,
      pass: completed.scanSummary.pass
    });
    return completed;
  } catch (error) {
    const failed = {
      status: "failed" as const,
      message: error instanceof Error ? error.message : String(error)
    };
    logger.error("tool failed", { error: failed.message });
    return failed;
  }
}
