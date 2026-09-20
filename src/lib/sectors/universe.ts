import type { IdxStock } from "@/domain/securities";
import { companiesPageSchema } from "./schemas";
export type SectorsFetch = (path: string) => Promise<unknown>;
/** Follow verified pagination; an incomplete universe is an error, never a short fallback list. */
export async function loadAllCompanies(
  fetcher: SectorsFetch,
  field: "sector" | "sub_sector",
): Promise<IdxStock[]> {
  const stocks = new Map<string, IdxStock>();
  let offset = 0,
    total: number | undefined;
  for (let page = 0; page < 100; page++) {
    const parsed = companiesPageSchema.parse(
      await fetcher(
        `/companies/?limit=200&offset=${offset}&order_by=${field}&include_query_values=true`,
      ),
    );
    if (
      parsed.pagination.offset !== offset ||
      (total !== undefined && total !== parsed.pagination.total_count)
    )
      throw new Error("Universe changed during pagination. Please retry.");
    total = parsed.pagination.total_count;
    for (const row of parsed.results) {
      if (stocks.has(row.symbol))
        throw new Error("Duplicate company in paginated universe.");
      stocks.set(row.symbol, {
        ticker: row.symbol,
        companyName: row.company_name,
        sector: row.query_values?.sector || null,
        subsector: row.query_values?.sub_sector || null,
        freeFloat: null,
        source: "SECTORS",
      });
    }
    if (!parsed.pagination.has_next) {
      if (stocks.size !== total)
        throw new Error("Incomplete Sectors universe.");
      return [...stocks.values()].sort((a, b) =>
        a.ticker.localeCompare(b.ticker),
      );
    }
    const next = parsed.pagination.next_offset;
    if (next === null || next <= offset || !parsed.results.length)
      throw new Error("Invalid pagination progress.");
    offset = next;
  }
  throw new Error("Universe pagination limit exceeded.");
}
