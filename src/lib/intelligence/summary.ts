import type { Intelligence } from "@/domain/intelligence";
export function analysisSummary(a: Intelligence) {
  return {
    ticker: a.ticker,
    phase: a.phase,
    confidence: a.confidence,
    coverage: a.coverage,
    state: a.state,
    marketCondition: a.marketCondition,
    label: a.regions.at(-1)?.label ?? "INSUFFICIENT DATA",
    phaseStart: a.regions.at(-1)?.startTimestamp ?? null,
    phaseDuration: a.regions.length
      ? (a.candles?.candles.filter(
          (c) => c.time >= a.regions.at(-1)!.startTimestamp,
        ).length ?? 0)
      : 0,
    priceReturn: a.regions.length
      ? a.regions.at(-1)!.endPrice / a.regions.at(-1)!.startPrice - 1
      : null,
    topNetBuyer:
      a.inventory.find((r) => r.cumulativeNetLot > 0)?.brokerCode ?? null,
    topNetSeller:
      [...a.inventory].reverse().find((r) => r.cumulativeNetLot < 0)
        ?.brokerCode ?? null,
    observedInventoryChange: a.inventory.length
      ? (a.groups.find((g) => g.classification === "INSTITUTIONAL_ASSOCIATED")
          ?.netLot ?? null)
      : null,
    crossingRisk: a.inventory.length
      ? Math.max(...a.inventory.map((r) => r.crossingRisk))
      : null,
    calculatedAt: a.calculatedAt,
    priceVolume: a.priceVolume,
    groups: a.groups,
    brokerAvailable: a.inventory.length > 0,
    remaining:
      !a.inventory.length ||
      a.inventory.some((r) => r.estimatedRemainingInventory === null)
        ? null
        : a.inventory.reduce((n, r) => n + r.estimatedRemainingInventory!, 0),
    regions: a.regions
      .slice(-2)
      .map((r) => ({ phase: r.phase, startTimestamp: r.startTimestamp })),
    alerts: a.alerts
      .filter((a) => a.status === "NEW")
      .map((a) => ({
        type: a.type,
        status: a.status,
        severity: a.severity,
        timestamp: a.timestamp,
      })),
  };
}
export type AnalysisSummary = ReturnType<typeof analysisSummary>;
