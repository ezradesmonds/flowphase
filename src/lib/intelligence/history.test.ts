import { expect, it } from "vitest";
import { mergeBrokerHistory } from "./history";
it("retains acquired history and first availability without backdating revisions", () => {
  const old = {
    ticker: "TEST",
    date: "2026-01-01",
    brokerCode: "AI",
    buyLot: 100,
    sellLot: 0,
    availableAt: "2026-01-02",
  };
  const unchanged = { ...old, availableAt: "2026-02-01" };
  expect(mergeBrokerHistory([old], [unchanged])[0].availableAt).toBe(
    old.availableAt,
  );
  expect(
    mergeBrokerHistory([old], [{ ...unchanged, buyLot: 120 }])[0].availableAt,
  ).toBe(unchanged.availableAt);
  expect(
    mergeBrokerHistory([old], [{ ...unchanged, date: "2026-02-01" }]),
  ).toHaveLength(2);
});
