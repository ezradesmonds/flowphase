import type { BrokerFlow } from "./market";
export interface IdxStock {
  ticker: string;
  companyName: string;
  sector: string | null;
  subsector: string | null;
  freeFloat: number | null;
  source: "SECTORS";
}
export interface StockUniverse {
  stocks: IdxStock[];
  fetchedAt: string;
  total: number;
  warnings: string[];
}
export interface BrokerSnapshot {
  ticker: string;
  start: string;
  end: string;
  fetchedAt: string;
  flows: BrokerFlow[];
  unavailableReason: string | null;
}
