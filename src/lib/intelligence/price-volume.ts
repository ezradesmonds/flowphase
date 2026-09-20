import type { MarketCandle } from "@/domain/chart-market";
import type { PriceVolume } from "@/domain/intelligence";
import { ANALYSIS_RULES } from "@/config/analysis";
export function baseline(values: number[]) {
  const mean = values.reduce((n, v) => n + v, 0) / values.length;
  const deviation = Math.sqrt(
    values.reduce((n, v) => n + (v - mean) ** 2, 0) / values.length,
  );
  return { mean, deviation };
}
export function priceVolume(
  candles: readonly MarketCandle[],
  index = candles.length - 1,
): PriceVolume | null {
  const c = candles[index];
  if (!c) return null;
  const prev = candles[index - 1],
    prior = candles.slice(Math.max(0, index - ANALYSIS_RULES.baseline), index);
  const valid = (v: MarketCandle) =>
    [v.open, v.high, v.low, v.close, v.volume].every(Number.isFinite) &&
    v.close > 0 &&
    v.low > 0 &&
    v.high >= Math.max(v.open, v.close) &&
    v.low <= Math.min(v.open, v.close) &&
    v.volume >= 0;
  const sufficient =
    prior.length === ANALYSIS_RULES.baseline && [...prior, c].every(valid);
  const change = prev?.close > 0 ? c.close / prev.close - 1 : null;
  const anomaly = [...prior, c].some(
    (v, i, all) =>
      i > 0 &&
      Math.abs(v.close / all[i - 1].close - 1) > ANALYSIS_RULES.anomalyReturn,
  );
  const stats = sufficient ? baseline(prior.map((v) => v.volume)) : null;
  const relativeVolume = stats && stats.mean > 0 ? c.volume / stats.mean : null;
  const z =
    stats && stats.deviation > 0
      ? (c.volume - stats.mean) / stats.deviation
      : null;
  const atr = sufficient
    ? prior.reduce(
        (n, v, i) =>
          n +
          Math.max(
            v.high - v.low,
            Math.abs(
              v.high -
                (i
                  ? prior[i - 1].close
                  : (candles[index - ANALYSIS_RULES.baseline - 1]?.close ??
                    v.open)),
            ),
            Math.abs(
              v.low -
                (i
                  ? prior[i - 1].close
                  : (candles[index - ANALYSIS_RULES.baseline - 1]?.close ??
                    v.open)),
            ),
          ),
        0,
      ) / prior.length
    : null;
  const range = c.high - c.low;
  const up = (change ?? 0) > 0,
    high = (relativeVolume ?? 0) >= 1;
  const explanation = !sufficient
    ? "Insufficient baseline: 20 prior bars required."
    : anomaly
      ? "Large price discontinuity: corporate action or data anomaly is unverified; alerts suppressed."
      : change === 0
        ? "Flat close; inspect range and broker context."
        : up
          ? high
            ? "Rising price with above-baseline participation."
            : "Rising price with weak participation or supply contraction; context dependent."
          : high
            ? "Falling price with elevated participation: selling pressure or capitulation, not verified aggressor volume."
            : "Falling price with lower participation: weak demand or declining selling pressure; not an uptrend signal.";
  return {
    timestamp: c.time,
    sufficient,
    anomaly,
    priceReturn: change,
    rollingReturn: sufficient ? c.close / prior[0].close - 1 : null,
    volume: c.volume,
    averageVolume: stats?.mean ?? null,
    relativeVolume,
    volumeZScore: z,
    atr,
    rangeExpansion: atr && atr > 0 ? range / atr : null,
    progressPerVolume:
      prev && c.volume > 0 ? Math.abs(c.close - prev.close) / c.volume : null,
    upperWick: range > 0 ? (c.high - Math.max(c.open, c.close)) / range : 0,
    lowerWick: range > 0 ? (Math.min(c.open, c.close) - c.low) / range : 0,
    breakout: sufficient && c.close > Math.max(...prior.map((v) => v.high)),
    breakdown: sufficient && c.close < Math.min(...prior.map((v) => v.low)),
    divergence: sufficient && ((up && !high) || (!up && high)),
    explanation,
    turnover: null,
    freeFloatTurnover: null,
    vwapDistance: null,
  };
}
