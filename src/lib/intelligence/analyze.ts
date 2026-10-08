import type { CandleSnapshot } from "@/domain/chart-market";
import type { BrokerSnapshot } from "@/domain/securities";
import type { BrokerProfile, Intelligence } from "@/domain/intelligence";
import { detectPhaseRegions } from "@/lib/phases/detect";
import { ALGORITHM_VERSION, PHASE_CONFIG } from "@/config/phases";
import { sessionDate } from "@/lib/phases/features";
import { detectCycles } from "./cycles";
import { calculateInventory, aggregateGroups } from "./inventory";
import { priceVolume } from "./price-volume";
import {
  brokerAlerts,
  volumeAlerts,
  phaseAlerts,
  featureAlerts,
} from "./alerts";
export { sessionDate } from "@/lib/phases/features";
export function reanalyze(
  previous: Intelligence,
  snapshot: CandleSnapshot,
  now: string,
): Intelligence {
  return analyze(
    previous.ticker,
    snapshot,
    previous.broker,
    now,
    previous.inventory.some((row) => row.profile.source === "VERIFIED_METADATA")
      ? previous.inventory.map((row) => row.profile)
      : undefined,
  );
}
export function analyze(
  ticker: string,
  snapshot: CandleSnapshot | null,
  broker: BrokerSnapshot,
  now = new Date().toISOString(),
  registry?: readonly BrokerProfile[],
): Intelligence {
  const candles = snapshot?.candles ?? [],
    last = candles.at(-1);
  const cutoff = last ? sessionDate(last.time) : broker.end;
  broker = {
    ...broker,
    flows: broker.flows.filter(
      (f) =>
        f.date <= cutoff &&
        !!f.availableAt &&
        Date.parse(f.availableAt) <= Date.parse(now),
    ),
    end: broker.end < cutoff ? broker.end : cutoff,
  };
  const regions = detectPhaseRegions(
    ticker,
    snapshot?.timeframe ?? "1D",
    candles,
    { flows: broker.flows, registry, strictAvailability: true, asOf: now },
  );
  const stale = last
    ? Math.max(
        0,
        (Date.parse(now) - last.time * 1000) / 86400000 -
          PHASE_CONFIG.staleAfterDays,
      )
    : Infinity;
  for (const r of regions) {
    if (r.active && stale > 0) {
      const factor = 1 / (1 + stale / 7);
      r.confidence = Math.round(r.confidence * factor);
      r.dataQualityFactor *= factor;
      r.warnings.push("Stale source data reduces confidence.");
    }
  }
  const cycles = detectCycles(ticker, regions);
  for (const cycle of cycles)
    if (cycle.phases.every((r) => r.brokerEvidence === "BROKER_SUPPORTED"))
      cycle.evidenceStatus = "BROKER_SUPPORTED";
  const finalRegions = cycles.flatMap((c) => c.phases),
    latest = finalRegions.at(-1);
  const inventory = calculateInventory(
    broker.flows,
    ticker,
    broker.start,
    broker.end,
    last?.close ?? null,
    registry,
  );
  const state = latest?.phase ?? "INSUFFICIENT_DATA";
  const marketCondition = latest?.marketCondition ?? "NONE";
  const alerts = [
    ...volumeAlerts(ticker, candles),
    ...brokerAlerts(ticker, broker.flows, registry),
    ...phaseAlerts(ticker, finalRegions),
    ...featureAlerts(ticker, candles, {
      flows: broker.flows,
      registry,
      strictAvailability: true,
      asOf: now,
    }),
  ]
    .filter((a) => a.timestamp * 1000 <= Date.parse(now))
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((a) => {
      const date = sessionDate(a.timestamp),
        region = finalRegions.find(
          (r) =>
            sessionDate(r.startTimestamp) <= date &&
            sessionDate(r.endTimestamp) >= date,
        );
      return {
        ...a,
        phase: region?.phase ?? ("INSUFFICIENT_DATA" as const),
        status:
          date < (last ? sessionDate(last.time) : broker.end)
            ? ("EXPIRED" as const)
            : ("NEW" as const),
      };
    });
  return {
    version: 2,
    algorithmVersion: ALGORITHM_VERSION,
    configVersion: PHASE_CONFIG.version,
    ticker,
    calculatedAt: now,
    candles: snapshot,
    broker,
    regions: finalRegions,
    cycles,
    state,
    phase:
      marketCondition === "POST_DISTRIBUTION_MARKDOWN" ? "TRANSITION" : state,
    marketCondition,
    confidence: latest?.confidence ?? 0,
    coverage: latest?.coverage ?? 0,
    dataQualityFactor: latest?.dataQualityFactor ?? 0,
    historyStatus: `All ${candles.length} available loaded bars analysed; upstream lifetime completeness unverified. Broker period ${broker.start} to ${broker.end}.`,
    priceVolume: priceVolume(candles),
    inventory,
    groups: aggregateGroups(inventory),
    alerts,
    warnings: [
      ...(!snapshot ? ["TradingView candles unavailable."] : []),
      ...(broker.unavailableReason ? [broker.unavailableReason] : []),
      "Opening inventory: Unknown. Observed net change is not absolute holdings.",
      "Historical broker publication times are not established by an API backfill. Strict replay uses only recorded availableAt timestamps.",
      "Order-book data unavailable; tick, split-execution and narrative features disabled.",
      ...(registry
        ? []
        : [
            "Sectors Broker Registry unavailable; broker cohort classification fell back to low-confidence local heuristics.",
          ]),
      ...(stale > 0
        ? [
            "Latest price snapshot is stale; current-market claims are not supported.",
          ]
        : []),
    ],
  };
}
