import type { CandleSnapshot } from "@/domain/chart-market";
import type { BrokerSnapshot } from "@/domain/securities";
import type { Intelligence } from "@/domain/intelligence";
import { detectPhaseRegions, classifyCandle } from "@/lib/phases/detect";
import { detectCycles } from "./cycles";
import { calculateInventory, aggregateGroups } from "./inventory";
import { priceVolume } from "./price-volume";
import { brokerAlerts, volumeAlerts } from "./alerts";
export const sessionDate = (timestamp: number) =>
  new Date(timestamp * 1000 + 7 * 3600000).toISOString().slice(0, 10);
export function analyze(
  ticker: string,
  snapshot: CandleSnapshot | null,
  broker: BrokerSnapshot,
  now = new Date().toISOString(),
): Intelligence {
  const candles = snapshot?.candles ?? [],
    last = candles.at(-1);
  const cutoff = last
    ? sessionDate(last.time - (snapshot?.timeframe === "1D" ? 0 : 86400))
    : broker.end;
  broker = {
    ...broker,
    flows: broker.flows.filter((f) => f.date <= cutoff),
    end: broker.end < cutoff ? broker.end : cutoff,
  };
  const cycles = detectCycles(
    ticker,
    detectPhaseRegions(ticker, snapshot?.timeframe ?? "1D", candles),
  );
  for (const cycle of cycles) {
    for (const region of cycle.phases) {
      const start = sessionDate(region.startTimestamp),
        end = sessionDate(region.endTimestamp);
      const days = [...new Set(broker.flows.map((f) => f.date))].sort();
      if (
        snapshot?.timeframe !== "1D" ||
        !days.length ||
        start < days[0] ||
        end > days.at(-1)!
      )
        continue;
      const rows = calculateInventory(broker.flows, ticker, start, end);
      const group = aggregateGroups(rows).find(
        (g) => g.classification === "INSTITUTIONAL_ASSOCIATED",
      );
      const supports =
        group &&
        (region.phase === "ACCUMULATION" || region.phase === "MARKUP"
          ? group.netLot > 0
          : group.netLot < 0);
      if (supports) {
        region.brokerEvidence = "BROKER_SUPPORTED";
        region.evidence.push(
          `Institutional-associated broker proxy net flow ${group.netLot.toFixed(0)} lots over available reported dates; heuristic classification, not ownership.`,
        );
      }
    }
    if (cycle.phases.every((r) => r.brokerEvidence === "BROKER_SUPPORTED"))
      cycle.evidenceStatus = "BROKER_SUPPORTED";
  }
  const regions = cycles.flatMap((c) => c.phases),
    latest = regions.at(-1);
  const phase =
    latest && last && latest.endTimestamp === last.time
      ? latest.phase
      : classifyCandle(candles, candles.length - 1).phase === "UNCLASSIFIED"
        ? "UNCLASSIFIED"
        : "TRANSITION";
  // Never label a partial broker window as inventory since an earlier cycle start.
  const cycleStart = cycles.at(-1)?.startTimestamp;
  const start = cycleStart
    ? sessionDate(cycleStart) > broker.start
      ? sessionDate(cycleStart)
      : broker.start
    : broker.start;
  const end =
    last && sessionDate(last.time) < broker.end
      ? sessionDate(last.time)
      : broker.end;
  const inventory = calculateInventory(
    broker.flows,
    ticker,
    start,
    end,
    last?.close ?? null,
  );
  const alerts = [
    ...volumeAlerts(ticker, candles),
    ...brokerAlerts(ticker, broker.flows),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((a) => {
      const date = sessionDate(a.timestamp),
        r = regions.find(
          (r) =>
            sessionDate(r.startTimestamp) <= date &&
            sessionDate(r.endTimestamp) >= date,
        );
      return {
        ...a,
        phase: r?.phase ?? ("UNCLASSIFIED" as const),
        status: (date < (last ? sessionDate(last.time) : broker.end)
          ? "EXPIRED"
          : "NEW") as "EXPIRED" | "NEW",
      };
    });
  return {
    version: 1,
    ticker,
    calculatedAt: now,
    candles: snapshot,
    broker,
    regions,
    cycles,
    phase,
    confidence:
      latest?.endTimestamp === last?.time ? (latest?.confidence ?? 0) : 0,
    priceVolume: priceVolume(candles),
    inventory,
    groups: aggregateGroups(inventory),
    alerts,
    warnings: [
      ...(!snapshot ? ["TradingView candles unavailable."] : []),
      ...(broker.unavailableReason ? [broker.unavailableReason] : []),
      ...(cycleStart && sessionDate(cycleStart) < broker.start
        ? [
            "Broker history starts after the cycle: inventory covers available period only.",
          ]
        : []),
      "Starting holdings are unknown; estimated inventory is cumulative positive net flow, not beneficial ownership.",
    ],
  };
}
