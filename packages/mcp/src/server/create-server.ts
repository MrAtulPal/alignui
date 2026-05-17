import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLogger } from "@designlatch/app";
import { asJsonText } from "../lib/json.js";
import { compareLiveUiToFigmaSchema, scanComplianceSchema, validateInputsSchema } from "../lib/schemas.js";
import { runCompareLiveUiToFigma } from "../tools/compare-live-ui-to-figma.js";
import { runScanCompliance } from "../tools/scan-compliance.js";
import { runValidateInputs } from "../tools/validate-inputs.js";

const logger = createLogger("mcp.server");
export const MCP_TOOL_NAMES = ["validate_inputs", "scan_compliance", "compare_live_ui_to_figma"] as const;

function toToolResponse(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: asJsonText(value)
      }
    ]
  };
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

export function createMcpServer() {
  const server = new McpServer({
    name: "@designlatch/mcp",
    version: "0.1.0"
  });

  server.tool(
    MCP_TOOL_NAMES[0],
    "Validate config, tokens, and snapshots passed as inline JSON.",
    validateInputsSchema.shape,
    async (params) => {
      try {
        return toToolResponse(runValidateInputs(params));
      } catch (error) {
        const normalized = toError(error);
        logger.error("tool failed", { tool: "validate_inputs", error: normalized.message });
        throw normalized;
      }
    }
  );

  server.tool(
    MCP_TOOL_NAMES[1],
    "Run compliance scanning from inline config, tokens, and snapshots JSON.",
    scanComplianceSchema.shape,
    async (params) => {
      try {
        return toToolResponse(await runScanCompliance(params));
      } catch (error) {
        const normalized = toError(error);
        logger.error("tool failed", { tool: "scan_compliance", error: normalized.message });
        throw normalized;
      }
    }
  );

  server.tool(
    MCP_TOOL_NAMES[2],
    "Compare a live UI selector against a Figma component. If Playwright MCP or Figma MCP is not configured or Figma auth is unavailable, return setup guidance and stop. If prerequisites are available, provide liveCapture and figmaDesign payloads gathered from those tools so DesignLatch can synthesize inputs, validate them, and run the scan.",
    compareLiveUiToFigmaSchema.shape,
    async (params) => {
      try {
        return toToolResponse(await runCompareLiveUiToFigma(params));
      } catch (error) {
        const normalized = toError(error);
        logger.error("tool failed", { tool: "compare_live_ui_to_figma", error: normalized.message });
        throw normalized;
      }
    }
  );

  return {
    server,
    async start() {
      logger.info("server starting");
      const transport = new StdioServerTransport();
      await server.connect(transport);
      logger.info("server connected");
    }
  };
}
