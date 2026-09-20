import type { StockUniverse, BrokerSnapshot } from "@/domain/securities";
export interface SecuritiesRepository {
  listStocks(): Promise<StockUniverse>;
  brokerFlow(ticker: string): Promise<BrokerSnapshot>;
}
