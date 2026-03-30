import { createLogger } from "./logger.js";

describe("logger", () => {
  const originalLevel = process.env.LOG_LEVEL;
  let writes: string[];
  let writeSpy: jest.SpiedFunction<typeof process.stderr.write>;

  beforeEach(() => {
    writes = [];
    writeSpy = jest.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
  });

  afterEach(() => {
    writeSpy.mockRestore();
    if (originalLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = originalLevel;
  });

  test("writes structured json to stderr", () => {
    process.env.LOG_LEVEL = "info";
    const logger = createLogger("test");

    logger.info("hello", { runId: 123 });

    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0] ?? "")).toMatchObject({
      level: "info",
      scope: "test",
      message: "hello",
      context: { runId: 123 }
    });
  });

  test("filters below configured level", () => {
    process.env.LOG_LEVEL = "warn";
    const logger = createLogger("test");

    logger.info("skip");
    logger.error("keep");

    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0] ?? "")).toMatchObject({
      level: "error",
      message: "keep"
    });
  });
});
