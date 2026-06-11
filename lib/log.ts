type LogLevel = "info" | "warn" | "error";

interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

function logToConsole(level: LogLevel, event: string, ctx?: LogContext) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...ctx,
  };
  console.log(JSON.stringify(entry));
}

export const log = {
  info: (event: string, ctx?: LogContext) => logToConsole("info", event, ctx),
  warn: (event: string, ctx?: LogContext) => logToConsole("warn", event, ctx),
  error: (event: string, ctx?: LogContext) =>
    logToConsole("error", event, ctx),
};
