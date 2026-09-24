import type { MarketPhase, PhaseRegion } from "./market";

export type RadarTriggerType = "MOST_TRADED" | "TOP_GAINER" | "TOP_LOSER";

export interface RadarTrigger {
  type: RadarTriggerType;
  rank: number;
  label: string;
  value: number;
  date: string;
}

export interface RadarForeignFlow {
  date: string;
  net: number | null;
  share: number | null;
}

export interface RadarCandidate {
  ticker: string;
  companyName: string;
  sector: string | null;
  subsector: string | null;
  close: number | null;
  marketDate: string | null;
  triggers: RadarTrigger[];
  discoveryStrength: number;
  bestRank: number;
  foreignFlow: RadarForeignFlow | null;
  analysis: {
    ticker: string;
    state: MarketPhase;
    confidence: number;
    evidenceBasis: NonNullable<PhaseRegion["brokerEvidence"]>;
    calculatedAt: string;
  } | null;
}

export interface RadarSnapshot {
  fetchedAt: string;
  marketDate: string | null;
  candidates: RadarCandidate[];
  warnings: string[];
  sources: string[];
  methodology: string;
}
