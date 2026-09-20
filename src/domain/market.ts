export const PHASES = [
  "ACCUMULATION",
  "MARKUP",
  "EUPHORIA",
  "DISTRIBUTION",
  "MARKDOWN",
  "UNCLASSIFIED",
] as const;
export type MarketPhase = (typeof PHASES)[number];
export interface PhaseRegion {
  tags?: string[];
  active?: boolean;
  cycleId?: string;
  brokerEvidence?:
    "PRICE_VOLUME_ONLY" | "BROKER_SUPPORTED" | "INSUFFICIENT_DATA";
  id: string;
  ticker: string;
  phase: MarketPhase;
  startTimestamp: number;
  endTimestamp: number;
  startPrice: number;
  endPrice: number;
  lowPrice: number;
  highPrice: number;
  confidence: number;
  evidence: string[];
  warnings: string[];
  status: "DEMO" | "CALCULATED";
}
export interface DailyCandle {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value?: number;
}
export interface BrokerFlow {
  ticker: string;
  date: string;
  brokerCode: string;
  buyLot: number;
  sellLot: number;
  buyValue?: number;
  sellValue?: number;
  averageBuy?: number;
  averageSell?: number;
}
export interface BrokerInventoryEstimate {
  ticker: string;
  brokerCode: string;
  periodStart: string;
  periodEnd: string;
  cumulativeNetLot: number;
  peakEstimatedInventory: number;
  estimatedRemainingInventory: number;
  remainingRatio: number | null;
  averageAccumulationPrice?: number;
  role:
    | "DOMINANT_ACCUMULATOR"
    | "ACCUMULATOR"
    | "NEUTRAL"
    | "DISTRIBUTOR"
    | "DOMINANT_DISTRIBUTOR";
}
export interface PhaseResult {
  ticker: string;
  phase: MarketPhase;
  confidence: number;
  periodStart: string;
  periodEnd: string;
  evidence: string[];
  warnings: string[];
  dataQuality: "GOOD" | "PARTIAL" | "INSUFFICIENT";
}
export interface ScannerResult {
  ticker: string;
  companyName: string;
  sector?: string;
  currentPhase: MarketPhase;
  confidence: number;
  cycleStart: string;
  cumulativeNetFlow: number;
  remainingInventoryRatio: number | null;
  relativeVolume: number | null;
  distributionRisk: number;
  lastUpdated: string;
}
export interface DemoCycle {
  id: string;
  label: string;
  start: string;
  end: string;
  phase: MarketPhase;
  explanation: string;
}
export interface StockDetail {
  scanner: ScannerResult;
  candles: DailyCandle[];
  flows: BrokerFlow[];
  inventory: BrokerInventoryEstimate[];
  phase: PhaseResult;
  cycles: DemoCycle[];
  provenance: "DEMO_FIXTURE";
}
