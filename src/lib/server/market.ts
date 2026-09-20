import "server-only";
import { demoMode } from "./mode";
import type { MarketRepository } from "@/lib/repositories/market-repository";
// The sole composition boundary. Future provider + persistence implementations belong here.
// No network, environment secrets, or provider contracts are present in this phase.
export const marketRepository: MarketRepository = {
  async listStocks() {
    if (!demoMode)
      throw new Error("Demo repository requires FLOWPHASE_MODE=demo");
    return (
      await import("../repositories/demo-repository")
    ).demoRepository.listStocks();
  },
  async getStock(ticker) {
    if (!demoMode)
      throw new Error("Demo repository requires FLOWPHASE_MODE=demo");
    return (
      await import("../repositories/demo-repository")
    ).demoRepository.getStock(ticker);
  },
};
