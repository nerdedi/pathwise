type LogContext = Record<string, unknown>;

function serializeContext(context?: LogContext) {
  if (!context || Object.keys(context).length === 0) return "";
  return ` ${JSON.stringify(context)}`;
}

export function logError(scope: string, error: unknown, context?: LogContext) {
  console.error(`[${scope}]${serializeContext(context)}`, error);
}

export function logWarn(scope: string, message: string, context?: LogContext) {
  console.warn(`[${scope}] ${message}${serializeContext(context)}`);
}
