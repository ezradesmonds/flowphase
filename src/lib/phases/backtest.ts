import type { MarketCandle } from "@/domain/chart-market";
import type { BrokerFlow, MarketPhase } from "@/domain/market";
import {
  ALGORITHM_VERSION,
  PHASE_CONFIG,
  type PhaseConfig,
} from "@/config/phases";
import { detectPhaseRegions } from "./detect";
import { sessionDate } from "./features";

export interface ReviewedEvent {
  timestamp: number;
  phase: MarketPhase;
}
/** Walk-forward decisions are recomputed from prefixes. Future bars are used ONLY
 * for matured outcome evaluation; reviewed labels never enter the classifier. */
export function backtestPhases(
  ticker: string,
  candles: readonly MarketCandle[],
  flows: readonly BrokerFlow[] = [],
  options: {
    horizon?: number;
    config?: PhaseConfig;
    reviewed?: readonly ReviewedEvent[];
  } = {},
) {
  const horizon = options.horizon ?? 5,
    config = options.config ?? PHASE_CONFIG;
  if (!Number.isInteger(horizon) || horizon < 1)
    throw new Error("Invalid horizon");
  return ([false, true] as const).map((withBroker) => {
    const decisions = candles.slice(config.baseline).map((c, offset) => {
      const i = config.baseline + offset;
      const r = detectPhaseRegions(ticker, "1D", candles.slice(0, i + 1), {
        config,
        flows: withBroker ? flows.filter((f) => f.ticker === ticker) : [],
        strictAvailability: true,
      }).at(-1)!;
      const forward =
        i + horizon < candles.length
          ? candles.slice(i + 1, i + horizon + 1)
          : [];
      const knownFlows = flows.filter(
        (f) =>
          f.ticker === ticker &&
          f.date === sessionDate(c.time) &&
          f.availableAt &&
          Date.parse(f.availableAt) <=
            Date.parse(sessionDate(c.time) + "T23:59:59+07:00"),
      );
      const priorNet = new Map<string, number>();
      for (const f of flows)
        if (
          f.ticker === ticker &&
          f.date < sessionDate(c.time) &&
          f.availableAt &&
          Date.parse(f.availableAt) <=
            Date.parse(sessionDate(c.time) + "T23:59:59+07:00")
        ) {
          priorNet.set(
            f.brokerCode,
            (priorNet.get(f.brokerCode) ?? 0) + f.buyLot - f.sellLot,
          );
        }
      const directionalRows = knownFlows.filter(
        (f) => (priorNet.get(f.brokerCode) ?? 0) > 0,
      );
      const directionalNet = directionalRows.reduce(
        (sum, f) => sum + f.buyLot - f.sellLot,
        0,
      );
      const inventoryDirectionConsistent =
        !withBroker ||
        !knownFlows.length ||
        !directionalRows.length ||
        !["AKUMULASI", "DISTRIBUSI"].includes(r.phase)
          ? null
          : r.phase === "AKUMULASI"
            ? directionalNet > 0
            : directionalNet < 0;
      return {
        timestamp: c.time,
        phase: r.phase,
        bucket: r.liquidityBucket,
        confidence: r.confidence,
        inventoryDirectionConsistent,
        brokerSupported: r.brokerEvidence === "BROKER_SUPPORTED",
        forwardReturn: forward.length
          ? forward.at(-1)!.close / c.close - 1
          : null,
        maximumAdverseExcursion: forward.length
          ? Math.min(0, ...forward.map((b) => b.low / c.close - 1))
          : null,
        maximumFavorableExcursion: forward.length
          ? Math.max(0, ...forward.map((b) => b.high / c.close - 1))
          : null,
        // Signed observed changes, never absolute holdings.
        observedNetLots: knownFlows.length
          ? Object.fromEntries(
              knownFlows.map((f) => [f.brokerCode, f.buyLot - f.sellLot]),
            )
          : null,
      };
    });
    const transitions = decisions.filter(
      (d, i) => i > 0 && d.phase !== decisions[i - 1].phase,
    );
    const reviewed = options.reviewed ?? [];
    const matched = transitions.flatMap((d) => {
      const event = reviewed.find((e) => e.timestamp === d.timestamp);
      return event ? [{ correct: event.phase === d.phase }] : [];
    });
    const leadTimes = reviewed.flatMap((e) => {
      const candidate = transitions.find(
        (d) =>
          d.phase === e.phase &&
          d.timestamp <= e.timestamp &&
          e.timestamp - d.timestamp <= horizon * 86400,
      );
      return candidate ? [(e.timestamp - candidate.timestamp) / 86400] : [];
    });
    return {
      withBroker,
      algorithmVersion: ALGORITHM_VERSION,
      configVersion: config.version,
      horizon,
      inventoryDirectionConsistency: decisions.some(
        (d) => d.inventoryDirectionConsistent !== null,
      )
        ? decisions.filter((d) => d.inventoryDirectionConsistent === true)
            .length /
          decisions.filter((d) => d.inventoryDirectionConsistent !== null)
            .length
        : null,
      decisions,
      transitionCount: transitions.length,
      phaseStability:
        decisions.length > 1
          ? 1 - transitions.length / (decisions.length - 1)
          : null,
      transitionAccuracy: matched.length
        ? matched.filter((m) => m.correct).length / matched.length
        : null,
      falsePositiveRate: matched.length
        ? matched.filter((m) => !m.correct).length / matched.length
        : null,
      alertLeadTimeDays: leadTimes,
      byLiquidityBucket: ["LOW", "MEDIUM", "HIGH"].map((bucket) => ({
        bucket,
        results: decisions.filter(
          (d) => d.bucket === bucket && d.forwardReturn !== null,
        ),
      })),
      limitations: [
        "Transition accuracy and false-positive rate require externally reviewed, timestamped labels.",
        "Inventory direction is concurrent evidence agreement, not independent predictive validation; it requires point-in-time broker rows. Net changes are not holdings.",
        "Uncalibrated research evaluation; no profitability claim. Corporate actions require consistent adjusted inputs.",
      ],
    };
  });
}
