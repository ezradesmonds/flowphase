import { describe, expect, it } from "vitest";
import type { MarketCandle } from "@/domain/chart-market";
import { classifyCandle, detectPhaseRegions } from "./detect";
function trend(direction = 1, count = 65): MarketCandle[] {
  return Array.from({ length: count }, (_, i) => {
    const close = 200 + direction * i;
    return {
      time: 1700000000 + i * 60,
      open: close - direction * 0.5,
      high: close + 0.7,
      low: close - 0.7,
      close,
      volume: 100,
    };
  });
}
function range(positive: boolean): MarketCandle[] {
  return Array.from({ length: 60 }, (_, i) => ({
    time: 1700000000 + i * 60,
    open: 100,
    high: 102,
    low: 98,
    close: 100 + (positive ? 1 : -1) + (i % 2 ? 0.1 : -0.1),
    volume: 100,
  }));
}
describe("OHLCV phase detection", () => {
  it("detects four phases with euphoria as a markup risk tag from candle behavior", () => {
    expect(detectPhaseRegions("AAA", "1D", trend())[0].phase).toBe("MARKUP");
    expect(detectPhaseRegions("AAA", "1D", trend(-1))[0].phase).toBe(
      "MARKDOWN",
    );
    expect(detectPhaseRegions("AAA", "1D", range(true))[0].phase).toBe(
      "ACCUMULATION",
    );
    expect(detectPhaseRegions("AAA", "1D", range(false))[0].phase).toBe(
      "DISTRIBUTION",
    );
    const euphoric = trend().map((c, i) => ({
      ...c,
      volume: i < 40 ? 100 : 100 * 1.3 ** (i - 39),
    }));
    expect(
      detectPhaseRegions("AAA", "1D", euphoric).some(
        (r) => r.phase === "MARKUP" && r.tags?.includes("EUPHORIA_RISK"),
      ),
    ).toBe(true);
  });
  it("leaves short, flat, no-volume and ambiguous inputs uncolored", () => {
    expect(detectPhaseRegions("AAA", "1", trend(1, 22))).toEqual([]);
    expect(
      detectPhaseRegions(
        "AAA",
        "1",
        trend().map((c) => ({ ...c, volume: 0 })),
      ),
    ).toEqual([]);
    expect(
      detectPhaseRegions(
        "AAA",
        "1",
        range(true).map((c) => ({ ...c, close: 100 })),
      ),
    ).toEqual([]);
  });
  it("uses actual timestamps and price bounds, with distinct ticker/timeframe identities", () => {
    const candles = trend();
    const before = structuredClone(candles);
    const regions = detectPhaseRegions("bbca", "15", candles);
    const region = regions[0];
    const bars = candles.filter(
      (c) => c.time >= region.startTimestamp && c.time <= region.endTimestamp,
    );
    expect(region).toMatchObject({
      ticker: "BBCA",
      status: "CALCULATED",
      startTimestamp: candles[22].time,
      endTimestamp: candles.at(-1)!.time,
      lowPrice: Math.min(...bars.map((c) => c.low)),
      highPrice: Math.max(...bars.map((c) => c.high)),
      startPrice: bars[0].open,
      endPrice: bars.at(-1)!.close,
    });
    expect(region.confidence).toBeGreaterThanOrEqual(50);
    expect(region.confidence).toBeLessThanOrEqual(95);
    expect(region.id).not.toBe(detectPhaseRegions("TLKM", "15", candles)[0].id);
    expect(region.id).not.toBe(detectPhaseRegions("BBCA", "1D", candles)[0].id);
    expect(candles).toEqual(before);
  });
  it("classifies each bar without future candles and is price-scale invariant", () => {
    const candles = trend();
    expect(classifyCandle(candles, 35)).toEqual(
      classifyCandle(candles.slice(0, 36), 35),
    );
    const scaled = candles.map((c) => ({
      ...c,
      open: c.open * 100,
      high: c.high * 100,
      low: c.low * 100,
      close: c.close * 100,
    }));
    expect(detectPhaseRegions("AAA", "1", scaled).map((r) => r.phase)).toEqual(
      detectPhaseRegions("AAA", "1", candles).map((r) => r.phase),
    );
  });
  it("recalculates on updates and rejects invalid or out-of-order snapshots", () => {
    const candles = trend();
    const old = detectPhaseRegions("AAA", "1", candles.slice(0, -1));
    const next = detectPhaseRegions("AAA", "1", candles);
    expect(old[0].id).toBe(next[0].id);
    expect(old[0].endTimestamp).toBeLessThan(next[0].endTimestamp);
    expect(detectPhaseRegions("AAA", "1", [...candles].reverse())).toEqual([]);
    expect(
      detectPhaseRegions(
        "AAA",
        "1",
        candles.map((c) => ({ ...c, volume: NaN })),
      ),
    ).toEqual([]);
  });
  it("does not merge classified runs across unclassified gaps", () => {
    const candles = [
      ...trend(),
      ...Array.from({ length: 30 }, (_, i) => ({
        time: 1700000000 + (65 + i) * 60,
        open: 264,
        high: 265,
        low: 263,
        close: 264,
        volume: 100,
      })),
      ...trend(1, 50).map((c, i) => ({
        ...c,
        time: 1700000000 + (95 + i) * 60,
        open: c.open + 64,
        high: c.high + 64,
        low: c.low + 64,
        close: c.close + 64,
      })),
    ];
    const regions = detectPhaseRegions("AAA", "1", candles);
    expect(regions.length).toBeGreaterThan(1);
    expect(regions.every((r) => r.phase !== "UNCLASSIFIED")).toBe(true);
    for (let i = 1; i < regions.length; i++)
      expect(regions[i].startTimestamp).toBeGreaterThan(
        regions[i - 1].endTimestamp,
      );
  });
});
