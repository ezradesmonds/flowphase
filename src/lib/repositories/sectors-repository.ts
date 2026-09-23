import "server-only";
import { unstable_cache } from "next/cache";
import type { BrokerSnapshot, StockUniverse } from "@/domain/securities";
import type { SecuritiesRepository } from "./securities-repository";
import { sectorsFetch, SectorsError } from "../sectors/client";
import { loadAllCompanies } from "../sectors/universe";
import { freeFloatSchema, brokerSchema } from "../sectors/schemas";
const getUniverse = unstable_cache(
  async (): Promise<StockUniverse> => {
    const stocks = await loadAllCompanies(sectorsFetch, "sub_sector");
    const warnings: string[] = [];
    const [sectors, floats] = await Promise.allSettled([
      loadAllCompanies(sectorsFetch, "sector"),
      sectorsFetch("/free-float/").then((value) =>
        freeFloatSchema.parse(value),
      ),
    ]);
    if (sectors.status === "fulfilled") {
      const map = new Map(sectors.value.map((s) => [s.ticker, s.sector]));
      for (const stock of stocks) stock.sector = map.get(stock.ticker) ?? null;
    } else
      warnings.push("Sector classification is unavailable for this refresh.");
    if (floats.status === "fulfilled") {
      const map = new Map(floats.value.map((s) => [s.symbol, s.free_float]));
      for (const stock of stocks)
        stock.freeFloat = map.get(stock.ticker) ?? null;
    } else warnings.push("Free-float data is unavailable for this refresh.");
    return {
      stocks,
      total: stocks.length,
      fetchedAt: new Date().toISOString(),
      warnings,
    };
  },
  ["sectors-idx-universe-v1"],
  { revalidate: 86400 },
);
let pending: Promise<StockUniverse> | undefined;
const getBrokers = unstable_cache(
  async (ticker: string): Promise<BrokerSnapshot> => {
    const empty = {
      ticker,
      start: "",
      end: "",
      fetchedAt: new Date().toISOString(),
      flows: [],
    };
    try {
      const data = brokerSchema.parse(
        await sectorsFetch(`/broker-summary/${encodeURIComponent(ticker)}/`),
      );
      if (data.symbol !== ticker) throw new Error("Mismatched symbol");
      return {
        ...empty,
        start: data.start,
        end: data.end,
        unavailableReason: null,
        flows: data.data.flatMap((day) =>
          day.summary.map((row) => ({
            ticker,
            date: day.date,
            brokerCode: row.broker_code,
            buyLot: row.blot,
            sellLot: row.slot,
            buyValue: row.bval ?? undefined,
            sellValue: row.sval ?? undefined,
            averageBuy: row.bavg_per_share ?? undefined,
            averageSell: row.savg_per_share ?? undefined,
            buyFrequency: row.bfreq ?? undefined,
            sellFrequency: row.sfreq ?? undefined,
            foreignBuyFrequency: row.f_bfreq ?? undefined,
            foreignSellFrequency: row.f_sfreq ?? undefined,
            foreignBuyLot: row.f_blot ?? undefined,
            foreignSellLot: row.f_slot ?? undefined,
            foreignBuyValue: row.f_bval ?? undefined,
            foreignSellValue: row.f_sval ?? undefined,
          })),
        ),
      };
    } catch (error) {
      return {
        ...empty,
        unavailableReason:
          error instanceof SectorsError
            ? error.message
            : "Broker data is unavailable or failed validation.",
      };
    }
  },
  ["sectors-brokers-v1"],
  { revalidate: 300 },
);
export const sectorsRepository: SecuritiesRepository = {
  listStocks() {
    pending ??= getUniverse().finally(() => {
      pending = undefined;
    });
    return pending;
  },
  async brokerFlow(ticker) {
    if (!/^[A-Z]{4}$/.test(ticker)) throw new Error("Invalid ticker");
    return getBrokers(ticker);
  },
};
