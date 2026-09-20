import { describe, it, expect } from "vitest";
import { brokerProfile, BROKER_REGISTRY } from "@/config/brokers";
import { TRANSACTION_CAPABILITY } from "@/config/analysis";
import { calculateInventory, aggregateGroups } from "./inventory";
import { priceVolume } from "./price-volume";
import { volumeAlerts, brokerAlerts } from "./alerts";
import { detectCycles } from "./cycles";
import { detectPhaseRegions } from "@/lib/phases/detect";
import { analyze } from "./analyze";
import type { BrokerFlow, PhaseRegion } from "@/domain/market";
import type { MarketCandle } from "@/domain/chart-market";
const flows: BrokerFlow[] = [
  {
    ticker: "TEST",
    date: "2026-08-03",
    brokerCode: "AK",
    buyLot: 0,
    sellLot: 30,
    sellValue: 330000,
  },
  {
    ticker: "TEST",
    date: "2026-08-01",
    brokerCode: "AK",
    buyLot: 20,
    sellLot: 0,
    buyValue: 200000,
  },
  {
    ticker: "TEST",
    date: "2026-08-02",
    brokerCode: "AK",
    buyLot: 20,
    sellLot: 0,
    buyValue: 240000,
  },
  {
    ticker: "TEST",
    date: "2026-08-01",
    brokerCode: "XX",
    buyLot: 0,
    sellLot: 15,
  },
  {
    ticker: "ELSE",
    date: "2026-08-01",
    brokerCode: "AK",
    buyLot: 999,
    sellLot: 0,
  },
];
const candles = (count = 30): MarketCandle[] =>
  Array.from({ length: count }, (_, i) => ({
    time: 1785542400 + i * 86400,
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 100 + (i % 3) * 20,
  }));
describe("broker registry", () => {
  it("normalizes seeds and retains unknown brokers", () => {
    for (const p of BROKER_REGISTRY)
      expect(brokerProfile(p.brokerCode.toLowerCase())).toEqual(p);
    expect(brokerProfile(" ?? ").classification).toBe("MIXED_OR_UNKNOWN");
    expect(
      BROKER_REGISTRY.filter((p) => p.classification === "RETAIL_ACCESSIBLE"),
    ).toHaveLength(5);
  });
  it("supports registry changes and disabling a hypothesis", () => {
    expect(
      brokerProfile("AK", [{ ...BROKER_REGISTRY[9], enabled: false }])
        .classification,
    ).toBe("MIXED_OR_UNKNOWN");
    expect(
      brokerProfile("AK", [
        {
          ...BROKER_REGISTRY[9],
          classification: "RETAIL_ACCESSIBLE",
          confidence: 10,
        },
      ]).confidence,
    ).toBe(10);
  });
});
describe("period inventory", () => {
  it("sorts, separates ticker/broker and computes gross, signed, peak, reduction and ratio", () => {
    const before = structuredClone(flows);
    const rows = calculateInventory(
      flows,
      "TEST",
      "2026-08-01",
      "2026-08-03",
      150,
    );
    const ak = rows.find((r) => r.brokerCode === "AK")!;
    expect(ak).toMatchObject({
      grossBuyLot: 40,
      grossSellLot: 30,
      cumulativeNetLot: 10,
      peakEstimatedInventory: 40,
      estimatedRemainingInventory: 10,
      inventoryReduction: 30,
      remainingRatio: 0.25,
      weightedAverageBuyPrice: 110,
      weightedAverageSellPrice: 110,
      estimatedMarketValue: 150000,
      startingInventory: "UNKNOWN",
      activeTradingDays: 3,
    });
    expect(ak.history.map((h) => h.running)).toEqual([20, 40, 10]);
    expect(flows).toEqual(before);
  });
  it("retains negative signed flow but never negative holdings or fake missing values", () => {
    const row = calculateInventory(
      flows,
      "TEST",
      "2026-08-01",
      "2026-08-03",
    ).find((r) => r.brokerCode === "XX")!;
    expect(row.cumulativeNetLot).toBe(-15);
    expect(row.estimatedRemainingInventory).toBe(0);
    expect(row.remainingRatio).toBeNull();
    expect(row.netValue).toBeNull();
    expect(row.weightedAverageSellPrice).toBeNull();
  });
  it("resets net baseline separately for each cycle", () => {
    const first = calculateInventory(
      flows,
      "TEST",
      "2026-08-01",
      "2026-08-02",
    )[0];
    const second = calculateInventory(
      flows,
      "TEST",
      "2026-08-03",
      "2026-08-03",
    )[0];
    expect(first.estimatedRemainingInventory).toBe(40);
    expect(second.estimatedRemainingInventory).toBe(0);
    expect(second.cumulativeNetLot).toBe(-30);
  });
  it("weights supplied per-share averages when aggregate values are unavailable", () => {
    const row = calculateInventory(
      [
        { ...flows[1], buyValue: undefined, averageBuy: 100 },
        { ...flows[2], buyValue: undefined, averageBuy: 120 },
      ],
      "TEST",
      "2026-08-01",
      "2026-08-03",
    )[0];
    expect(row.weightedAverageBuyPrice).toBe(110);
    expect(row.grossBuyValue).toBeNull();
  });
  it("keeps unknown flow in its own group", () => {
    const groups = aggregateGroups(
      calculateInventory(flows, "TEST", "2026-08-01", "2026-08-03"),
    );
    expect(groups).toHaveLength(3);
    expect(
      groups.find((g) => g.classification === "MIXED_OR_UNKNOWN")!.netLot,
    ).toBe(-15);
  });
});
describe("price-volume and alerts", () => {
  it("requires prior baseline and avoids division by zero", () => {
    expect(priceVolume(candles(10))!.sufficient).toBe(false);
    const zero = candles().map((c) => ({ ...c, volume: 0 }));
    expect(priceVolume(zero)!.relativeVolume).toBeNull();
    expect(priceVolume(zero)!.volumeZScore).toBeNull();
    expect(volumeAlerts("TEST", zero)).toEqual([]);
  });
  it.each([
    [true, true, "Rising price with above"],
    [true, false, "Rising price with weak"],
    [false, true, "Falling price with elevated"],
    [false, false, "Falling price with lower"],
  ])("handles direction %s / participation %s", (up, high, text) => {
    const c = candles();
    const prev = c.at(-2)!;
    c[c.length - 1] = {
      ...c.at(-1)!,
      close: prev.close + (up ? 1 : -1),
      low: prev.close - 3,
      high: prev.close + 3,
      volume: high ? 500 : 30,
    };
    expect(priceVolume(c)!.explanation).toContain(text);
  });
  it("computes z-score against previous bars and not the current spike", () => {
    const c = candles(21);
    c[20].volume = 1000;
    const pv = priceVolume(c)!;
    expect(pv.averageVolume).toBe(119);
    expect(pv.relativeVolume).toBeCloseTo(1000 / 119);
    expect(pv.volumeZScore).toBeGreaterThan(40);
    expect(volumeAlerts("TEST", c)[0].severity).toBe("CRITICAL");
  });
  it("never invents aggressor side and suppresses zero variance and price anomalies", () => {
    const c = candles();
    c.at(-1)!.volume = 2000;
    expect(
      volumeAlerts("TEST", c).every(
        (a) =>
          !a.type.includes("BUY_VOLUME") && !a.type.includes("SELL_VOLUME"),
      ),
    ).toBe(true);
    expect(
      volumeAlerts(
        "TEST",
        c.map((v, i) => ({ ...v, volume: i === 29 ? 2000 : 100 })),
      ),
    ).toEqual([]);
    c.at(-1)!.close = 1000;
    c.at(-1)!.high = 1001;
    expect(priceVolume(c)!.anomaly).toBe(true);
    expect(
      volumeAlerts("TEST", c).filter((a) => a.timestamp === c.at(-1)!.time),
    ).toEqual([]);
  });
  it("is prefix invariant", () => {
    const c = candles(60);
    expect(priceVolume(c, 25)).toEqual(priceVolume(c.slice(0, 26)));
    const full = volumeAlerts("TEST", c).filter(
      (a) => a.timestamp <= c[25].time,
    );
    expect(full).toEqual(volumeAlerts("TEST", c.slice(0, 26)));
  });
  it("uses adaptive broker baselines, supports buys/sells and deduplicates", () => {
    const rows = Array.from({ length: 22 }, (_, i) => ({
      ticker: "TEST",
      brokerCode: "AK",
      date: new Date(Date.UTC(2026, 7, i + 1)).toISOString().slice(0, 10),
      buyLot: i === 20 ? 2000 : 100 + (i % 3) * 10,
      sellLot: i === 21 ? 3000 : 90 + (i % 2) * 50,
    }));
    const alerts = brokerAlerts("TEST", rows);
    expect(alerts.map((a) => a.type)).toContain("INSTITUTIONAL_BLOCK_FLOW");
    expect(alerts.map((a) => a.type)).toContain("UNUSUAL_NET_SELL");
    expect(brokerAlerts("TEST", [...rows, ...rows])).toEqual(alerts);
    expect(brokerAlerts("TEST", rows.slice(0, 20))).toEqual([]);
    expect(alerts[0].warnings.join(" ")).toContain("Daily aggregate");
  });
  it("does not use zero variance, unknown brokers or another ticker as institutional evidence", () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      ticker: "TEST",
      brokerCode: "AK",
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      buyLot: i === 20 ? 2000 : 100,
      sellLot: 0,
    }));
    expect(brokerAlerts("TEST", rows)).toEqual([]);
    expect(brokerAlerts("ELSE", rows)).toEqual([]);
    expect(
      brokerAlerts(
        "TEST",
        rows.map((r) => ({ ...r, brokerCode: "XX" })),
      ),
    ).toEqual([]);
  });
  it("disables granular pattern detection without second-level verified fields", () => {
    expect(TRANSACTION_CAPABILITY.enabled).toBe(false);
    expect(TRANSACTION_CAPABILITY.missing).toContain("verified aggressor side");
    expect(TRANSACTION_CAPABILITY.missing).toContain(
      "second-level transaction timestamp",
    );
  });
});
describe("cycles and confirmation", () => {
  const region = (phase: PhaseRegion["phase"], i: number): PhaseRegion => ({
    id: String(i),
    ticker: "TEST",
    phase,
    startTimestamp: 100 + i * 10,
    endTimestamp: 109 + i * 10,
    startPrice: 100,
    endPrice: 110,
    lowPrice: 99,
    highPrice: 111,
    confidence: 70,
    evidence: [],
    warnings: [],
    status: "CALCULATED",
  });
  it("recognizes a complete observed sequence only when a later accumulation closes it", () => {
    const c = detectCycles(
      "TEST",
      [
        "ACCUMULATION",
        "MARKUP",
        "DISTRIBUTION",
        "MARKDOWN",
        "ACCUMULATION",
      ].map((p, i) => region(p as PhaseRegion["phase"], i)),
    );
    expect(c.map((v) => v.status)).toEqual(["COMPLETE", "ACTIVE"]);
    expect(c[0].endTimestamp! < c[1].startTimestamp).toBe(true);
  });
  it("keeps missing phases incomplete instead of synthesizing rectangles", () => {
    const c = detectCycles("TEST", [
      region("MARKUP", 0),
      region("MARKDOWN", 1),
      region("ACCUMULATION", 2),
    ]);
    expect(c[0].status).toBe("INCOMPLETE");
    expect(c[0].phases).toHaveLength(2);
  });
  it("does not backpaint transition candidates and maintains confirmation start across prefixes", () => {
    const c = candles(60);
    const early = detectPhaseRegions("TEST", "1D", c.slice(0, 22));
    expect(early).toEqual([]);
    const confirmed = detectPhaseRegions("TEST", "1D", c.slice(0, 23));
    expect(confirmed[0].startTimestamp).toBe(c[22].time);
    expect(detectPhaseRegions("TEST", "1D", c)[0].startTimestamp).toBe(
      confirmed[0].startTimestamp,
    );
  });
  it("handles no price or broker coverage honestly", () => {
    const result = analyze("TEST", null, {
      ticker: "TEST",
      start: "",
      end: "",
      fetchedAt: "2026-08-01",
      flows: [],
      unavailableReason: "Unavailable",
    });
    expect(result.phase).toBe("UNCLASSIFIED");
    expect(result.priceVolume).toBeNull();
    expect(result.inventory).toEqual([]);
    expect(result.alerts).toEqual([]);
  });
});

it("replay excludes all broker records and alerts after the revealed candle", () => {
  const prefix = candles(20);
  const broker = {
    ticker: "TEST",
    start: "2026-08-01",
    end: "2026-09-01",
    fetchedAt: "2026-09-02",
    unavailableReason: null,
    flows: Array.from({ length: 30 }, (_, i) => ({
      ticker: "TEST",
      brokerCode: "AK",
      date: new Date(Date.UTC(2026, 7, i + 1)).toISOString().slice(0, 10),
      buyLot: i > 20 ? 10000 : 100 + (i % 3) * 10,
      sellLot: 0,
    })),
  };
  const result = analyze(
    "TEST",
    {
      ticker: "TEST",
      timeframe: "1D",
      limit: 20,
      symbol: "IDX:TEST",
      source: "TRADINGVIEW",
      delay: "UNKNOWN",
      fetchedAt: "2026-09-02",
      candles: prefix,
    },
    broker,
  );
  expect(result.broker.flows.every((f) => f.date <= "2026-08-20")).toBe(true);
  expect(result.alerts).toEqual([]);
});
