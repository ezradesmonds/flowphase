export const TIMEFRAMES = ["1", "5", "15", "60", "1D", "1W"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];
export interface MarketCandle {
  /** UTC Unix seconds; daily bars retain the provider's session timestamp. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface CandleRequest {
  ticker: string;
  timeframe: Timeframe;
  limit: number;
}
export interface CandleSnapshot extends CandleRequest {
  symbol: string;
  source: "TRADINGVIEW" | "DEMO_FIXTURE";
  fetchedAt: string;
  /** Transport updates do not establish exchange realtime entitlement. */
  delay: "UNKNOWN";
  candles: MarketCandle[];
}
