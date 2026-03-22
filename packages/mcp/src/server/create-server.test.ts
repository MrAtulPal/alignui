import { MCP_TOOL_NAMES, createMcpServer } from "./create-server.js";

describe("createMcpServer", () => {
  test("defines only the v1 tools", () => {
    expect(MCP_TOOL_NAMES).toEqual(["validate_inputs", "scan_compliance"]);
  });

  test("creates the server", () => {
    const created = createMcpServer();

    expect(created.server).toBeDefined();
    expect(typeof created.start).toBe("function");
  });
});
