import type { Intelligence } from "@/domain/intelligence";
import { RULES, metric, type Meta } from "./model";
import { sessionDate } from "../analyze";
export const GATED_ALERTS = [
  "BROKER_SPLIT_EXECUTION_CANDIDATE",
  "ESTIMATED_PNL_THRESHOLD",
  "CONTROLLING_SHAREHOLDER_CHANGE",
  "FREE_FLOAT_CHANGE",
  "NEW_ENTITY_RELATION",
  "FOREIGN_AFFILIATED_FLOW_ANOMALY",
  "STATE_AFFILIATED_FLOW_ANOMALY",
];
export function extendedAlerts(a: Intelligence) {
  const alerts: {
    id: string;
    symbol: string;
    broker: string;
    phase: string;
    type: string;
    date: string;
    actual: ReturnType<typeof metric>;
    baseline: ReturnType<typeof metric>;
    explanation: string;
    limitations: string[];
  }[] = [];
  for (const code of new Set(a.broker.flows.map((f) => f.brokerCode))) {
    const rows = a.broker.flows
      .filter((f) => f.brokerCode === code)
      .sort((a, b) => a.date.localeCompare(b.date));
    const current = rows.at(-1);
    if (!current) continue;
    const prior = rows.slice(-21, -1);
    if (prior.length < RULES.minimumBaseline) continue;
    const meta: Meta = {
      source: ["Sectors /broker-summary/"],
      as_of: current.availableAt ?? a.broker.fetchedAt,
      period_start: current.date,
      period_end: current.date,
      calculation_method: "trailing broker baseline, current session excluded",
      data_status: "INFERRED",
      confidence: 40,
      quality_flags: ["CANDIDATE_NOT_IDENTIFIED_OWNER", "DAILY_AGGREGATES"],
    };
    const phase =
      a.regions.find(
        (r) =>
          sessionDate(r.startTimestamp) <= current.date &&
          sessionDate(r.endTimestamp) >= current.date,
      )?.phase ?? "INSUFFICIENT_DATA";
    const emit = (
      type: string,
      value: number,
      baseline: number,
      text: string,
    ) =>
      alerts.push({
        id: a.ticker + ":" + code + ":" + current.date + ":" + type,
        symbol: a.ticker,
        broker: code,
        phase,
        type,
        date: current.date,
        actual: metric(value, meta, text),
        baseline: metric(
          baseline,
          {
            ...meta,
            period_start: prior[0].date,
            period_end: prior.at(-1)!.date,
          },
          "trailing baseline",
        ),
        explanation: text,
        limitations: meta.quality_flags,
      });
    if (
      prior.every((r) => r.buyLot === 0 && r.sellLot === 0) &&
      current.buyLot > current.sellLot
    )
      emit(
        "BROKER_NEW_POSITION_CANDIDATE",
        current.buyLot - current.sellLot,
        0,
        "First active net buy after loaded inactive sessions; not proof of a new absolute holding",
      );
    const net = current.buyLot - current.sellLot,
      baseline =
        prior.reduce((s, r) => s + Math.abs(r.buyLot - r.sellLot), 0) /
        prior.length,
      gross = current.buyLot + current.sellLot,
      crossing = gross
        ? (2 * Math.min(current.buyLot, current.sellLot)) / gross
        : 0;
    if (crossing >= RULES.crossingThreshold)
      emit(
        "BROKER_CROSSING_CANDIDATE",
        crossing,
        RULES.crossingThreshold,
        "High same-day two-sided activity; matched trades unverified",
      );
    if (
      Math.abs(net) > baseline * RULES.anomalyMultiple &&
      Math.abs(net) > 0 &&
      crossing < RULES.crossingThreshold
    ) {
      emit(
        net > 0 ? "BROKER_LARGE_NET_BUY" : "BROKER_LARGE_NET_SELL",
        net,
        baseline,
        "Net lot magnitude exceeds trailing baseline × " +
          RULES.anomalyMultiple,
      );
      emit(
        "WHALE_ACTIVITY_CANDIDATE",
        net,
        baseline,
        "Extreme broker net lots; no person identified",
      );
    }
    const frequency = (r: typeof current) =>
      r.buyFrequency !== undefined && r.sellFrequency !== undefined
        ? r.buyFrequency + r.sellFrequency
        : null;
    const f = frequency(current),
      hist = prior.map(frequency);
    if (f !== null && hist.every((v) => v !== null)) {
      const avg = hist.reduce<number>((s, v) => s + v!, 0) / hist.length;
      if (f > avg * RULES.anomalyMultiple && f > 0)
        emit(
          "BROKER_FREQUENCY_SPIKE",
          f,
          avg,
          "Daily frequency exceeds own historical baseline",
        );
      const lots = prior.map(
          (r) => (r.buyLot + r.sellLot) / Math.max(frequency(r)!, 1),
        ),
        avgLot = lots.reduce((s, v) => s + v, 0) / lots.length,
        actual = gross / Math.max(f, 1);
      if (actual > avgLot * RULES.anomalyMultiple && actual > 0)
        emit(
          "BROKER_AVERAGE_LOT_SPIKE",
          actual,
          avgLot,
          "Average lot per reported transaction exceeds baseline",
        );
    }
    const observedPrior = rows
      .slice(0, -1)
      .reduce((s, r) => s + r.buyLot - r.sellLot, 0);
    if (observedPrior > 0 && net < 0 && crossing < RULES.crossingThreshold) {
      emit(
        "PHASE_BROKER_INVENTORY_DEPLETION",
        -net,
        observedPrior,
        "Observed prior accumulator is releasing net lots",
      );
      if (prior.at(-1)!.buyLot >= prior.at(-1)!.sellLot)
        emit(
          "PREVIOUS_ACCUMULATOR_STARTED_SELLING",
          net,
          observedPrior,
          "First selling session after a non-selling session in loaded coverage",
        );
    }
    if (observedPrior > 0 && net > 0 && crossing < RULES.crossingThreshold)
      emit(
        "PHASE_BROKER_INVENTORY_GROWTH",
        net,
        observedPrior,
        "Observed cumulative net inventory increased",
      );
  }
  return alerts.sort((a, b) => b.date.localeCompare(a.date));
}
