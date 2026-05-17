import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCompareLiveUiToFigma } from "./compare-live-ui-to-figma.js";

describe("runCompareLiveUiToFigma", () => {
  test("blocks when Playwright MCP and Figma auth are unavailable", async () => {
    const result = await runCompareLiveUiToFigma({
      request: "Compare google.com's search bar UI with this Figma search bar component",
      liveUrl: "https://google.com",
      selector: "textarea[name='q']",
      figmaFileOrUrl: "https://www.figma.com/file/abc123/search-bar",
      figmaNodeIdOrComponentName: "Search Bar",
      prerequisites: {
        playwrightMcpConfigured: false,
        figmaMcpConfigured: true,
        figmaAuthenticated: false
      }
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error(`Expected blocked result, received ${result.status}`);
    expect(result.missingPrerequisites).toEqual(["playwright_mcp", "figma_auth"]);
    expect(result.message).toMatch(/configure Playwright MCP/i);
  });

  test("captures the requirement when prerequisites are present but external data has not been gathered yet", async () => {
    const result = await runCompareLiveUiToFigma({
      request: "Compare google.com's search bar UI with this Figma search bar component",
      liveUrl: "https://google.com",
      selector: "textarea[name='q']",
      figmaFileOrUrl: "https://www.figma.com/file/abc123/search-bar",
      figmaNodeIdOrComponentName: "Search Bar",
      prerequisites: {
        playwrightMcpConfigured: true,
        figmaMcpConfigured: true,
        figmaAuthenticated: true
      }
    });

    expect(result.status).toBe("validated");
    if (result.status !== "validated") throw new Error(`Expected validated result, received ${result.status}`);
    expect(result.nextAction).toBe("collect_live_and_figma_data");
    expect(result.requiredInputs?.selector).toBe("textarea[name='q']");
  });

  test("builds DesignLatch payloads and returns a completed scan summary when live and Figma data are provided", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "designlatch-mcp-compare-"));
    const cwd = process.cwd();

    try {
      process.chdir(dir);

      const result = await runCompareLiveUiToFigma({
        request: "Compare google.com's search bar UI with this Figma search bar component",
        liveUrl: "https://google.com",
        selector: "textarea[name='q']",
        figmaFileOrUrl: "https://www.figma.com/file/abc123/search-bar",
        figmaNodeIdOrComponentName: "Search Bar",
        prerequisites: {
          playwrightMcpConfigured: true,
          figmaMcpConfigured: true,
          figmaAuthenticated: true
        },
        liveCapture: {
          text: "Google Search",
          computed: {
            backgroundColor: "rgb(255, 255, 255)",
            color: "rgb(32, 33, 36)",
            padding: "0px 16px",
            borderRadius: "24px",
            fontSize: "16px"
          }
        },
        figmaDesign: {
          componentName: "Search Bar",
          properties: {
            backgroundColor: { expected: "rgb(255, 255, 255)" },
            color: { expected: "rgb(32, 33, 36)" },
            padding: { expected: "0px 16px" },
            borderRadius: { expected: "24px" },
            fontSize: { expected: "16px" }
          },
          thresholds: {
            minScore: 90,
            failOnSeverity: "error"
          }
        }
      });

      expect(result.status).toBe("completed");
      if (result.status !== "completed") throw new Error(`Expected completed result, received ${result.status}`);
      expect(result.scanSummary).toMatchObject({
        total: 5,
        passed: 5,
        failed: 0,
        score: 100,
        pass: true
      });
      expect(result.reportOutput?.reportDir).toBe(path.join(dir, "report"));
      await expect(readFile(path.join(dir, "report", "report.json"), "utf8")).resolves.toMatch(/"score"/);
    } finally {
      process.chdir(cwd);
    }
  });
});
