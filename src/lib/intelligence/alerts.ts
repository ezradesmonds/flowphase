import type { MarketCandle } from "@/domain/chart-market";
import type { PhaseRegion, BrokerFlow } from "@/domain/market";
import type { BrokerProfile, MarketAlert } from "@/domain/intelligence";
import { ANALYSIS_RULES } from "@/config/analysis";
import { brokerProfile } from "@/config/brokers";
import { baseline, priceVolume } from "./price-volume";
import { classifyCandle } from "@/lib/phases/detect";
import { buildFeatureFrames, type FeatureOptions } from "@/lib/phases/features";
import { scoreFrame } from "@/lib/phases/detect";
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
        actualValue: c.volume,
        baseline: pv.averageVolume,
        coverage: 0.35,
        link: "/stocks/" + ticker + "#chart",
        evidenceItems: [
          {
            status: "DERIVED",
            feature: "relativeVolume",
            value: pv.relativeVolume,
            description: pv.explanation,
            source: "TradingView OHLCV",
          },
        ],
        confidence: 35,
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
  registry?: readonly BrokerProfile[],
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
      const profile = brokerProfile(code, registry, r.date, ticker);
      if (profile.classification !== "INSTITUTIONAL_ASSOCIATED") return;
      if (i < ANALYSIS_RULES.baseline) return;
      const prior = rows.slice(i - ANALYSIS_RULES.baseline, i),
        buy = r.buyLot - r.sellLot > 0;
      const amounts = prior.map((v) =>
        buy
          ? Math.max(0, v.buyLot - v.sellLot)
          : Math.max(0, v.sellLot - v.buyLot),
      );
      const { mean, deviation } = baseline(amounts),
        amount = Math.abs(r.buyLot - r.sellLot);
      if ((r.buyLot + r.sellLot) / Math.max(amount, 1) >= 10) return;
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
        actualValue: amount,
        baseline: mean,
        coverage: 0.6,
        link: "/stocks/" + ticker + "#inventory",
        evidenceItems: [
          {
            status: "DERIVED",
            feature: "netLot",
            value: amount,
            description:
              "Daily broker net lots compared with preceding reported sessions.",
            source: "Sectors",
          },
        ],
        confidence: Math.min(60, profile.confidence),
        evidence: [
          `${code}: ${amount.toFixed(0)} ${buy ? "net buy" : "net sell"} lots, ${z.toFixed(2)} standard deviations and ${(amount / mean).toFixed(2)}× above its prior 20 reported-session mean (${mean.toFixed(0)} lots).`,
          `Daily signed flow: ${(r.buyLot - r.sellLot).toFixed(0)} lots.`,
        ],
        warnings: [
          "Daily aggregate block-flow proxy, not evidence of an individual block trade.",
          profile.source === "VERIFIED_METADATA"
            ? "Sectors broker cohort metadata describes the exchange member, not the beneficial owner behind an individual trade."
            : "Broker classification fallback is heuristic; a broker represents multiple clients.",
          "Reported sessions may have gaps. Timestamp denotes session date at 16:00 WIB, not execution time.",
        ],
        dataSource: ["Sectors daily broker summary", "FlowPhase Algorithm"],
        status: "NEW",
        phase: "UNCERTAIN",
      });
    });
  }
  return [...new Map(alerts.map((a) => [a.id, a])).values()];
}

// Use segment-end timestamps: evidence accumulated through the end cannot be
// attributed to the earlier start. Strict replay regenerates its own segments.
export function phaseAlerts(
  ticker: string,
  regions: readonly PhaseRegion[],
): MarketAlert[] {
  return regions.flatMap((r, i) => {
    const types: MarketAlert["type"][] = [];
    const broker = r.brokerEvidence === "BROKER_SUPPORTED";
    if (r.phase === "AKUMULASI" && broker)
      types.push("ACCUMULATION_CANDIDATE", "INVENTORY_GROWTH");
    if (r.phase === "POMPOM") types.push("POMPOM_ATTENTION_CANDIDATE");
    if (r.phase === "MENGGORENG") types.push("AGGRESSIVE_MARKUP_CANDIDATE");
    if (r.phase === "DISTRIBUSI" && broker)
      types.push("DISTRIBUTION_CANDIDATE", "INVENTORY_DEPLETION");
    if (r.marketCondition === "POST_DISTRIBUTION_MARKDOWN")
      types.push("POST_DISTRIBUTION_MARKDOWN");
    if (r.phase === "INSUFFICIENT_DATA") types.push("INSUFFICIENT_DATA");
    if (i && r.phase !== regions[i - 1].phase) types.push("PHASE_TRANSITION");
    return types.map((type) => ({
      id: ticker + ":" + r.endTimestamp + ":" + type,
      ticker,
      timestamp: r.endTimestamp,
      type,
      severity:
        type === "POST_DISTRIBUTION_MARKDOWN"
          ? ("HIGH" as const)
          : ("MEDIUM" as const),
      brokerCode: null,
      brokerClassification: null,
      lotAmount: null,
      estimatedValue: null,
      actualValue: Math.max(...Object.values(r.scores)),
      baseline: null,
      confidence: r.confidence,
      coverage: r.coverage,
      link: "/stocks/" + ticker + "#chart",
      evidenceItems: r.evidenceItems,
      evidence: r.evidence,
      warnings: r.warnings,
      dataSource: ["Phase engine", r.algorithmVersion],
      status: "NEW" as const,
      phase: r.phase,
    }));
  });
}

export function featureAlerts(
  ticker: string,
  candles: readonly MarketCandle[],
  options: FeatureOptions = {},
): MarketAlert[] {
  return buildFeatureFrames(candles, options).flatMap((f) => {
    if (!f.sufficient) return [];
    const observation = scoreFrame(f, options.config);
    const events: {
      type: MarketAlert["type"];
      value: number;
      baseline: number;
      feature: string;
    }[] = [];
    const add = (
      type: MarketAlert["type"],
      feature: string,
      value: number | null,
      threshold: number,
    ) => {
      if (value !== null && value >= threshold)
        events.push({ type, feature, value, baseline: threshold });
    };
    add("EXTREME_VOLUME", "extremeVolume", f.features.extremeVolume, 95);
    add("FAILED_BREAKOUT", "failedBreakout", f.features.failedBreakout, 100);
    if (f.brokerAvailable) {
      add("SUSPECTED_CROSSING", "crossingRisk", f.crossingRisk, 0.9);
      if (f.crossingRisk < 0.5) {
        if ((f.features.inventoryGrowth ?? 0) > 50)
          add(
            "CONCENTRATED_NET_BUY",
            "concentratedNetBuy",
            f.features.concentratedNetBuy,
            75,
          );
        if (f.previousAccumulatorSelling)
          add(
            "CONCENTRATED_NET_SELL",
            "sellerConcentration",
            f.features.sellerConcentration,
            75,
          );
        if (f.previousAccumulatorSelling)
          add(
            "RETAIL_ABSORPTION",
            "retailAbsorption",
            f.features.retailAbsorption,
            75,
          );
      }
    }
    return events.map((e) => ({
      id: ticker + ":" + f.time + ":" + e.type,
      ticker,
      timestamp: f.time,
      type: e.type,
      severity: "MEDIUM" as const,
      brokerCode: null,
      brokerClassification: null,
      lotAmount: null,
      estimatedValue: null,
      actualValue: e.value,
      baseline: e.baseline,
      confidence: observation.confidence,
      coverage: observation.coverage,
      link: "/stocks/" + ticker + "#chart",
      evidenceItems: [
        {
          status: "DERIVED" as const,
          feature: e.feature,
          value: e.value,
          description: e.feature + " exceeds research threshold " + e.baseline,
          source: "Phase engine",
        },
      ],
      evidence: [e.feature + ": " + e.value],
      warnings: [
        "Proxy only; daily aggregates do not establish matched crossing, execution side or beneficial owner.",
      ],
      dataSource: ["TradingView OHLCV", "Sectors daily aggregates"],
      status: "NEW" as const,
      phase: observation.phase,
    }));
  });
}
