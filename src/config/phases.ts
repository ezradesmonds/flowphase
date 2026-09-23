import type { PrimaryPhase } from "@/domain/market";

export const ALGORITHM_VERSION = "remora-phases-2.0.0";
export const PHASE_CONFIG = {
  version: "research-defaults-2.0.0",
  baseline: 20,
  normalizationHistory: 120,
  minimumBucketHistory: 8,
  confirmationBars: 3,
  minimumDuration: 3,
  hysteresis: 6,
  ambiguityMargin: 7,
  minimumScore: 46,
  changePointThreshold: 25,
  crossingPenalty: 35,
  crossingWarningRatio: 10,
  materialFlowFraction: 0.1,
  sharesPerLot: 100,
  maxOhlcvConfidence: 35,
  staleAfterDays: 7,
  liquidity: { lowBelowIdr: 1_000_000_000, highAboveIdr: 20_000_000_000 },
  weights: {
    AKUMULASI: {
      concentratedNetBuy: 2,
      inventoryGrowth: 2,
      sellerDispersion: 1,
      retailExit: 1,
      absorption: 1,
      controlledPriceImpact: 1,
      lowVolumeCorrection: 1,
    },
    POMPOM: {
      attentionGrowth: 1,
      frequencyGrowth: 1,
      volumeGrowth: 1,
      participantBroadening: 1,
      breakoutAttempt: 1,
      retailInterestGrowth: 1,
      retainedInventory: 1,
      narrative: 1,
    },
    MENGGORENG: {
      extremeReturn: 2,
      extremeVolume: 1,
      volatilityExpansion: 1,
      distanceFromBase: 1,
      retailFomo: 1,
      frequencyAnomaly: 1,
      rapidPriceLevelConsumption: 1,
    },
    DISTRIBUSI: {
      previousAccumulatorNetSell: 2,
      inventoryDepletion: 2,
      sellerConcentration: 1,
      buyerDispersion: 1,
      retailAbsorption: 1,
      supplyNearHigh: 1,
      failedBreakout: 1,
    },
  } satisfies Record<PrimaryPhase, Record<string, number>>,
};
export type PhaseConfig = typeof PHASE_CONFIG;
export type FeatureKey = {
  [P in PrimaryPhase]: keyof (typeof PHASE_CONFIG.weights)[P];
}[PrimaryPhase];
export type PhaseFeatures = Record<FeatureKey, number | null>;
export const PRIMARY_PHASES: PrimaryPhase[] = [
  "AKUMULASI",
  "POMPOM",
  "MENGGORENG",
  "DISTRIBUSI",
];
