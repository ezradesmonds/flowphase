import type { MarketCandle, Timeframe } from "@/domain/chart-market";
import type {
  MarketPhase,
  PhaseRegion,
  PrimaryPhase,
  PhaseEvidence,
} from "@/domain/market";
import {
  ALGORITHM_VERSION,
  PHASE_CONFIG,
  PRIMARY_PHASES,
  type PhaseConfig,
  type FeatureKey,
} from "@/config/phases";
import {
  buildFeatureFrames,
  clamp,
  type FeatureFrame,
  type FeatureOptions,
} from "./features";
export const PHASE_LOOKBACK = PHASE_CONFIG.baseline;
export const MIN_PHASE_BARS = PHASE_CONFIG.confirmationBars;
export interface PhaseObservation {
  phase: MarketPhase;
  confidence: number;
  coverage: number;
  quality: number;
  label: string;
  scores: Record<PrimaryPhase, number>;
  evidence: string[];
  evidenceItems: PhaseEvidence[];
  againstEvidence: PhaseEvidence[];
}
export function scoreFrame(
  frame: FeatureFrame,
  config: PhaseConfig = PHASE_CONFIG,
): PhaseObservation {
  const scores = Object.fromEntries(
    PRIMARY_PHASES.map((phase) => {
      const weights = Object.entries(config.weights[phase]) as [
        FeatureKey,
        number,
      ][];
      let sum = 0,
        available = 0;
      for (const [key, weight] of weights) {
        const value = frame.features[key];
        if (value !== null) {
          sum += value * weight;
          available += weight;
        }
      }
      let score = available ? sum / available : 0;
      if (phase === "AKUMULASI" || phase === "DISTRIBUSI")
        score -= frame.crossingRisk * config.crossingPenalty;
      if (
        phase === "AKUMULASI" &&
        (!frame.controlled ||
          (frame.brokerAvailable &&
            ((frame.features.inventoryGrowth ?? 0) <= 0 ||
              (frame.features.sellerDispersion ?? 0) < 45)))
      )
        score = Math.min(score, config.minimumScore - 1);
      if (
        phase === "DISTRIBUSI" &&
        frame.brokerAvailable &&
        (!frame.previousAccumulatorSelling ||
          (frame.features.inventoryDepletion ?? 0) < 15)
      )
        score = Math.min(score, config.minimumScore - 1);
      if (
        phase === "POMPOM" &&
        ((frame.features.attentionGrowth ?? 0) < 40 ||
          !frame.positiveSlope ||
          (frame.features.volumeGrowth ?? 0) <= 0)
      )
        score = Math.min(score, config.minimumScore - 1);
      if (
        phase === "MENGGORENG" &&
        (frame.priceReturn <= 0 ||
          (frame.features.extremeReturn ?? 0) < 80 ||
          Math.max(
            frame.features.extremeVolume ?? 0,
            frame.features.frequencyAnomaly ?? 0,
          ) < 70 ||
          frame.rangeExpansion <= 1)
      )
        score = Math.min(score, config.minimumScore - 1);
      return [phase, clamp(score)];
    }),
  ) as Record<PrimaryPhase, number>;
  const ranking = [...PRIMARY_PHASES].sort((a, b) => scores[b] - scores[a]);
  const top = ranking[0],
    margin = scores[top] - scores[ranking[1]];
  let phase: MarketPhase = !frame.sufficient
    ? "INSUFFICIENT_DATA"
    : scores[top] < config.minimumScore
      ? "UNCERTAIN"
      : margin < config.ambiguityMargin
        ? "TRANSITION"
        : top;
  if (
    frame.crossingRisk >= 0.8 &&
    (phase === "AKUMULASI" || phase === "DISTRIBUSI")
  )
    phase = "UNCERTAIN";
  const weights = Object.entries(config.weights[top]) as [FeatureKey, number][];
  const weightSum = weights.reduce((n, [, w]) => n + w, 0);
  const observedWeight = weights.reduce(
    (n, [key, w]) => n + (frame.features[key] !== null ? w : 0),
    0,
  );
  const coverage = frame.sufficient
    ? (observedWeight / weightSum) *
      (frame.brokerAvailable ? 0.8 + frame.brokerCoverage * 0.2 : 0.55)
    : 0;
  const quality = frame.quality * 0.9 * (top === "POMPOM" ? 0.8 : 1);
  const raw = scores[top] * (0.5 + 0.5 * Math.min(1, margin / 20));
  const confidence = Math.round(
    Math.min(
      frame.brokerAvailable ? 100 : config.maxOhlcvConfidence,
      raw * coverage * quality,
    ),
  );
  const label = !PRIMARY_PHASES.includes(phase as PrimaryPhase)
    ? phase.replaceAll("_", " ")
    : !frame.brokerAvailable
      ? "Price-Volume Phase Candidate — " + phase
      : phase === "POMPOM"
        ? "POMPOM CANDIDATE — market-attention proxy only"
        : phase + " Candidate";
  const againstEvidence = frame.evidence.filter(
    (e) => e.status === "UNAVAILABLE",
  );
  if (frame.crossingRisk > 0.5)
    againstEvidence.push({
      status: "INFERRED",
      feature: "crossing",
      description:
        "High gross-to-net activity; crossing may explain volume. Not proven matched trades.",
      value: frame.crossingRisk,
      source: "Sectors daily aggregates",
    });
  if (margin < config.ambiguityMargin)
    againstEvidence.push({
      status: "DERIVED",
      feature: "scoreMargin",
      description: "Two phase scores are close; classification is ambiguous.",
      value: margin,
      source: ALGORITHM_VERSION,
    });
  for (const [key] of weights)
    if (frame.features[key] !== null && frame.features[key]! < 25)
      againstEvidence.push({
        status: "DERIVED",
        feature: key,
        description: key + " provides weak or opposing support.",
        value: frame.features[key],
        source: ALGORITHM_VERSION,
      });
  const contributions: PhaseEvidence[] = weights
    .filter(([key]) => frame.features[key] !== null)
    .sort(
      ([a, wa], [b, wb]) => frame.features[b]! * wb - frame.features[a]! * wa,
    )
    .slice(0, 3)
    .map(([key]) => ({
      status: "DERIVED",
      feature: key,
      description:
        key +
        ": normalized support " +
        frame.features[key]!.toFixed(1) +
        "/100.",
      value: frame.features[key],
      source: ALGORITHM_VERSION,
    }));
  const evidenceItems = [
    ...contributions,
    ...frame.evidence.filter((e) => e.status !== "UNAVAILABLE"),
    {
      status: "INFERRED" as const,
      feature: "phase",
      description: label,
      value: scores[top],
      source: ALGORITHM_VERSION,
    },
  ];
  return {
    phase,
    confidence,
    coverage,
    quality,
    label,
    scores,
    evidence: evidenceItems.map((e) => e.status + ": " + e.description),
    evidenceItems,
    againstEvidence,
  };
}
export function classifyCandle(
  candles: readonly MarketCandle[],
  index: number,
  options: FeatureOptions = {},
): PhaseObservation {
  const frames = buildFeatureFrames(candles.slice(0, index + 1), options);
  if (!frames.length)
    return {
      phase: "INSUFFICIENT_DATA",
      confidence: 0,
      coverage: 0,
      quality: 0,
      label: "INSUFFICIENT DATA",
      scores: { AKUMULASI: 0, POMPOM: 0, MENGGORENG: 0, DISTRIBUSI: 0 },
      evidence: [],
      evidenceItems: [],
      againstEvidence: [],
    };
  return scoreFrame(frames.at(-1)!, options.config);
}
export function validCandles(candles: readonly MarketCandle[]) {
  return candles.every(
    (c, i) =>
      [c.time, c.open, c.high, c.low, c.close, c.volume].every(
        Number.isFinite,
      ) &&
      c.time > 0 &&
      c.low > 0 &&
      c.volume >= 0 &&
      c.high >= Math.max(c.open, c.close) &&
      c.low <= Math.min(c.open, c.close) &&
      (!i || c.time > candles[i - 1].time),
  );
}
/** Online change points, confirmation and hysteresis. No backpainting or forced cycle. */
export function detectPhaseRegions(
  ticker: string,
  timeframe: Timeframe,
  candles: readonly MarketCandle[],
  options: FeatureOptions = {},
): PhaseRegion[] {
  if (!validCandles(candles)) return [];
  const config = options.config ?? PHASE_CONFIG;
  const frames = buildFeatureFrames(candles, {
    ...options,
    flows:
      timeframe === "1D"
        ? options.flows?.filter(
            (f) => f.ticker.toUpperCase() === ticker.toUpperCase(),
          )
        : [],
  });
  const regions: PhaseRegion[] = [];
  let stable: MarketPhase = "INSUFFICIENT_DATA",
    candidate: MarketPhase = "INSUFFICIENT_DATA",
    confirmation = 0,
    duration = 0,
    hadDistribution = false;
  let previous: PhaseObservation | undefined;
  frames.forEach((frame, i) => {
    const observation = scoreFrame(frame, config);
    let proposed = observation.phase;
    if (
      hadDistribution &&
      frame.breakdown &&
      !frame.positiveSlope &&
      frame.previousAccumulatorSelling &&
      (frame.features.inventoryDepletion ?? 0) >= 25
    )
      proposed = "POST_DISTRIBUTION_MARKDOWN";
    if (
      PRIMARY_PHASES.includes(stable as PrimaryPhase) &&
      PRIMARY_PHASES.includes(proposed as PrimaryPhase) &&
      proposed !== stable &&
      observation.scores[proposed as PrimaryPhase] <
        observation.scores[stable as PrimaryPhase] + config.hysteresis
    )
      proposed = stable;
    if (proposed === candidate) confirmation++;
    else {
      candidate = proposed;
      confirmation = 1;
    }
    if (
      proposed !== stable &&
      confirmation >= config.confirmationBars &&
      duration >= config.minimumDuration
    ) {
      stable = proposed;
      duration = 0;
    }
    const state: MarketPhase =
      stable === "INSUFFICIENT_DATA" && frame.sufficient
        ? "TRANSITION"
        : stable;
    if (state !== observation.phase && state !== "POST_DISTRIBUTION_MARKDOWN") {
      observation.confidence = Math.min(observation.confidence, 20);
      observation.againstEvidence.push({
        status: "INFERRED",
        feature: "pendingConfirmation",
        description:
          "Latest evidence differs from stable state; confirmation/hysteresis is pending.",
        value: null,
        source: ALGORITHM_VERSION,
      });
    }
    duration++;
    if (state === "DISTRIBUSI" && frame.brokerAvailable) hadDistribution = true;
    if (state === "AKUMULASI") hadDistribution = false;
    const changePoint =
      !!previous &&
      Math.max(
        ...PRIMARY_PHASES.map((p) =>
          Math.abs(observation.scores[p] - previous!.scores[p]),
        ),
      ) >= config.changePointThreshold;
    previous = observation;
    const prior = regions.at(-1),
      c = candles[i];
    const changedEvidence =
      prior &&
      (prior.brokerEvidence === "BROKER_SUPPORTED") !== frame.brokerAvailable;
    const newSegment =
      !prior ||
      prior.phase !== state ||
      (changePoint &&
        changedEvidence &&
        frame.sufficient &&
        duration >= config.minimumDuration);
    const label =
      state === "POST_DISTRIBUTION_MARKDOWN"
        ? "Post-Distribution Markdown"
        : state !== observation.phase
          ? PRIMARY_PHASES.includes(state as PrimaryPhase)
            ? (!frame.brokerAvailable
                ? "Price-Volume Phase Candidate — "
                : "") +
              state +
              " Candidate (pending evidence)"
            : state
          : observation.label;
    if (newSegment)
      regions.push({
        id: ticker.toUpperCase() + ":" + timeframe + ":" + state + ":" + c.time,
        ticker: ticker.toUpperCase(),
        phase: state,
        marketCondition:
          state === "POST_DISTRIBUTION_MARKDOWN"
            ? "POST_DISTRIBUTION_MARKDOWN"
            : "NONE",
        label,
        startTimestamp: c.time,
        endTimestamp: c.time,
        startPrice: c.open,
        endPrice: c.close,
        lowPrice: c.low,
        highPrice: c.high,
        confidence: state === "INSUFFICIENT_DATA" ? 0 : observation.confidence,
        coverage: observation.coverage,
        dataQualityFactor: observation.quality,
        algorithmVersion: ALGORITHM_VERSION,
        configVersion: config.version,
        scores: observation.scores,
        evidence: observation.evidence,
        evidenceItems: observation.evidenceItems,
        againstEvidence: observation.againstEvidence,
        liquidityBucket: frame.bucket,
        changePoint,
        brokerEvidence: frame.brokerAvailable
          ? "BROKER_SUPPORTED"
          : frame.sufficient
            ? "PRICE_VOLUME_ONLY"
            : "INSUFFICIENT_DATA",
        warnings: [
          "Research candidates, not calibrated probabilities.",
          "Unknown opening inventory; net changes are not holdings.",
          "No verified narrative, tick or order-book evidence.",
          ...(!frame.availabilityKnown
            ? [
                "Broker publication times unknown; retrospective evidence is not a point-in-time backtest.",
              ]
            : []),
        ],
        status: "CALCULATED",
        active: false,
      });
    else {
      prior.endTimestamp = c.time;
      prior.endPrice = c.close;
      prior.lowPrice = Math.min(prior.lowPrice, c.low);
      prior.highPrice = Math.max(prior.highPrice, c.high);
      prior.confidence = observation.confidence;
      prior.coverage = observation.coverage;
      prior.dataQualityFactor = observation.quality;
      prior.scores = observation.scores;
      prior.evidence = observation.evidence;
      prior.evidenceItems = observation.evidenceItems;
      prior.againstEvidence = observation.againstEvidence;
      prior.label = label;
      prior.brokerEvidence = frame.brokerAvailable
        ? "BROKER_SUPPORTED"
        : frame.sufficient
          ? "PRICE_VOLUME_ONLY"
          : "INSUFFICIENT_DATA";
    }
  });
  if (regions.length) regions.at(-1)!.active = true;
  return regions;
}
