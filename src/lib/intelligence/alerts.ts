import type { MarketCandle } from "@/domain/chart-market";
import type { BrokerFlow } from "@/domain/market";
import type { MarketAlert } from "@/domain/intelligence";
import { ANALYSIS_RULES } from "@/config/analysis";
import { brokerProfile } from "@/config/brokers";
import { baseline, priceVolume } from "./price-volume";
import { classifyCandle } from "@/lib/phases/detect";
export function volumeAlerts(
  ticker: string,
  candles: readonly MarketCandle[],
): MarketAlert[] {
  return candles.flatMap((c, i) => {
    const pv = priceVolume(candles, i);
    if (
      !pv?.sufficient ||
      pv.anomaly ||
      pv.volumeZScore === null ||
      pv.relativeVolume === null
    )
      return [];
    const severity = (["CRITICAL", "HIGH", "MEDIUM"] as const).find(
      (s) =>
        pv.relativeVolume! >= ANALYSIS_RULES.volume[s].relative ||
        pv.volumeZScore! >= ANALYSIS_RULES.volume[s].z,
    );
    if (!severity) return [];
    const type = pv.breakout
      ? "HIGH_VOLUME_BREAKOUT"
      : pv.breakdown
        ? "HIGH_VOLUME_BREAKDOWN"
        : Math.abs(pv.priceReturn ?? 0) < 0.003
          ? "VOLUME_WITHOUT_PRICE_PROGRESS"
          : "ABNORMAL_TOTAL_VOLUME";
    return [
      {
        id: `${ticker}:${c.time}:${type}`,
        ticker,
        timestamp: c.time,
        type,
        severity,
        brokerCode: null,
        brokerClassification: null,
        lotAmount: null,
        estimatedValue: null,
        confidence: 60,
        evidence: [
          `Volume ${c.volume.toFixed(0)} versus prior 20-bar mean ${pv.averageVolume!.toFixed(0)}; RVOL ${pv.relativeVolume.toFixed(2)}×; z-score ${pv.volumeZScore.toFixed(2)}.`,
          pv.explanation,
        ],
        warnings: [
          "Total OHLCV volume does not identify aggressor buy/sell side.",
          "Uncalibrated thresholds; incomplete candles and corporate actions may cause false positives.",
        ],
        dataSource: ["TradingView OHLCV", "FlowPhase Algorithm"],
        status: "NEW",
        phase: classifyCandle(candles, i).phase,
      },
    ];
  });
}
export function brokerAlerts(
  ticker: string,
  flows: readonly BrokerFlow[],
): MarketAlert[] {
  const codes = [
    ...new Set(
      flows
        .filter((r) => r.ticker === ticker)
        .map((r) => r.brokerCode.toUpperCase()),
    ),
  ];
  const alerts: MarketAlert[] = [];
  for (const code of codes) {
    const profile = brokerProfile(code);
    if (profile.classification !== "INSTITUTIONAL_ASSOCIATED") continue;
    // Missing broker dates are not imputed as zero activity.
    const days = new Map<string, BrokerFlow>();
    for (const r of flows.filter(
      (r) => r.ticker === ticker && r.brokerCode.toUpperCase() === code,
    )) {
      if (days.has(r.date)) continue; // repository rejects conflicting duplicate daily records
      days.set(r.date, r);
    }
    const rows = [...days.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    rows.forEach((r, i) => {
      if (i < ANALYSIS_RULES.baseline) return;
      const prior = rows.slice(i - ANALYSIS_RULES.baseline, i),
        buy = r.buyLot - r.sellLot > 0;
      const amounts = prior.map((v) =>
        buy ? v.buyLot : Math.max(0, v.sellLot - v.buyLot),
      );
      const { mean, deviation } = baseline(amounts),
        amount = buy ? r.buyLot : r.sellLot - r.buyLot;
      if (mean <= 0 || deviation <= 0 || amount <= 0) return;
      const z = (amount - mean) / deviation;
      if (
        z < ANALYSIS_RULES.brokerZ ||
        amount / mean < ANALYSIS_RULES.brokerRelative
      )
        return;
      // Daily summary date is assigned session-close time in Jakarta, not a trade timestamp.
      const timestamp = Date.parse(`${r.date}T16:00:00+07:00`) / 1000;
      const type = buy ? "INSTITUTIONAL_BLOCK_FLOW" : "UNUSUAL_NET_SELL";
      alerts.push({
        id: `${ticker}:${r.date}:${code}:${type}`,
        ticker,
        timestamp,
        type,
        severity: z >= 4 ? "CRITICAL" : "HIGH",
        brokerCode: code,
        brokerClassification: profile.classification,
        lotAmount: amount,
        estimatedValue: buy
          ? (r.buyValue ?? null)
          : r.sellValue !== undefined && r.buyValue !== undefined
            ? r.sellValue - r.buyValue
            : null,
        confidence: Math.min(60, profile.confidence),
        evidence: [
          `${code}: ${amount.toFixed(0)} ${buy ? "gross buy" : "net sell"} lots, ${z.toFixed(2)} standard deviations and ${(amount / mean).toFixed(2)}× above its prior 20 reported-session mean (${mean.toFixed(0)} lots).`,
          `Daily signed flow: ${(r.buyLot - r.sellLot).toFixed(0)} lots.`,
        ],
        warnings: [
          "Daily aggregate block-flow proxy, not evidence of an individual block trade.",
          "Broker classification is an unvalidated user heuristic; a broker represents multiple clients.",
          "Reported sessions may have gaps. Timestamp denotes session date at 16:00 WIB, not execution time.",
        ],
        dataSource: ["Sectors daily broker summary", "FlowPhase Algorithm"],
        status: "NEW",
        phase: "UNCLASSIFIED",
      });
    });
  }
  return [...new Map(alerts.map((a) => [a.id, a])).values()];
}
