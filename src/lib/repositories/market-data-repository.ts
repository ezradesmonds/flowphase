import type { CandleRequest, CandleSnapshot } from "@/domain/chart-market";
export interface MarketDataRepository {
  getCandles(
    request: CandleRequest,
    signal?: AbortSignal,
  ): Promise<CandleSnapshot>;
}
