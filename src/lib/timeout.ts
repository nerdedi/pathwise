export class TimeoutError extends Error {
  readonly timeoutMs: number;
  readonly operation: string;

  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
    this.operation = operation;
  }
}

export function parseTimeoutFromEnv(
  key: string,
  fallbackMs: number,
  minMs = 1_000,
  maxMs = 120_000
) {
  const raw = process.env[key];
  if (!raw) return fallbackMs;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallbackMs;

  return Math.max(minMs, Math.min(maxMs, Math.round(parsed)));
}

export async function withTimeout<T>(
  operation: string,
  timeoutMs: number,
  task: Promise<T> | (() => Promise<T>)
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const promise = typeof task === "function" ? task() : task;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new TimeoutError(operation, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type FetchWithTimeoutInit = RequestInit & {
  timeoutMs: number;
  operation: string;
};

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit
) {
  const { timeoutMs, operation, ...requestInit } = init;
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort(new TimeoutError(operation, timeoutMs));
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw error;
    }

    if ((error as { name?: string } | undefined)?.name === "AbortError") {
      throw new TimeoutError(operation, timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
