import type { ScannerResult, StockDetail } from "@/domain/market";
/** The UI receives domain objects, never provider payloads. */
export interface MarketRepository {
  listStocks(): Promise<ScannerResult[]>;
  getStock(ticker: string): Promise<StockDetail | null>;
}
