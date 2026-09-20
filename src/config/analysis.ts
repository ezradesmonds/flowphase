export const ANALYSIS_RULES = {
  baseline: 20,
  volume: {
    MEDIUM: { relative: 2, z: 2 },
    HIGH: { relative: 3, z: 3 },
    CRITICAL: { relative: 5, z: 4 },
  },
  brokerZ: 3,
  brokerRelative: 3,
  anomalyReturn: 0.4,
  cacheSeconds: 900,
  maxBatch: 5,
} as const;
export const TRANSACTION_CAPABILITY = {
  enabled: false,
  label: "Granular transaction data unavailable",
  missing: [
    "second-level transaction timestamp",
    "verified aggressor side",
    "lot size per transaction",
    "price per transaction",
    "transaction identifier",
  ],
  reason:
    "The integrated Sectors endpoint contains daily broker aggregates. Repeated daily net buys are not second-level stealth accumulation.",
} as const;
