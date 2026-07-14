export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const defaultShouldRetry = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("429")) return true;
    if (msg.includes("timeout") || msg.includes("timed out")) return true;
    if (msg.includes("econnreset") || msg.includes("socket hang up")) return true;
  }
  return false;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  const maxDelayMs = opts.maxDelayMs ?? 8000;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));

      const retryAfter = extractRetryAfter(error);
      if (retryAfter) {
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      }
    }
  }

  throw lastError;
}

function extractRetryAfter(error: unknown): number | null {
  if (error && typeof error === "object" && "headers" in error) {
    const headers = (error as { headers?: Record<string, string> }).headers;
    if (headers?.["retry-after"]) {
      const seconds = parseFloat(headers["retry-after"]);
      if (!isNaN(seconds)) return seconds;
    }
  }
  return null;
}