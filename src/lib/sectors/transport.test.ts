import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createSectorsClient } from "./transport";
const key = "unit-test-credential-not-real";
afterEach(() => vi.useRealTimers());
function setup(status = 200, body = "{}", headers = {}) {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => new Response(body, { status, headers }));
  const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue();
  const trace = vi.fn();
  const client = createSectorsClient({
    key,
    fetcher,
    sleep,
    trace,
    random: () => 0,
  });
  return { client, fetcher, sleep, trace };
}
describe("Sectors transport", () => {
  it("uses raw authorization only at the allowed server origin and traces no credential", async () => {
    const { client, fetcher, trace } = setup();
    const response = await client.request("/daily/BBCA/");
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      headers: { Authorization: key },
      redirect: "error",
      cache: "no-store",
    });
    expect(String(fetcher.mock.calls[0][0])).toBe(
      "https://api.sectors.app/v2/daily/BBCA/",
    );
    expect(JSON.stringify({ response, trace: trace.mock.calls })).not.toContain(
      key,
    );
  });
  it.each([401, 403])(
    "classifies %i as auth/plan without retry or response body leakage",
    async (status) => {
      const { client, fetcher } = setup(status, key);
      await expect(client.request("/companies/")).rejects.toMatchObject({
        status,
        kind: "AUTH_OR_PLAN",
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each([429, 500, 502, 503])(
    "bounds retries on %i with exponential backoff",
    async (status) => {
      const { client, fetcher, sleep } = setup(status, key);
      await expect(client.request("/companies/")).rejects.toMatchObject({
        status,
      });
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(sleep.mock.calls).toEqual([[500], [1000]]);
    },
  );
  it("recovers after a transient failure and respects Retry-After", async () => {
    const { client, fetcher, sleep } = setup();
    fetcher.mockResolvedValueOnce(
      new Response(null, { status: 429, headers: { "retry-after": "2" } }),
    );
    expect((await client.request("/companies/")).attempts).toBe(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });
  it("does not retry before a long quota reset", async () => {
    const { client, fetcher, sleep } = setup(429, "{}", {
      "retry-after": "3600",
    });
    await expect(client.request("/companies/")).rejects.toMatchObject({
      status: 429,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
  it.each([400, 404, 422])("never retries %i", async (status) => {
    const { client, fetcher } = setup(status);
    await expect(client.request("/companies/")).rejects.toMatchObject({
      status,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("handles malformed JSON without retaining upstream body", async () => {
    const { client, fetcher, trace } = setup(200, key);
    const error = await client.request("/companies/").catch((e) => e);
    expect(error.kind).toBe("INVALID_JSON");
    expect(
      `${error.stack}${JSON.stringify(error)}${JSON.stringify(trace.mock.calls)}`,
    ).not.toContain(key);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("discards raw network errors and arbitrary rate headers", async () => {
    const { client, fetcher, trace } = setup(503, key, {
      "x-ratelimit-remaining": key,
    });
    fetcher.mockRejectedValueOnce(new Error(`Authorization: ${key}`));
    const error = await client.request("/companies/").catch((e) => e);
    expect(error.kind).toBe("NETWORK");
    expect(`${error.stack}${JSON.stringify(trace.mock.calls)}`).not.toContain(
      key,
    );
  });
  it.each([false, true])(
    "times out a stalled request/body (body=%s)",
    async (body) => {
      vi.useFakeTimers();
      const stalled = new Promise<never>(() => {});
      const fetcher = vi
        .fn<typeof fetch>()
        .mockImplementation(async () =>
          body ? new Response(new ReadableStream({ start() {} })) : stalled,
        );
      const client = createSectorsClient({ key, fetcher, timeoutMs: 20 });
      const assertion = expect(
        client.request("/companies/"),
      ).rejects.toMatchObject({ kind: "TIMEOUT" });
      await vi.advanceTimersByTimeAsync(21);
      await assertion;
      expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    "https://example.com/v2",
    "invalid",
    "https://api.sectors.app/v1",
    "https://user:pass@api.sectors.app/v2",
  ])("rejects unsafe base %s", (baseUrl) => {
    expect(() => createSectorsClient({ key, baseUrl })).toThrow(
      "configuration",
    );
  });
  it.each([
    "//example.com/",
    "/../company/",
    "/%2e%2e/company/",
    "https://example.com",
    "/company/#fragment",
  ])("rejects unsafe path %s before fetch", async (path) => {
    const { client, fetcher } = setup();
    await expect(client.request(path)).rejects.toMatchObject({ kind: "SETUP" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects missing credentials", () =>
    expect(() => createSectorsClient({ key: "" })).toThrow("configuration"));
});
