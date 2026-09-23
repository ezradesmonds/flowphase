import "server-only";

export type SectorsErrorKind =
  | "SETUP"
  | "AUTH_OR_PLAN"
  | "RATE_LIMIT"
  | "HTTP"
  | "TIMEOUT"
  | "NETWORK"
  | "INVALID_JSON";

/** Fixed messages discard upstream bodies, URLs and exception causes. */
export class SectorsError extends Error {
  readonly status: number;
  readonly kind: SectorsErrorKind;
  constructor(status: number, kind?: SectorsErrorKind) {
    const resolved =
      kind ??
      (status === 401 || status === 403
        ? "AUTH_OR_PLAN"
        : status === 429
          ? "RATE_LIMIT"
          : "HTTP");
    const messages: Record<SectorsErrorKind, string> = {
      SETUP: "Sectors configuration is missing or invalid.",
      AUTH_OR_PLAN:
        "Sectors access is unavailable for this API key or subscription.",
      RATE_LIMIT: "Sectors quota or rate limit reached. Try again later.",
      HTTP: "Sectors request failed. Check the HTTP status.",
      TIMEOUT: "Sectors request timed out.",
      NETWORK: "Sectors network request failed.",
      INVALID_JSON: "Sectors returned invalid JSON.",
    };
    super(messages[resolved]);
    this.name = "SectorsError";
    this.status = status;
    this.kind = resolved;
  }
}

export type RequestTrace = {
  attempt: number;
  status: number;
  latencyMs: number;
  kind?: SectorsErrorKind;
  rateLimit: Record<string, string>;
};
type Options = {
  key?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetcher?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  trace?: (event: RequestTrace) => void;
};

export function createSectorsClient(options: Options = {}) {
  const key = options.key ?? process.env.SECTORS_API_KEY;
  const base =
    options.baseUrl ??
    process.env.SECTORS_API_BASE_URL ??
    "https://api.sectors.app/v2";
  let baseUrl: URL;
  try {
    baseUrl = new URL(base);
  } catch {
    throw new SectorsError(0, "SETUP");
  }
  if (
    !key?.trim() ||
    /[\r\n]/.test(key) ||
    baseUrl.origin !== "https://api.sectors.app" ||
    baseUrl.pathname.replace(/\/$/, "") !== "/v2" ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new SectorsError(0, "SETUP");
  }
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxRetries = options.maxRetries ?? 2;
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 60000 ||
    !Number.isInteger(maxRetries) ||
    maxRetries < 0 ||
    maxRetries > 2
  )
    throw new SectorsError(0, "SETUP");
  const fetcher = options.fetcher ?? fetch;
  const sleep =
    options.sleep ??
    ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  function trace(event: RequestTrace) {
    try {
      options.trace?.(event);
    } catch {
      /* Observability cannot change requests. */
    }
  }
  return {
    async request(path: string): Promise<{
      data: unknown;
      status: number;
      latencyMs: number;
      attempts: number;
      rateLimit: Record<string, string>;
    }> {
      // No absolute URLs, traversal or redirect-based credential forwarding.
      if (!/^\/[a-zA-Z0-9][a-zA-Z0-9/_-]*(?:\?[^#\\\r\n]*)?$/.test(path))
        throw new SectorsError(0, "SETUP");
      const url = new URL(`${baseUrl.href.replace(/\/$/, "")}${path}`);
      if (url.origin !== baseUrl.origin || !url.pathname.startsWith("/v2/"))
        throw new SectorsError(0, "SETUP");
      const started = Date.now();
      for (let attempt = 0; ; attempt++) {
        const attemptStart = Date.now();
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let status = 0;
        let retryAfterMs = 0;
        const rateLimit: Record<string, string> = {};
        let failure: SectorsError;
        try {
          const operation = (async () => {
            const response = await fetcher(url, {
              headers: { Authorization: key, Accept: "application/json" },
              signal: controller.signal,
              redirect: "error",
              cache: "no-store",
            });
            status = response.status;
            for (const name of [
              "retry-after",
              "x-ratelimit-limit",
              "x-ratelimit-remaining",
              "x-ratelimit-reset",
              "ratelimit-limit",
              "ratelimit-remaining",
              "ratelimit-reset",
            ]) {
              const value = response.headers.get(name);
              if (value && /^\d{1,12}$/.test(value) && !value.includes(key))
                rateLimit[name] = value;
            }
            const retryAfter = response.headers.get("retry-after");
            if (retryAfter)
              retryAfterMs = /^\d+$/.test(retryAfter)
                ? Number(retryAfter) * 1000
                : Math.max(0, Date.parse(retryAfter) - Date.now());
            if (!response.ok) {
              await response.body?.cancel();
              throw new SectorsError(status);
            }
            try {
              return (await response.json()) as unknown;
            } catch {
              throw new SectorsError(
                status,
                controller.signal.aborted ? "TIMEOUT" : "INVALID_JSON",
              );
            }
          })();
          const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new SectorsError(status, "TIMEOUT"));
            }, timeoutMs);
          });
          const data = await Promise.race([operation, timeout]);
          trace({
            attempt: attempt + 1,
            status,
            latencyMs: Date.now() - attemptStart,
            rateLimit,
          });
          return {
            data,
            status,
            latencyMs: Date.now() - started,
            attempts: attempt + 1,
            rateLimit,
          };
        } catch (error) {
          failure =
            error instanceof SectorsError
              ? error
              : new SectorsError(status, "NETWORK");
          trace({
            attempt: attempt + 1,
            status,
            latencyMs: Date.now() - attemptStart,
            kind: failure.kind,
            rateLimit,
          });
        } finally {
          clearTimeout(timer);
        }
        const retryable =
          failure.kind === "RATE_LIMIT" ||
          (failure.kind === "HTTP" && status >= 500 && status <= 599);
        // A long Retry-After stops retries, never permits an earlier request.
        if (!retryable || attempt >= maxRetries || retryAfterMs > 10000)
          throw failure;
        const delay = Math.max(
          Number.isFinite(retryAfterMs) ? retryAfterMs : 0,
          500 * 2 ** attempt + Math.floor(random() * 250),
        );
        await sleep(delay);
      }
    },
  };
}
