import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeTicker,
  toTradingViewSymbol,
  fromTradingViewSymbol,
} from "./symbol";
import { normalizePeriods } from "./adapters";
import { candleRequestSchema } from "./schemas";
import { subscribeCandles } from "./session";
import type { ChartClient } from "./transport";
const period = {
  time: 1789600000,
  open: 100,
  max: 120,
  min: 90,
  close: 110,
  volume: 10,
};
function transport() {
  let update = () => {};
  let error = () => {};
  let connected = () => {};
  const deleted = vi.fn();
  const end = vi.fn(async () => {});
  class Chart {
    periods: unknown[] = [period];
    onUpdate(cb: () => void) {
      update = cb;
    }
    onError(cb: () => void) {
      error = cb;
    }
    setMarket = vi.fn();
    delete = deleted;
  }
  const client: ChartClient = {
    Session: { Chart },
    end,
    onConnected: (cb) => {
      connected = cb;
    },
    onDisconnected: () => {},
    onError: (cb) => {
      error = cb;
    },
  };
  return {
    client,
    update: () => update(),
    error: () => error(),
    connected: () => connected(),
    deleted,
    end,
  };
}
afterEach(() => vi.useRealTimers());
describe("TradingView normalization", () => {
  it("canonicalizes IDX symbols and rejects other exchanges/injection", () => {
    expect(normalizeTicker(" bbca ")).toBe("BBCA");
    expect(toTradingViewSymbol("bbca")).toBe("IDX:BBCA");
    expect(fromTradingViewSymbol("idx:bbca")).toBe("BBCA");
    for (const input of ["NASDAQ:AAPL", "IDX:BBCA", "../BBCA", "=BBCA", ""])
      expect(() => normalizeTicker(input)).toThrow();
    expect(() => fromTradingViewSymbol("NASDAQ:AAPL")).toThrow();
  });
  it("sorts and deduplicates timestamps, preserves volume and maps high/low", () => {
    const rows = normalizePeriods(
      [
        { ...period, time: period.time + 60 },
        period,
        { ...period, close: 115 },
      ],
      500,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      time: period.time,
      open: 100,
      high: 120,
      low: 90,
      close: 115,
      volume: 10,
    });
    expect(
      normalizePeriods([period, { ...period, time: period.time + 60 }], 1),
    ).toHaveLength(1);
  });
  it("rejects malformed upstream payloads rather than inventing candles", () => {
    for (const p of [
      { ...period, max: 99 },
      { ...period, volume: NaN },
      { ...period, time: -1 },
      { ...period, min: 115 },
    ])
      expect(() => normalizePeriods([p], 200)).toThrow();
  });
  it("bounds requests and defaults to daily candles", () => {
    expect(candleRequestSchema.parse({ ticker: "bbca" })).toEqual({
      ticker: "BBCA",
      timeframe: "1D",
      limit: 200,
    });
    expect(
      candleRequestSchema.safeParse({ ticker: "BBCA", limit: 501 }).success,
    ).toBe(false);
    expect(
      candleRequestSchema.safeParse({ ticker: "BBCA", timeframe: "bogus" })
        .success,
    ).toBe(false);
  });
});
describe("TradingView session lifecycle", () => {
  const request = { ticker: "BBCA", timeframe: "1D" as const, limit: 200 };
  it("normalizes updates and cleanup is idempotent", () => {
    const t = transport(),
      data = vi.fn(),
      error = vi.fn();
    const stop = subscribeCandles(() => t.client, request, data, error);
    t.update();
    expect(data.mock.calls[0][0].source).toBe("TRADINGVIEW");
    stop();
    stop();
    t.update();
    expect(data).toHaveBeenCalledTimes(1);
    expect(t.deleted).toHaveBeenCalledTimes(1);
    expect(t.end).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });
  it("times out, cleans up and closes a late-opened connection", () => {
    vi.useFakeTimers();
    const t = transport(),
      error = vi.fn();
    subscribeCandles(() => t.client, request, vi.fn(), error);
    vi.advanceTimersByTime(15000);
    expect(error.mock.calls[0][0].code).toBe("TIMEOUT");
    expect(t.deleted).toHaveBeenCalledTimes(1);
    t.connected();
    expect(t.end).toHaveBeenCalledTimes(2);
  });
  it("cancels on abort and does not expose raw provider errors", () => {
    const t = transport(),
      error = vi.fn(),
      abort = new AbortController();
    subscribeCandles(() => t.client, request, vi.fn(), error, abort.signal);
    abort.abort();
    t.error();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0].code).toBe("ABORTED");
    expect(t.deleted).toHaveBeenCalledTimes(1);
  });
  it("does not connect an already cancelled request", () => {
    const factory = vi.fn(),
      abort = new AbortController();
    abort.abort();
    subscribeCandles(factory, request, vi.fn(), vi.fn(), abort.signal);
    expect(factory).not.toHaveBeenCalled();
  });
});
