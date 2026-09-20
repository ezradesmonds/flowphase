import type { MarketCandle, Timeframe } from "@/domain/chart-market";
import type { MarketPhase, PhaseRegion } from "@/domain/market";

export const PHASE_LOOKBACK = 20;
export const MIN_PHASE_BARS = 3;
export interface PhaseObservation {
  tags?: string[];
  phase: MarketPhase;
  confidence: number;
  evidence: string[];
}
const unknown = (): PhaseObservation => ({
  phase: "UNCLASSIFIED",
  confidence: 0,
  evidence: [],
});
const score = (value: number) => Math.round(Math.max(50, Math.min(95, value)));

/** Trailing OHLCV heuristic, not a trained model or a broker-ownership inference. */
export function classifyCandle(
  candles: readonly MarketCandle[],
  index: number,
): PhaseObservation {
  if (index < PHASE_LOOKBACK || index >= candles.length) return unknown();
  const window = candles.slice(index - PHASE_LOOKBACK + 1, index + 1);
  const previous = candles[index - PHASE_LOOKBACK];
  let trueRange = 0,
    travel = 0,
    pressure = 0,
    volume = 0;
  window.forEach((c, i) => {
    const prev = i ? window[i - 1] : previous;
    trueRange += Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close),
    );
    travel += Math.abs(c.close - prev.close);
    volume += c.volume;
    pressure +=
      c.high > c.low
        ? ((2 * c.close - c.high - c.low) / (c.high - c.low)) * c.volume
        : 0;
  });
  const atr = trueRange / PHASE_LOOKBACK;
  if (atr <= 0 || travel === 0 || volume === 0) return unknown();
  const latest = window.at(-1)!;
  const drift = (latest.close - previous.close) / atr;
  const efficiency = Math.abs(latest.close - previous.close) / travel;
  const flowProxy = pressure / volume;
  const baselineVolume =
    candles
      .slice(index - PHASE_LOOKBACK, index)
      .reduce((sum, c) => sum + c.volume, 0) / PHASE_LOOKBACK;
  const relativeVolume =
    baselineVolume > 0 ? latest.volume / baselineVolume : 0;
  const range =
    (Math.max(...window.map((c) => c.high)) -
      Math.min(...window.map((c) => c.low))) /
    atr;
  const evidence = [
    `20-bar movement: ${drift.toFixed(2)} ATR; directional efficiency: ${(efficiency * 100).toFixed(0)}%.`,
    `Relative volume: ${relativeVolume.toFixed(2)}×; volume-weighted close-location proxy: ${flowProxy.toFixed(2)}.`,
  ];
  if (drift >= 5 && efficiency >= 0.6 && relativeVolume >= 1.6)
    return {
      phase: "MARKUP",
      tags: ["EUPHORIA_RISK"],
      confidence: score(
        65 + Math.min(drift, 10) + Math.min(relativeVolume, 3) * 5,
      ),
      evidence,
    };
  if (drift >= 1.8 && efficiency >= 0.35)
    return {
      phase: "MARKUP",
      confidence: score(55 + efficiency * 25 + Math.min(drift, 10)),
      evidence,
    };
  if (drift <= -1.8 && efficiency >= 0.35)
    return {
      phase: "MARKDOWN",
      confidence: score(55 + efficiency * 25 + Math.min(-drift, 10)),
      evidence,
    };
  if (efficiency < 0.35 && range <= 10 && Math.abs(flowProxy) >= 0.1)
    return {
      phase: flowProxy > 0 ? "ACCUMULATION" : "DISTRIBUTION",
      confidence: score(55 + (1 - efficiency) * 15 + Math.abs(flowProxy) * 20),
      evidence: [
        ...evidence,
        `Consolidation width: ${range.toFixed(2)} ATR. Phase is a price/volume proxy, not verified broker activity.`,
      ],
    };
  return unknown();
}

/** Fail closed on malformed or unsorted snapshots; never connect across missing bars. */
function validCandles(candles: readonly MarketCandle[]) {
  return candles.every(
    (c, i) =>
      [c.time, c.open, c.high, c.low, c.close, c.volume].every(
        Number.isFinite,
      ) &&
      c.time > 0 &&
      c.low >= 0 &&
      c.volume >= 0 &&
      c.high >= Math.max(c.open, c.close) &&
      c.low <= Math.min(c.open, c.close) &&
      (!i || c.time > candles[i - 1].time),
  );
}
export function detectPhaseRegions(
  ticker: string,
  timeframe: Timeframe,
  candles: readonly MarketCandle[],
): PhaseRegion[] {
  if (!validCandles(candles)) return [];
  const regions: PhaseRegion[] = [];
  let start = PHASE_LOOKBACK;
  let observations: PhaseObservation[] = [];
  const flush = (end: number) => {
    const first = observations[0];
    if (
      !first ||
      first.phase === "UNCLASSIFIED" ||
      observations.length < MIN_PHASE_BARS
    )
      return;
    // Confirmation begins on the third matching bar; never backpaint the first two.
    const bars = candles.slice(start + MIN_PHASE_BARS - 1, end + 1);
    regions.push({
      id: `${ticker.toUpperCase()}:${timeframe}:${first.phase}:${bars[0].time}`,
      ticker: ticker.toUpperCase(),
      phase: first.phase,
      tags: observations.at(-1)!.tags ?? [],
      active: end === candles.length - 1,
      brokerEvidence: "PRICE_VOLUME_ONLY",
      startTimestamp: bars[0].time,
      endTimestamp: bars.at(-1)!.time,
      startPrice: bars[0].open,
      endPrice: bars.at(-1)!.close,
      lowPrice: Math.min(...bars.map((c) => c.low)),
      highPrice: Math.max(...bars.map((c) => c.high)),
      confidence: Math.round(
        observations.reduce((sum, o) => sum + o.confidence, 0) /
          observations.length,
      ),
      evidence: [
        `${bars.length} consecutive ${timeframe} bars; trailing ${PHASE_LOOKBACK}-bar OHLCV rules.`,
        ...observations.at(-1)!.evidence,
      ],
      warnings: [
        "Heuristic confidence is a rule-strength score, not a calibrated probability.",
        "Region starts at confirmation, after three matching bars. Earlier transition bars stay uncolored.",
        "Loaded-history boundaries affect detection. OHLCV determines the phase; any broker support is separate evidence.",
        ...(end === candles.length - 1
          ? ["Latest region is provisional; the current candle may change."]
          : []),
      ],
      status: "CALCULATED",
    });
  };
  for (let i = PHASE_LOOKBACK; i < candles.length; i++) {
    const next = classifyCandle(candles, i);
    if (observations.length && next.phase !== observations[0].phase) {
      flush(i - 1);
      observations = [];
      start = i;
    }
    observations.push(next);
  }
  flush(candles.length - 1);
  return regions;
}
