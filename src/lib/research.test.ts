import { expect, it } from "vitest";
import { compareFreeFloat, summarizeBrokerFlow } from "./research";
import type { IdxStock } from "@/domain/securities";
const stock = (
  ticker: string,
  value: number | null,
  subsector = "Banks",
): IdxStock => ({
  ticker,
  companyName: ticker,
  sector: "Finance",
  subsector,
  freeFloat: value,
  source: "SECTORS",
});
it("excludes self, missing data and unrelated peers from the median", () => {
  const selected = stock("AAAA", 0.4);
  expect(
    compareFreeFloat(selected, [
      selected,
      stock("BBBB", 0.1),
      stock("CCCC", 0.3),
      stock("DDDD", null),
      stock("EEEE", 0.9, "Other"),
    ]),
  ).toEqual({ peerCount: 2, median: 0.2, differencePoints: 20 });
  expect(compareFreeFloat(selected, [selected])).toBeNull();
  expect(
    compareFreeFloat(stock("AAAA", null), [stock("BBBB", 0.1)]),
  ).toBeNull();
});
it("uses gross buy concentration and preserves unknown values", () => {
  const flows = [
    {
      ticker: "AAAA",
      date: "2026-09-01",
      brokerCode: "AA",
      buyLot: 60,
      sellLot: 0,
      buyValue: 600,
      sellValue: 0,
    },
    {
      ticker: "AAAA",
      date: "2026-09-02",
      brokerCode: "AA",
      buyLot: 10,
      sellLot: 0,
    },
    {
      ticker: "AAAA",
      date: "2026-09-01",
      brokerCode: "BB",
      buyLot: 20,
      sellLot: 50,
    },
    {
      ticker: "AAAA",
      date: "2026-09-01",
      brokerCode: "CC",
      buyLot: 5,
      sellLot: 20,
    },
    {
      ticker: "AAAA",
      date: "2026-09-01",
      brokerCode: "DD",
      buyLot: 5,
      sellLot: 30,
    },
  ];
  const result = summarizeBrokerFlow(flows);
  expect(result).toMatchObject({
    days: 2,
    netBuyers: 1,
    netSellers: 3,
    top3BuyShare: 0.95,
  });
  expect(result.brokers[0]).toMatchObject({
    brokerCode: "AA",
    netLot: 70,
    netValue: null,
  });
  expect(summarizeBrokerFlow([]).top3BuyShare).toBeNull();
});
