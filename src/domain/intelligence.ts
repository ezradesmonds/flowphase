import type { MarketPhase, MarketCondition, PhaseRegion, PhaseEvidence } from "./market";
import type { CandleSnapshot } from "./chart-market";
import type { BrokerSnapshot } from "./securities";
export const CORE_PHASES = [
  "AKUMULASI",
  "POMPOM",
  "MENGGORENG",
  "DISTRIBUSI",
] as const;
export type BrokerClassification =
  "RETAIL_ACCESSIBLE" | "INSTITUTIONAL_ASSOCIATED" | "MIXED_OR_UNKNOWN";
export interface BrokerProfile {
  effectiveFrom?: string;
  effectiveTo?: string | null;
  symbol?: string;
  brokerCode: string;
  classification: BrokerClassification;
  source: "USER_HEURISTIC" | "VERIFIED_METADATA" | "BEHAVIORAL_MODEL";
  confidence: number;
  notes: string;
  enabled: boolean;
}
export interface MarketCycle {
  id: string;
  ticker: string;
  startTimestamp: number;
  endTimestamp: number | null;
  status: "ACTIVE" | "COMPLETE" | "INCOMPLETE";
  phases: PhaseRegion[];
  evidenceStatus:
    "PRICE_VOLUME_ONLY" | "BROKER_SUPPORTED" | "INSUFFICIENT_DATA";
}
export type AlertType =
  | "ACCUMULATION_CANDIDATE" | "POMPOM_ATTENTION_CANDIDATE" | "AGGRESSIVE_MARKUP_CANDIDATE"
  | "DISTRIBUTION_CANDIDATE" | "POST_DISTRIBUTION_MARKDOWN" | "CONCENTRATED_NET_BUY"
  | "CONCENTRATED_NET_SELL" | "INVENTORY_GROWTH" | "INVENTORY_DEPLETION" | "RETAIL_ABSORPTION"
  | "EXTREME_VOLUME" | "EXTREME_BUY_EXECUTION" | "EXTREME_SELL_EXECUTION" | "SUSPECTED_CROSSING"
  | "SUSPECTED_SPLIT_EXECUTION" | "SAME_SECOND_BURST" | "BID_REPLENISHMENT" | "FAILED_BREAKOUT"
  | "PHASE_TRANSITION" | "INSUFFICIENT_DATA"
  | "ABNORMAL_TOTAL_VOLUME"
  | "VOLUME_WITHOUT_PRICE_PROGRESS"
  | "HIGH_VOLUME_BREAKOUT"
  | "HIGH_VOLUME_BREAKDOWN"
  | "INSTITUTIONAL_BLOCK_FLOW"
  | "UNUSUAL_NET_SELL";
export interface MarketAlert {
  actualValue: number | null;
  baseline: number | null;
  coverage: number;
  link: string;
  evidenceItems: PhaseEvidence[];
  id: string;
  ticker: string;
  timestamp: number;
  type: AlertType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  brokerCode: string | null;
  brokerClassification: BrokerClassification | null;
  lotAmount: number | null;
  estimatedValue: number | null;
  confidence: number;
  evidence: string[];
  warnings: string[];
  dataSource: string[];
  status: "NEW" | "ACKNOWLEDGED" | "EXPIRED";
  phase: MarketPhase | "TRANSITION";
}
export interface InventoryRow {
  ticker: string;
  brokerCode: string;
  profile: BrokerProfile;
  periodStart: string;
  periodEnd: string;
  grossBuyLot: number;
  grossSellLot: number;
  grossBuyValue: number | null;
  grossSellValue: number | null;
  netValue: number | null;
  cumulativeNetLot: number;
  peakEstimatedInventory: number | null;
  estimatedRemainingInventory: number | null;
  inventoryReduction: number | null;
  observedPeakNetLot: number;
  observedNetDepletionRatio: number | null;
  inventoryDepletionRatio: number | null;
  grossToNetRatio: number;
  crossingRisk: number;
  crossingWarning: boolean;
  firstAccumulationDate: string | null;
  lastMaterialBuyDate: string | null;
  lastMaterialSellDate: string | null;
  movingAverageCost: number | null;
  costBasisMethod: "MOVING_WEIGHTED_AVERAGE";
  openingInventoryLot: number | null;
  remainingRatio: number | null;
  weightedAverageBuyPrice: number | null;
  weightedAverageSellPrice: number | null;
  firstBuyDate: string | null;
  lastBuyDate: string | null;
  firstSellDate: string | null;
  lastSellDate: string | null;
  buyConsistency: number;
  sellConsistency: number;
  activeTradingDays: number;
  estimatedMarketValue: number | null;
  role: string;
  startingInventory: "UNKNOWN" | "SUPPLIED_ESTIMATE";
  history: { date: string; net: number; running: number }[];
}
export interface PriceVolume {
  timestamp: number;
  sufficient: boolean;
  anomaly: boolean;
  priceReturn: number | null;
  rollingReturn: number | null;
  volume: number;
  averageVolume: number | null;
  relativeVolume: number | null;
  volumeZScore: number | null;
  atr: number | null;
  rangeExpansion: number | null;
  progressPerVolume: number | null;
  upperWick: number;
  lowerWick: number;
  breakout: boolean;
  breakdown: boolean;
  divergence: boolean;
  explanation: string;
  turnover: null;
  freeFloatTurnover: null;
  vwapDistance: null;
}
export interface FlowGroup {
  classification: BrokerClassification;
  netLot: number;
  netValue: number | null;
  brokers: number;
  remaining: number | null;
}
export interface Intelligence {
  version: 2;
  algorithmVersion: string;
  configVersion: string;
  marketCondition: MarketCondition;
  state: MarketPhase;
  coverage: number;
  dataQualityFactor: number;
  historyStatus: string;
  ticker: string;
  calculatedAt: string;
  candles: CandleSnapshot | null;
  broker: BrokerSnapshot;
  regions: PhaseRegion[];
  cycles: MarketCycle[];
  phase: MarketPhase | "TRANSITION";
  confidence: number;
  priceVolume: PriceVolume | null;
  inventory: InventoryRow[];
  groups: FlowGroup[];
  alerts: MarketAlert[];
  warnings: string[];
}
