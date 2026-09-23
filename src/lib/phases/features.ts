import type { MarketCandle } from "@/domain/chart-market";
import type { BrokerFlow, PhaseEvidence } from "@/domain/market";
import { brokerProfile, BROKER_REGISTRY } from "@/config/brokers";
import type { BrokerProfile } from "@/domain/intelligence";
import {
  PHASE_CONFIG,
  type PhaseConfig,
  type PhaseFeatures,
} from "@/config/phases";

export const sessionDate = (time: number) =>
  new Date(time * 1000 + 7 * 3600000).toISOString().slice(0, 10);
const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
export const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));
export function percentile(value: number, history: number[]) {
  if (!history.length) return 50;
  return (
    (100 *
      history.reduce(
        (n, v) => n + (v < value ? 1 : v === value ? 0.5 : 0),
        0,
      )) /
    history.length
  );
}
export interface FeatureFrame {
  time: number;
  date: string;
  sufficient: boolean;
  bucket: string;
  features: PhaseFeatures;
  crossingRisk: number;
  brokerCoverage: number;
  brokerAvailable: boolean;
  frequencyAvailable: boolean;
  availabilityKnown: boolean;
  priceReturn: number;
  relativeVolume: number;
  rangeExpansion: number;
  breakout: boolean;
  breakdown: boolean;
  positiveSlope: boolean;
  previousAccumulatorSelling: boolean;
  controlled: boolean;
  quality: number;
  evidence: PhaseEvidence[];
  raw: Record<string, number>;
}
export interface FeatureOptions {
  config?: PhaseConfig;
  flows?: readonly BrokerFlow[];
  registry?: readonly BrokerProfile[];
  /** Strict mode excludes broker rows without a recorded availability timestamp. */
  strictAvailability?: boolean;
  /** Only the latest decision may use data acquired after its candle closed. */
  asOf?: string;
}

/** Trailing features; history and normalizers never include future observations. */
export function buildFeatureFrames(
  candles: readonly MarketCandle[],
  options: FeatureOptions = {},
): FeatureFrame[] {
  const config = options.config ?? PHASE_CONFIG;
  const registry = options.registry ?? BROKER_REGISTRY;
  const frames: FeatureFrame[] = [];
  const flows = options.flows ?? [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i],
      date = sessionDate(c.time);
    const prior = candles.slice(Math.max(0, i - config.baseline), i);
    const recent = candles.slice(Math.max(0, i - 4), i + 1);
    const prev = candles[Math.max(0, i - 1)];
    const decisionAt =
      i === candles.length - 1 && options.asOf
        ? Date.parse(options.asOf)
        : Date.parse(`${date}T23:59:59+07:00`);
    const usable = flows.filter(
      (f) =>
        f.date <= date &&
        (f.availableAt
          ? Date.parse(f.availableAt) <= decisionAt
          : !options.strictAvailability),
    );
    const start = sessionDate(candles[Math.max(0, i - 4)].time);
    const current = usable.filter((f) => f.date >= start);
    const historical = usable.filter((f) => f.date < start);
    const priorVolume = mean(prior.map((b) => b.volume));
    const relativeVolume = priorVolume
      ? mean(recent.map((b) => b.volume)) / priorVolume
      : 0;
    const return5 = i >= 5 ? c.close / candles[i - 5].close - 1 : 0;
    const rangePct = (c.high - c.low) / Math.max(c.close, 1e-9);
    const baselineRange = mean(prior.map((b) => (b.high - b.low) / b.close));
    const rangeExpansion = baselineRange ? rangePct / baselineRange : 0;
    const high = prior.length ? Math.max(...prior.map((b) => b.high)) : c.high;
    const low = prior.length ? Math.min(...prior.map((b) => b.low)) : c.low;
    const baseDistance = low > 0 ? c.close / low - 1 : 0;
    const turnover = mean(prior.map((b) => b.close * b.volume));
    const bucket =
      turnover < config.liquidity.lowBelowIdr
        ? "LOW"
        : turnover >= config.liquidity.highAboveIdr
          ? "HIGH"
          : "MEDIUM";
    const brokerDays = new Set(current.map((f) => f.date));
    const brokerCoverage = Math.min(
      1,
      brokerDays.size / Math.max(1, recent.length),
    );
    const byCode = new Map<
      string,
      {
        buy: number;
        sell: number;
        priorNet: number;
        peak: number;
        running: number;
        retail: boolean;
        smart: boolean;
      }
    >();
    for (const f of [...usable].sort((a, b) => a.date.localeCompare(b.date))) {
      const code = f.brokerCode.toUpperCase(),
        profile = brokerProfile(code, registry, f.date, f.ticker);
      const row = byCode.get(code) ?? {
        buy: 0,
        sell: 0,
        priorNet: 0,
        peak: 0,
        running: 0,
        retail: false,
        smart: false,
      };
      row.running += f.buyLot - f.sellLot;
      row.peak = Math.max(row.peak, row.running);
      if (f.date < start) row.priorNet += f.buyLot - f.sellLot;
      else {
        row.buy += f.buyLot;
        row.sell += f.sellLot;
      }
      // Profile used at each row's event date, never a later reclassification.
      if (f.date >= start) {
        row.retail ||= profile.classification === "RETAIL_ACCESSIBLE";
        row.smart ||= profile.classification === "INSTITUTIONAL_ASSOCIATED";
      }
      byCode.set(code, row);
    }
    const rows = [...byCode.values()].filter((r) => r.buy + r.sell > 0);
    const positive = rows.filter((r) => r.buy > r.sell),
      negative = rows.filter((r) => r.sell > r.buy);
    const totalPositive = positive.reduce((n, r) => n + r.buy - r.sell, 0);
    const totalNegative = negative.reduce((n, r) => n + r.sell - r.buy, 0);
    const concentration = (
      side: typeof positive,
      total: number,
      sign: number,
    ) =>
      total
        ? (side
            .map((r) => sign * (r.buy - r.sell))
            .sort((a, b) => b - a)
            .slice(0, 3)
            .reduce((a, b) => a + b, 0) /
            total) *
          100
        : 0;
    const gross = rows.reduce((n, r) => n + r.buy + r.sell, 0);
    // Sum matched sides within each daily broker row, not across a multi-day round trip.
    const crossingRisk = gross
      ? current.reduce((n, r) => n + 2 * Math.min(r.buyLot, r.sellLot), 0) /
        gross
      : 0;
    const smartNet = current.reduce(
      (n, r) =>
        n +
        (brokerProfile(r.brokerCode, registry, r.date, r.ticker)
          .classification === "INSTITUTIONAL_ASSOCIATED"
          ? r.buyLot - r.sellLot
          : 0),
      0,
    );
    const retailNet = current.reduce(
      (n, r) =>
        n +
        (brokerProfile(r.brokerCode, registry, r.date, r.ticker)
          .classification === "RETAIL_ACCESSIBLE"
          ? r.buyLot - r.sellLot
          : 0),
      0,
    );
    const priorAccumulators = rows.filter((r) => r.peak > 0 && r.priorNet > 0);
    const accumulatorSell = priorAccumulators.reduce(
      (n, r) => n + Math.max(0, r.sell - r.buy),
      0,
    );
    const priorInventory = priorAccumulators.reduce(
      (n, r) => n + r.priorNet,
      0,
    );
    const observedPeak = priorAccumulators.reduce((n, r) => n + r.peak, 0);
    const observedDepletion = observedPeak
      ? priorAccumulators.reduce(
          (n, r) => n + Math.max(0, r.peak - r.running),
          0,
        ) / observedPeak
      : 0;
    const frequencyAvailable =
      current.length > 0 &&
      current.every(
        (r) => r.buyFrequency !== undefined && r.sellFrequency !== undefined,
      );
    const frequency = frequencyAvailable
      ? current.reduce((n, r) => n + r.buyFrequency! + r.sellFrequency!, 0) /
        Math.max(1, brokerDays.size)
      : 0;
    const historicalDays = new Set(historical.map((r) => r.date)).size;
    const historicalFrequency =
      historicalDays &&
      historical.every(
        (r) => r.buyFrequency !== undefined && r.sellFrequency !== undefined,
      )
        ? historical.reduce(
            (n, r) => n + r.buyFrequency! + r.sellFrequency!,
            0,
          ) / historicalDays
        : 0;
    const frequencyGrowth =
      historicalFrequency > 0 ? frequency / historicalFrequency : 0;
    const participants = rows.length;
    const sufficient =
      prior.length >= config.baseline && priorVolume > 0 && c.close > 0;
    const raw = {
      return5,
      volume: c.volume,
      relativeVolume,
      rangePct,
      rangeExpansion,
      baseDistance,
      frequency,
      frequencyGrowth,
      participants,
      smartNet,
      retailNet,
    };
    const history = frames
      .slice(-config.normalizationHistory)
      .filter((f) => f.sufficient);
    const sameBucket = history.filter((f) => f.bucket === bucket);
    const reference =
      sameBucket.length >= config.minimumBucketHistory ? sameBucket : history;
    const rank = (key: string, value: number) =>
      percentile(
        value,
        reference.map((f) => f.raw[key]),
      );
    const positiveReturn = return5 > 0 ? rank("return5", return5) : 0;
    const controlled = Math.abs(return5) <= Math.max(baselineRange * 2, 0.005);
    const positiveSlope = c.close > recent[0].close;
    const upper =
      (c.high - Math.max(c.open, c.close)) / Math.max(c.high - c.low, 1e-9);
    const brokerAvailable = brokerCoverage >= 0.6 && rows.length >= 2;
    const broker = (value: number) => (brokerAvailable ? clamp(value) : null);
    const buyerDispersion =
      positive.length + negative.length
        ? (positive.length / (positive.length + negative.length)) * 100
        : 0;
    const sellerDispersion = 100 - buyerDispersion;
    const features: PhaseFeatures = {
      concentratedNetBuy: broker(concentration(positive, totalPositive, 1)),
      inventoryGrowth: broker(
        smartNet > 0 ? 50 + (50 * smartNet) / Math.max(totalPositive, 1) : 0,
      ),
      sellerDispersion: broker(sellerDispersion),
      retailExit: broker(
        retailNet < 0
          ? 50 + (50 * Math.abs(retailNet)) / Math.max(totalNegative, 1)
          : 0,
      ),
      absorption: null,
      controlledPriceImpact: controlled
        ? 100 -
          clamp((Math.abs(return5) / Math.max(baselineRange * 2, 0.005)) * 50)
        : 0,
      lowVolumeCorrection:
        return5 <= 0 && relativeVolume < 1
          ? clamp((1 - relativeVolume) * 150)
          : controlled
            ? 40
            : 0,
      attentionGrowth:
        relativeVolume > 1
          ? clamp(
              (rank("relativeVolume", relativeVolume) +
                (frequencyGrowth > 1
                  ? rank("frequencyGrowth", frequencyGrowth)
                  : 0)) /
                2,
            )
          : 0,
      frequencyGrowth:
        frequencyAvailable && historicalFrequency > 0
          ? frequencyGrowth > 1
            ? rank("frequencyGrowth", frequencyGrowth)
            : 0
          : null,
      volumeGrowth:
        relativeVolume > 1 ? rank("relativeVolume", relativeVolume) : 0,
      participantBroadening: broker(
        reference.some((f) => f.brokerAvailable)
          ? rank("participants", participants)
          : 0,
      ),
      breakoutAttempt: positiveSlope ? (c.close >= high * 0.98 ? 85 : 55) : 0,
      retailInterestGrowth: broker(
        retailNet > 0 ? rank("retailNet", retailNet) : 0,
      ),
      retainedInventory: broker(
        priorInventory > 0
          ? 100 - clamp((accumulatorSell / priorInventory) * 100)
          : 0,
      ),
      narrative: null,
      extremeReturn: positiveReturn,
      extremeVolume: c.volume > priorVolume ? rank("volume", c.volume) : 0,
      volatilityExpansion:
        rangeExpansion > 1 ? rank("rangeExpansion", rangeExpansion) : 0,
      distanceFromBase:
        baseDistance > baselineRange * 3
          ? rank("baseDistance", baseDistance)
          : 0,
      retailFomo: broker(retailNet > 0 ? rank("retailNet", retailNet) : 0),
      frequencyAnomaly:
        frequencyAvailable && historicalFrequency > 0
          ? frequencyGrowth > 1
            ? rank("frequency", frequency)
            : 0
          : null,
      rapidPriceLevelConsumption: null,
      previousAccumulatorNetSell: broker(
        priorInventory > 0
          ? clamp((accumulatorSell / priorInventory) * 150)
          : 0,
      ),
      inventoryDepletion: broker(
        observedPeak > 0 ? clamp(observedDepletion * 100) : 0,
      ),
      sellerConcentration: broker(concentration(negative, totalNegative, -1)),
      buyerDispersion: broker(buyerDispersion),
      retailAbsorption: broker(
        retailNet > 0 ? 50 + (50 * retailNet) / Math.max(totalPositive, 1) : 0,
      ),
      supplyNearHigh:
        c.close >= high * 0.95 && relativeVolume > 1
          ? clamp(
              upper * 100 +
                Math.max(
                  0,
                  1 - Math.abs(return5) / Math.max(baselineRange, 0.001),
                ) *
                  50,
            )
          : 0,
      failedBreakout: c.high > high && c.close < high ? 100 : 0,
    };
    const availabilityKnown = usable.every((r) => !!r.availableAt);
    const discontinuity = i > 0 && Math.abs(c.close / prev.close - 1) > 0.4;
    const quality =
      (sufficient ? 1 : 0) *
      Math.min(1, 0.6 + history.length / 100) *
      (sameBucket.length >= config.minimumBucketHistory ? 1 : 0.8) *
      (1 - crossingRisk * 0.5) *
      (availabilityKnown ? 1 : 0.7) *
      (discontinuity ? 0.3 : 1);
    const evidence: PhaseEvidence[] = [
      {
        status: "OBSERVED",
        feature: "ohlcv",
        description: `Close ${c.close}; volume ${c.volume} shares.`,
        value: c.close,
        source: "TradingView OHLCV",
      },
      {
        status: "DERIVED",
        feature: "priceVolume",
        description: `5-bar return ${(return5 * 100).toFixed(2)}%; relative volume ${relativeVolume.toFixed(2)}x; liquidity bucket ${bucket}.`,
        value: return5,
        source: "Trailing symbol history",
      },
      {
        status: brokerAvailable ? "DERIVED" : "UNAVAILABLE",
        feature: "brokerFlow",
        description: brokerAvailable
          ? `Institutional proxy net ${smartNet.toFixed(0)} lots; retail proxy net ${retailNet.toFixed(0)} lots; crossing proxy ${(crossingRisk * 100).toFixed(0)}%.`
          : "Broker evidence unavailable at this decision time or incomplete for the segment.",
        value: brokerAvailable ? smartNet : null,
        source: "Sectors daily broker aggregates",
      },
      {
        status: "UNAVAILABLE",
        feature: "narrative",
        description:
          "Narrative data unavailable; attention is not proof of coordinated promotion.",
        value: null,
        source: "No verified narrative feed",
      },
      {
        status: "UNAVAILABLE",
        feature: "orderBook",
        description:
          "Order-book data unavailable. No absorption, reload or rapid offer-consumption claim.",
        value: null,
        source: "Phase 1 capability audit",
      },
      {
        status: "UNAVAILABLE",
        feature: "beneficialOwner",
        description: "Broker code does not identify the beneficial owner.",
        value: null,
        source: "Source limitation",
      },
    ];
    frames.push({
      time: c.time,
      date,
      sufficient,
      bucket,
      features,
      crossingRisk,
      brokerCoverage,
      brokerAvailable,
      frequencyAvailable,
      availabilityKnown,
      priceReturn: return5,
      relativeVolume,
      rangeExpansion,
      breakout: c.close > high,
      breakdown: c.close < low,
      positiveSlope,
      previousAccumulatorSelling: priorInventory > 0 && accumulatorSell > 0,
      controlled,
      quality,
      evidence,
      raw,
    });
  }
  return frames;
}
