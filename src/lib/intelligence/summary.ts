import type { Intelligence } from "@/domain/intelligence";
export function analysisSummary(a: Intelligence) {
  return {
    ticker: a.ticker,
    phase: a.phase,
    confidence: a.confidence,
    calculatedAt: a.calculatedAt,
    priceVolume: a.priceVolume,
    groups: a.groups,
    brokerAvailable: a.inventory.length > 0,
    remaining: a.inventory.reduce(
      (n, r) => n + r.estimatedRemainingInventory,
      0,
    ),
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
