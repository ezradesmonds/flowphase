import { describe, it, expect } from "vitest";
import {
  executionLedger,
  metric,
  ownershipPercent,
  ownershipPaths,
  activeRelation,
  positionSize,
  type Relation,
  type Meta,
} from "./model";
import { inventoryByPhase, brokerIdentity } from "./inventory";
import { normalizeOwnership } from "./ownership";
import { marketActivity } from "./market";
import { analyze } from "../analyze";
const meta: Meta = {
  source: ["test"],
  as_of: null,
  period_start: null,
  period_end: null,
  calculation_method: "test",
  data_status: "DERIVED",
  confidence: 50,
  quality_flags: [],
};
describe("extended intelligence foundations", () => {
  it("preserves null vs zero", () => {
    expect(metric(null, meta, "x").data_status).toBe("UNAVAILABLE");
    expect(metric(0, meta, "x").value).toBe(0);
  });
  it("weighted average, partial sell, estimated PnL and unknown opening", () => {
    const result = executionLedger(
      { lots: 10, cost: 100 },
      [
        { timestamp: 1, sequence: 1, side: "BUY", lots: 10, price: 200 },
        { timestamp: 2, sequence: 1, side: "SELL", lots: 5, price: 180 },
      ],
      200,
    );
    expect(result).toMatchObject({
      remaining: 15,
      cost: 150,
      realized: 15000,
      unrealized: 75000,
    });
    expect(executionLedger(null, [], 200).realized).toBeNull();
    expect(() =>
      executionLedger(
        { lots: 0, cost: 0 },
        [{ timestamp: 1, sequence: 1, side: "SELL", lots: 1, price: 100 }],
        100,
      ),
    ).toThrow();
  });
  it("rejects ambiguous execution order", () =>
    expect(() =>
      executionLedger(
        { lots: 1, cost: 1 },
        [
          { timestamp: 1, sequence: 1, side: "BUY", lots: 1, price: 2 },
          { timestamp: 1, sequence: 1, side: "SELL", lots: 1, price: 2 },
        ],
        2,
      ),
    ).toThrow());
  it("preserves observed ledger between nonoverlapping phases and flags negative net", () => {
    const flows = [
      {
        ticker: "TEST",
        brokerCode: "AI",
        date: "2026-01-01",
        buyLot: 10,
        sellLot: 0,
        buyValue: 100000,
        sellValue: 0,
        buyFrequency: 2,
        sellFrequency: 0,
      },
      {
        ticker: "TEST",
        brokerCode: "AI",
        date: "2026-01-02",
        buyLot: 0,
        sellLot: 15,
        buyValue: 0,
        sellValue: 180000,
      },
    ];
    const a = analyze("TEST", null, {
      ticker: "TEST",
      start: "2026-01-01",
      end: "2026-01-02",
      fetchedAt: "2026-01-03",
      flows: flows.map((f) => ({ ...f, availableAt: "2026-01-03" })),
      unavailableReason: null,
    });
    const one = inventoryByPhase(a, "2026-01-01", "2026-01-01")[0],
      two = inventoryByPhase(a, "2026-01-02", "2026-01-02")[0];
    expect(one.metrics.netLot.value).toBe(10);
    expect(one.metrics.netValue.value).toBe(100000);
    expect(one.metrics.averageLot.value).toBe(5);
    expect(two.metrics.observedOpening.value).toBe(
      one.metrics.observedClosing.value,
    );
    expect(two.metrics.observedClosing.value).toBe(-5);
    expect(two.metrics.totalFrequency.value).toBeNull();
    expect(two.metrics.estimatedRemaining.value).toBeNull();
    expect(two.metrics.realizedPnl.value).toBeNull();
    expect(two.meta.quality_flags).toContain(
      "NEGATIVE_OBSERVED_NET_UNSEEN_OPENING",
    );
  });
  it("penalizes same-day crossing without marking separate-day round trips as crossing", () => {
    const make = (flows: Parameters<typeof analyze>[2]["flows"]) =>
      inventoryByPhase(
        analyze("TEST", null, {
          ticker: "TEST",
          start: "2026-01-01",
          end: "2026-01-02",
          fetchedAt: "2026-01-03",
          flows: flows.map((f) => ({ ...f, availableAt: "2026-01-03" })),
          unavailableReason: null,
        }),
      )[0];
    expect(
      make([
        {
          ticker: "TEST",
          brokerCode: "AI",
          date: "2026-01-01",
          buyLot: 100,
          sellLot: 100,
        },
      ]).metrics.crossingRisk.value,
    ).toBe(1);
    expect(
      make([
        {
          ticker: "TEST",
          brokerCode: "AI",
          date: "2026-01-01",
          buyLot: 100,
          sellLot: 0,
        },
        {
          ticker: "TEST",
          brokerCode: "AI",
          date: "2026-01-02",
          buyLot: 0,
          sellLot: 100,
        },
      ]).metrics.crossingRisk.value,
    ).toBe(0);
  });
  it("keeps broker identity separate from user behavior hypothesis", () => {
    const a = brokerIdentity("AI", "2026-01-01", "TEST");
    expect(a.ownershipType).toBe("UNKNOWN");
    expect(a.behaviorProxy).toBe("INSTITUTIONAL_PROXY");
    expect(marketActivity([], []).sectors).toEqual([]);
  });
  it("does not infer ownership denominator or link equal names", () => {
    const r = normalizeOwnership(
      "TEST",
      {
        symbol: "TEST",
        data: [
          {
            date: "2026-01-31",
            shares_number: 100,
            numbers_of_shareholders: 0,
          },
        ],
      },
      {
        symbol: "TEST",
        ownership: {
          major_shareholders: [
            { name: "Same", share_amount: 10, share_percentage: "10%" },
            { name: "Same", share_amount: 20 },
          ],
        },
      },
      "2026-02-01",
    );
    expect(r.shareholders[0].percentage.value).toBe(10);
    expect(r.shareholders[1].percentage.value).toBeNull();
    expect(r.nodes[1].id).not.toBe(r.nodes[2].id);
    expect(r.history[0].shareholders.value).toBe(0);
    expect(r.relations[0].effective_from).toBeNull();
    expect(ownershipPercent(20, 100)).toBe(20);
    expect(ownershipPercent(20, null)).toBeNull();
  });
  it("traverses verified direct/indirect historical relationships only", () => {
    const edge = (from: string, to: string, pct: number): Relation => ({
      id: from + to,
      from,
      to,
      type: "OWNS",
      category: "LEGAL OWNERSHIP",
      source: "official disclosure",
      effective_from: "2020-01-01",
      effective_to: "2025-12-31",
      ownership_percentage: pct,
      confidence: 90,
      verification_status: "VERIFIED",
      last_updated_at: "2025-01-01",
    });
    const rows = [edge("A", "B", 50), edge("B", "C", 40)];
    expect(ownershipPaths(rows, "A", "C", "2025-01-01")[0].percentage).toBe(20);
    expect(activeRelation(rows[0], "2026-01-01")).toBe(false);
    expect(ownershipPaths(rows, "A", "C", "2026-01-01")).toEqual([]);
  });
  it("validates position sizing and unavailable exit liquidity", () => {
    expect(positionSize(100000, 1000, 900, null)).toMatchObject({
      positionLot: 10,
      requiredVisibleExitCapacity: 30,
      exitCoverageRatio: null,
    });
    expect(() => positionSize(100, 100, 100, null)).toThrow();
  });
});

it("normalizes verified fractional percentage strings without treating public buckets as owners", () => {
  const data = normalizeOwnership(
    "TEST",
    null,
    {
      symbol: "TEST",
      ownership: {
        major_shareholders: [
          { name: "Legal company", share_amount: 55, share_percentage: "0.55" },
          { name: "Public", share_amount: 45, share_percentage: "0.45" },
        ],
      },
    },
    "2026-01-01",
  );
  expect(data.shareholders[0].percentage.value).toBeCloseTo(55);
  expect(data.relations).toHaveLength(1);
  expect(data.nodes).toHaveLength(2);
});
it("does not derive foreign investor flow from foreign-affiliated brokers", () => {
  const identity = brokerIdentity("AI", "2026-01-01", "TEST", [
    {
      broker_code: "AI",
      broker_name: "Test legal identity",
      ownership_type: "FOREIGN_AFFILIATED",
      parent_company: "Test",
      country: "Test",
      effective_from: "2020-01-01",
      effective_to: null,
      source: "test official fixture",
      last_verified_at: "2026-01-01",
    },
  ]);
  expect(identity.ownershipType).toBe("FOREIGN_AFFILIATED");
  expect(identity).not.toHaveProperty("foreignFlow");
});

it("sector aggregation aligns sessions and uses explicit subset coverage", () => {
  const build = (symbol: string, sector: string, close: number) => {
    const a = analyze(
      symbol,
      {
        ticker: symbol,
        timeframe: "1D",
        source: "TRADINGVIEW",
        fetchedAt: "2026-01-10",
        candles: Array.from({ length: 25 }, (_, i) => ({
          time: 1767225600 + i * 86400,
          open: 100,
          high: Math.max(102, close),
          low: 99,
          close: i === 24 ? close : 100,
          volume: i === 24 ? 200 : 100,
        })),
        symbol: "IDX:" + symbol,
        delay: "UNKNOWN",
        limit: 25,
      },
      {
        ticker: symbol,
        start: "2026-01-01",
        end: "2026-01-25",
        fetchedAt: "2026-01-26",
        flows: [],
        unavailableReason: null,
      },
    );
    return {
      a,
      stock: {
        ticker: symbol,
        companyName: symbol,
        sector,
        subsector: null,
        freeFloat: null,
        source: "SECTORS" as const,
      },
    };
  };
  const a = build("AAAA", "One", 110),
    b = build("BBBB", "Two", 100);
  const result = marketActivity([a.a, b.a], [a.stock, b.stock]);
  expect(result.coverage).toBe(1);
  expect(result.sectors[0].quadrant).toBe("Leading");
  expect(result.sectors[0].metrics.foreignFlow.value).toBeNull();
  expect(result.summary.advancers.value).toBe(1);
  const intraday = marketActivity(
    [a.a, b.a],
    [a.stock, b.stock],
    {},
    "2026-01-25T03:00:00Z",
  );
  expect(intraday.meta.period_end).toBe("2026-01-24");
  expect(intraday.summary.volume.value).toBe(200);
  expect(intraday.summary.advancers.value).toBe(0);
  const foreign = marketActivity(
    [a.a, b.a],
    [a.stock, b.stock],
    {
      AAAA: [{ date: "2026-01-25", net: 0, asOf: "2026-01-26" }],
      BBBB: [{ date: "2026-01-25", net: 100, asOf: "2026-01-26" }],
    },
    "2026-01-26T03:00:00Z",
  );
  expect(foreign.sectors[0].metrics.foreignFlow.value).toBe(0);
  expect(foreign.summary.foreignNetFlow.value).toBe(100);
});
