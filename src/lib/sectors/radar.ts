import "server-only";
import { unstable_cache } from "next/cache";
import { sectorsFetch } from "./client";
import {
  foreignFlowSchema,
  mostTradedSchema,
  topMoversSchema,
} from "./schemas";

export const getRadarMovers = unstable_cache(
  async () =>
    topMoversSchema.parse(
      await sectorsFetch(
        "/companies/top-changes/?n_stock=10&classifications=top_gainers%2Ctop_losers&periods=1d&min_mcap_billion=1000",
      ),
    ),
  ["sectors-radar-movers-v1"],
  { revalidate: 300 },
);

export const getRadarMostTraded = unstable_cache(
  async () =>
    mostTradedSchema.parse(
      await sectorsFetch("/most-traded/?adjusted=true&n_stock=10"),
    ),
  ["sectors-radar-most-traded-v1"],
  { revalidate: 300 },
);

const getRadarForeignFlow = unstable_cache(
  async (ticker: string) =>
    foreignFlowSchema.parse(
      await sectorsFetch(`/foreign-flow/${encodeURIComponent(ticker)}/`),
    ),
  ["sectors-radar-foreign-flow-v1"],
  { revalidate: 900 },
);

export async function getLatestRadarForeignFlow(ticker: string) {
  const data = await getRadarForeignFlow(ticker);
  const row = [...data.data].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return row
    ? {
        date: row.date,
        net: row.net_foreign_inflow ?? null,
        share: row.foreign_share ?? null,
      }
    : null;
}
