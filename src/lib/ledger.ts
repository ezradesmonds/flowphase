import type { BrokerFlow, BrokerInventoryEstimate } from "@/domain/market";
/** Signed transaction flow is preserved; estimated displayed inventory is clamped. */
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
    peakEstimatedInventory: peak,
    estimatedRemainingInventory: Math.max(0, net),
    remainingRatio: peak > 0 ? Math.max(0, net) / peak : null,
    role: net > 0 ? "ACCUMULATOR" : net < 0 ? "DISTRIBUTOR" : "NEUTRAL",
  };
}
