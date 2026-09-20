import { demoStocks } from "@/data/demo";
import type { MarketRepository } from "./market-repository";
export const demoRepository: MarketRepository = {
  async listStocks() {
    return structuredClone(demoStocks.map((s) => s.scanner));
  },
  async getStock(ticker) {
    return structuredClone(
      demoStocks.find((s) => s.scanner.ticker === ticker.toUpperCase()) ?? null,
    );
  },
};
