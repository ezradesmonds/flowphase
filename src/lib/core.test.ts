import { describe, expect, it } from "vitest";
import { demoStocks } from "@/data/demo";
import { PHASES, type BrokerFlow } from "@/domain/market";
import { candleSchema, scannerSchema } from "@/domain/schemas";
import { estimateInventory } from "./ledger";
import { defaultFilters, filterScanner } from "./scanner";
import { parseWatchlist } from "./watchlist";
import { demoRepository } from "./repositories/demo-repository";
const rows = demoStocks.map((s) => s.scanner);
describe("demo contracts", () => {
  it("covers all six phases with validated scanner data", () => {
    expect(new Set(rows.map((r) => r.currentPhase))).toEqual(new Set(PHASES.filter(p => !["TRANSITION","INSUFFICIENT_DATA"].includes(p))));
    rows.forEach((r) => expect(scannerSchema.safeParse(r).success).toBe(true));
  });
  it("has valid ordered unique candles and balanced broker counterparties", () => {
    for (const stock of demoStocks) {
      expect(new Set(stock.candles.map((c) => c.date)).size).toBe(
        stock.candles.length,
      );
      expect(stock.candles.map((c) => c.date)).toEqual(
        stock.candles.map((c) => c.date).sort(),
      );
      for (const candle of stock.candles) {
        expect(candleSchema.safeParse(candle).success).toBe(true);
        expect(
          stock.flows
            .filter((f) => f.date === candle.date)
            .reduce((s, f) => s + f.buyLot - f.sellLot, 0),
        ).toBe(0);
      }
    }
  });
  it("retains missing values instead of manufacturing coverage", () => {
    const missing = rows.find((r) => r.currentPhase === "UNCERTAIN")!;
    expect(missing.relativeVolume).toBeNull();
    expect(missing.remainingInventoryRatio).toBeNull();
  });
  it("rejects out-of-range scores and invalid candles", () => {
    expect(
      scannerSchema.safeParse({ ...rows[0], confidence: 101 }).success,
    ).toBe(false);
    expect(
      candleSchema.safeParse({ ...demoStocks[0].candles[0], high: 1 }).success,
    ).toBe(false);
  });
  it("repository isolates returned values and handles missing tickers", async () => {
    const stock = await demoRepository.getStock("bbca");
    expect(stock?.scanner.ticker).toBe("BBCA");
    stock!.scanner.companyName = "changed";
    expect(
      (await demoRepository.getStock("BBCA"))!.scanner.companyName,
    ).not.toBe("changed");
    expect(await demoRepository.getStock("XXXX")).toBeNull();
  });
});
describe("scanner", () => {
  it("combines case-insensitive company search with phase and confidence", () => {
    const result = filterScanner(rows, {
      ...defaultFilters,
      query: " BANK ",
      phase: "AKUMULASI",
      minimumConfidence: 80,
    });
    expect(result.map((r) => r.ticker)).toEqual(["BBCA"]);
  });
  it("sorts both directions without mutating its input", () => {
    const before = rows.map((r) => r.ticker);
    const sorted = filterScanner(rows, {
      ...defaultFilters,
      sort: "ticker",
      direction: "asc",
    });
    expect(sorted.map((r) => r.ticker)).toEqual([...before].sort());
    expect(rows.map((r) => r.ticker)).toEqual(before);
    expect(
      filterScanner(rows, {
        ...defaultFilters,
        sort: "ticker",
        direction: "desc",
      }).map((r) => r.ticker),
    ).toEqual([...before].sort().reverse());
  });
  it("keeps unavailable metrics last in either direction", () => {
    for (const direction of ["asc", "desc"] as const)
      expect(
        filterScanner(rows, {
          ...defaultFilters,
          sort: "relativeVolume",
          direction,
        }).at(-1)!.relativeVolume,
      ).toBeNull();
  });
  it("returns an empty result for unmatched filters", () => {
    expect(
      filterScanner(rows, { ...defaultFilters, minimumConfidence: 100 }),
    ).toEqual([]);
  });
});
describe("estimated inventory", () => {
  const flows: BrokerFlow[] = [
    {
      ticker: "BBCA",
      brokerCode: "D1",
      date: "2026-01-01",
      buyLot: 100,
      sellLot: 0,
    },
    {
      ticker: "BBCA",
      brokerCode: "D1",
      date: "2026-01-02",
      buyLot: 0,
      sellLot: 40,
    },
    {
      ticker: "BBCA",
      brokerCode: "D1",
      date: "2026-01-03",
      buyLot: 0,
      sellLot: 100,
    },
  ];
  it("computes signed net flow, positive peak and remaining ratio", () => {
    const r = estimateInventory(
      flows,
      "BBCA",
      "D1",
      "2026-01-01",
      "2026-01-02",
    );
    expect(r.cumulativeNetLot).toBe(60);
    expect(r.observedPeakNetLot).toBe(100);
    expect(r.peakEstimatedInventory).toBeNull();
    expect(r.estimatedRemainingInventory).toBeNull();
    expect(r.remainingRatio).toBeNull();
  });
  it("clamps displayed inventory while retaining negative signed flow", () => {
    const r = estimateInventory(
      flows,
      "BBCA",
      "D1",
      "2026-01-01",
      "2026-01-03",
    );
    expect(r.cumulativeNetLot).toBe(-40);
    expect(r.estimatedRemainingInventory).toBeNull();
    expect(r.remainingRatio).toBeNull();
  });
  it("resets at period boundaries and uses no future data", () => {
    const r = estimateInventory(
      flows,
      "BBCA",
      "D1",
      "2026-01-02",
      "2026-01-02",
    );
    expect(r.cumulativeNetLot).toBe(-40);
    expect(r.remainingRatio).toBeNull();
    expect(
      estimateInventory(
        [...flows, { ...flows[0], date: "2027-01-01", buyLot: 9999 }],
        "BBCA",
        "D1",
        "2026-01-01",
        "2026-01-02",
      ).cumulativeNetLot,
    ).toBe(60);
  });
  it("handles missing broker history", () => {
    expect(
      estimateInventory([], "BBCA", "D1", "2026-01-01", "2026-01-02")
        .remainingRatio,
    ).toBeNull();
  });
});
describe("local watchlist", () => {
  it("starts empty and removes duplicates and unknown tickers", () => {
    expect(parseWatchlist(null, ["BBCA"])).toEqual([]);
    expect(parseWatchlist('["BBCA","XXXX","BBCA"]', ["BBCA"])).toEqual([
      "BBCA",
    ]);
  });
  it("rejects malformed storage so the UI can report it safely", () => {
    expect(() => parseWatchlist("broken", [])).toThrow();
    expect(() => parseWatchlist('{"ticker":"BBCA"}', [])).toThrow();
  });
});
