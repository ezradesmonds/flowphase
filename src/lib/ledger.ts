import type { BrokerFlow, BrokerInventoryEstimate } from "@/domain/market";
/** Unknown opening holdings never become absolute inventory. */
export function estimateInventory(
  flows: BrokerFlow[],
  ticker: string,
  brokerCode: string,
  start: string,
  end: string,
): BrokerInventoryEstimate {
  const rows = flows
    .filter(
      (f) =>
        f.ticker === ticker &&
        f.brokerCode === brokerCode &&
        f.date >= start &&
        f.date <= end,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  let net = 0;
  let peak = 0;
  for (const row of rows) {
    net += row.buyLot - row.sellLot;
    peak = Math.max(peak, net);
  }
  return {
    ticker,
    brokerCode,
    periodStart: start,
    periodEnd: end,
    cumulativeNetLot: net,
    peakEstimatedInventory: null,
    estimatedRemainingInventory: null,
    observedPeakNetLot: peak,
    remainingRatio: null,
    role: net > 0 ? "ACCUMULATOR" : net < 0 ? "DISTRIBUTOR" : "NEUTRAL",
  };
}
