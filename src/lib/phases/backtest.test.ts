import { expect, it } from "vitest";
import { backtestPhases } from "./backtest";
import { calculateInventory } from "@/lib/intelligence/inventory";
const candles = Array.from({ length: 45 }, (_, i) => ({
  time: 1700000000 + i * 86400,
  open: 100 + i,
  high: 102 + i,
  low: 99 + i,
  close: 101 + i,
  volume: 100 + (i % 5),
}));
it("walk-forward decisions are independent of later outcomes and unpublished flows", () => {
  const rows = [
    {
      ticker: "TEST",
      brokerCode: "AI",
      date: "2023-11-20",
      buyLot: 100000,
      sellLot: 0,
      availableAt: "2099-01-01",
    },
  ];
  const full = backtestPhases("TEST", candles, rows);
  const prefix = backtestPhases("TEST", candles.slice(0, 35), rows);
  for (let mode = 0; mode < 2; mode++) {
    expect(prefix[mode].decisions.map((d) => d.phase)).toEqual(
      full[mode].decisions.slice(0, 15).map((d) => d.phase),
    );
    expect(
      full[mode].decisions.slice(-5).every((d) => d.forwardReturn === null),
    ).toBe(true);
    expect(full[mode].transitionAccuracy).toBeNull();
    expect(full[mode].falsePositiveRate).toBeNull();
  }
  expect(full[0].decisions).toEqual(full[1].decisions);
});
it("uses moving weighted average instead of FIFO and never invents opening holdings", () => {
  const flows = [
    {
      ticker: "TEST",
      brokerCode: "AI",
      date: "2026-01-01",
      buyLot: 10,
      sellLot: 15,
      buyValue: 200000,
    },
    {
      ticker: "TEST",
      brokerCode: "AI",
      date: "2026-01-02",
      buyLot: 10,
      sellLot: 0,
      buyValue: 300000,
    },
  ];
  const unknown = calculateInventory(
    flows,
    "TEST",
    "2026-01-01",
    "2026-01-02",
  )[0];
  expect(unknown.estimatedRemainingInventory).toBeNull();
  expect(unknown.movingAverageCost).toBeNull();
  expect(unknown.cumulativeNetLot).toBe(5);
  const known = calculateInventory(
    flows,
    "TEST",
    "2026-01-01",
    "2026-01-02",
    null,
    undefined,
    {
      AI: {
        lots: 10,
        averageCost: 100,
        source: "test opening estimate",
        asOf: "2026-01-01",
      },
    },
  )[0];
  expect(known.estimatedRemainingInventory).toBe(15);
  expect(known.movingAverageCost).toBe(250);
  expect(known.costBasisMethod).toBe("MOVING_WEIGHTED_AVERAGE");
});
