import "server-only";
import { RULES } from "./model";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { sectorsFetch } from "@/lib/sectors/client";
import { sectorSymbol } from "@/lib/sectors/schemas";
import { sectorsRepository } from "@/lib/repositories/sectors-repository";
import { getIntelligence, listAnalyses } from "../store";
import { normalizeOwnership } from "./ownership";
import { inventoryByPhase } from "./inventory";
import { marketActivity } from "./market";
import {
  BROKER_AFFILIATIONS,
  VERIFIED_ENTITIES,
  VERIFIED_RELATIONS,
} from "@/config/relationships";
import { envelope, type Meta } from "./model";
import { persist, storedOwnership } from "./persistence";
export async function requireSymbol(symbol: string) {
  if (!/^[A-Z]{4}$/.test(symbol)) throw new Error("Invalid symbol");
  const universe = await sectorsRepository.listStocks();
  if (!universe.stocks.some((s) => s.ticker === symbol))
    throw new Error("Unsupported symbol");
}
export const ownership = unstable_cache(
  async (symbol: string) => {
    await requireSymbol(symbol);
    const fetchedAt = new Date().toISOString();
    const results = await Promise.allSettled([
      sectorsFetch(`/company/shareholders-composition/${symbol}/`),
      sectorsFetch(`/company/report/${symbol}/?sections=overview,ownership`),
    ]);
    const data = normalizeOwnership(
      symbol,
      results[0].status === "fulfilled" ? results[0].value : null,
      results[1].status === "fulfilled" ? results[1].value : null,
      fetchedAt,
    );
    if (results.some((r) => r.status === "rejected"))
      data.meta.quality_flags.push("PARTIAL_PROVIDER_FAILURE");
    data.nodes.push(...VERIFIED_ENTITIES);
    data.relations.push(...VERIFIED_RELATIONS);
    await persist("ownership_snapshots", symbol, data);
    return data;
  },
  ["remora-ownership-v3.1"],
  { revalidate: 3600 },
);
export async function phaseInventory(
  symbol: string,
  start?: string,
  end?: string,
) {
  await requireSymbol(symbol);
  const a = await getIntelligence(symbol),
    rows = inventoryByPhase(a, start, end, BROKER_AFFILIATIONS);
  await persist("broker_phase_snapshots", symbol, rows);
  return { analysis: a, rows };
}
export async function brokerUniverse() {
  const [analyses, universe] = await Promise.all([
    listAnalyses(),
    sectorsRepository.listStocks(),
  ]);
  return {
    rows: analyses.flatMap((a) =>
      inventoryByPhase(a, undefined, undefined, BROKER_AFFILIATIONS)
        .filter((r) => r.phase === "CUSTOM")
        .map((r) => ({
          ...r,
          company:
            universe.stocks.find((s) => s.ticker === r.symbol)?.companyName ??
            r.symbol,
          sector:
            universe.stocks.find((s) => s.ticker === r.symbol)?.sector ??
            "Unknown",
          currentPhase: a.state,
        })),
    ),
    coverage: analyses.length / universe.total,
    total: universe.total,
  };
}
export async function market() {
  const [analyses, universe] = await Promise.all([
    listAnalyses(),
    sectorsRepository.listStocks(),
  ]);
  const foreign: Record<
    string,
    { date: string; net: number | null; asOf: string }[]
  > = {};
  // Bound provider work to acquired coverage; never fan out across the whole IDX directory.
  for (const a of analyses.slice(0, RULES.marketForeignFetchLimit)) {
    try {
      const result = await foreignFlow(a.ticker);
      foreign[a.ticker] = result.rows.map((r) => ({
        date: r.date,
        net: r.net_foreign_inflow ?? null,
        asOf: result.fetchedAt,
      }));
    } catch {
      /* per-stock missing stays null */
    }
  }
  const data = marketActivity(analyses, universe.stocks, foreign);
  if (analyses.length > RULES.marketForeignFetchLimit)
    data.meta.quality_flags.push("FOREIGN_FETCH_LIMIT_REACHED");
  await persist("sector_snapshots", "market", data);
  return data;
}
const foreignSchema = z.object({
  symbol: sectorSymbol,
  data: z.array(
    z.object({
      date: z.iso.date(),
      foreign_buy_idr: z.number().finite().nonnegative().nullish(),
      foreign_sell_idr: z.number().finite().nonnegative().nullish(),
      net_foreign_inflow: z.number().finite().nullish(),
    }),
  ),
});
export const foreignFlow = unstable_cache(
  async (symbol: string) => {
    await requireSymbol(symbol);
    const raw = foreignSchema.parse(
      await sectorsFetch(`/foreign-flow/${symbol}/`),
    );
    if (raw.symbol !== symbol) throw new Error("Identity mismatch");
    return {
      rows: raw.data,
      source: "Sectors /foreign-flow/",
      fetchedAt: new Date().toISOString(),
      qualityFlags: ["INVESTOR_ORIGIN_NOT_BROKER_AFFILIATION"],
    };
  },
  ["remora-foreign-v3"],
  { revalidate: 900 },
);
export const unavailableMeta: Meta = {
  source: [],
  as_of: null,
  period_start: null,
  period_end: null,
  calculation_method: "no verified source",
  data_status: "UNAVAILABLE",
  confidence: 0,
  quality_flags: ["SOURCE_UNAVAILABLE"],
};
export { envelope, storedOwnership };
