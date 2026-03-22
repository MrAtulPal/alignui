export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
};

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function normalizeLevel(value: string | undefined): LogLevel {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") return value;
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = normalizeLevel(process.env.LOG_LEVEL?.toLowerCase());
  return levelOrder[level] >= levelOrder[currentLevel];
}

function writeRecord(scope: string, level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const record = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...(context ? { context } : {})
  };

  process.stderr.write(`${JSON.stringify(record)}\n`);
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, context) => writeRecord(scope, "debug", message, context),
    info: (message, context) => writeRecord(scope, "info", message, context),
    warn: (message, context) => writeRecord(scope, "warn", message, context),
    error: (message, context) => writeRecord(scope, "error", message, context)
  };
}
