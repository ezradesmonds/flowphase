import { z } from "zod";
import { sectorSymbol } from "@/lib/sectors/schemas";
import { metric, RULES, type Meta, type Entity, type Relation } from "./model";
const amount = z.number().finite().nonnegative().nullish();
const composition = z.object({
  symbol: sectorSymbol,
  data: z.array(
    z
      .object({
        date: z.iso.date(),
        shares_number: amount,
        numbers_of_shareholders: amount,
        total_l: amount,
        total_f: amount,
        individual_l: amount,
        individual_f: amount,
      })
      .catchall(z.unknown()),
  ),
});
const report = z.object({
  symbol: sectorSymbol,
  company_name: z.string().optional(),
  overview: z.object({ sector: z.string().nullish() }).optional(),
  ownership: z
    .object({
      major_shareholders: z
        .array(
          z.object({
            name: z.string(),
            share_amount: amount,
            share_percentage: z.union([z.number(), z.string()]).nullish(),
          }),
        )
        .nullish(),
      top_transactions: z
        .object({
          date: z.iso.date().nullish(),
          top_buyers: z.array(z.object({ name: z.string(), changeAmount: z.number().finite() })).nullish(),
          top_sellers: z.array(z.object({ name: z.string(), changeAmount: z.number().finite() })).nullish(),
        })
        .nullish(),
      institutional_transaction_flow: z
        .array(z.object({ date: z.iso.date(), net_transaction: z.number().finite() }))
        .nullish(),
      whale_investors: z.array(z.string()).nullish(),
      conglomerates_group: z.array(z.string()).nullish(),
    })
    .nullish(),
});
export function normalizeOwnership(
  symbol: string,
  rawComposition: unknown,
  rawReport: unknown,
  fetchedAt: string,
) {
  const c = rawComposition === null ? null : composition.parse(rawComposition),
    r = rawReport === null ? null : report.parse(rawReport);
  if ((c && c.symbol !== symbol) || (r && r.symbol !== symbol))
    throw new Error("Ownership identity mismatch");
  const meta: Meta = {
    source: [
      "Sectors /company/shareholders-composition/",
      "Sectors /company/report/?sections=overview,ownership",
    ],
    as_of: fetchedAt,
    period_start: null,
    period_end: null,
    calculation_method: "provider reported; dates are not publication dates",
    data_status: c || r ? "OBSERVED" : "UNAVAILABLE",
    confidence: c || r ? 60 : 0,
    quality_flags: [
      "PUBLICATION_DATE_UNKNOWN",
      "CATEGORY_TOTALS_MAY_NOT_RECONCILE",
      "NO_BENEFICIAL_OWNER_VERIFICATION",
    ],
  };
  const dates = new Set<string>();
  const history = (c?.data ?? [])
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => {
      if (dates.has(row.date)) throw new Error("Duplicate ownership period");
      dates.add(row.date);
      const m = { ...meta, period_start: row.date, period_end: row.date };
      const categories = Object.fromEntries(
        Object.entries(row)
          .filter(([k, v]) => /_(l|f)$/.test(k) && typeof v === "number")
          .map(([k, v]) => [
            k,
            metric(v as number, m, "provider category shares", "OBSERVED"),
          ]),
      );
      return {
        date: row.date,
        shares: metric(
          row.shares_number,
          m,
          "provider shares_number; outstanding basis unverified",
          "OBSERVED",
        ),
        shareholders: metric(
          row.numbers_of_shareholders,
          m,
          "provider reported shareholder count",
          "OBSERVED",
        ),
        categories,
      };
    });
  const nodes: Entity[] = [
    {
      id: "stock:" + symbol,
      name: r?.company_name ?? symbol,
      type: "PUBLIC_COMPANY",
      symbol,
    },
  ];
  const relations: Relation[] = [];
  const shareholders = (r?.ownership?.major_shareholders ?? []).map(
    (holder, i) => {
      // Scoped provider record ID deliberately prevents false cross-company name joins.
      const id = "disclosure:" + symbol + ":" + fetchedAt + ":" + i;
      const aggregate = /^(public|treasury stock)$/i.test(holder.name.trim());
      if (!aggregate)
        nodes.push({ id, name: holder.name, type: "UNKNOWN_ENTITY" });
      const rawPct = holder.share_percentage;
      const parsed =
        typeof rawPct === "number"
          ? rawPct
          : typeof rawPct === "string" && /^\s*\d+(\.\d+)?\s*%\s*$/.test(rawPct)
            ? Number(rawPct.replace("%", ""))
            : null;
      const ratio =
        typeof rawPct === "string" && /^\s*\d+(\.\d+)?\s*$/.test(rawPct)
          ? Number(rawPct)
          : typeof rawPct === "number"
            ? rawPct
            : null;
      const pct =
        typeof rawPct === "string" && rawPct.includes("%")
          ? parsed
          : ratio !== null && ratio >= 0 && ratio <= 1
            ? ratio * 100
            : null;
      if (!aggregate)
        relations.push({
          id: "relation:" + symbol + ":" + fetchedAt + ":" + i,
          from: id,
          to: "stock:" + symbol,
          type: "OWNS",
          category: "LEGAL OWNERSHIP",
          source: "Sectors company report: major_shareholders",
          effective_from: null,
          effective_to: null,
          ownership_percentage: pct,
          confidence: 60,
          verification_status: "PROVIDER_REPORTED",
          last_updated_at: fetchedAt,
        });
      return {
        id,
        aggregate,
        name: holder.name,
        shares: metric(
          holder.share_amount,
          meta,
          "reported share_amount",
          "OBSERVED",
        ),
        lots: metric(
          holder.share_amount == null
            ? null
            : holder.share_amount / RULES.sharesPerLot,
          meta,
          "reported shares / shares per lot",
        ),
        percentage: metric(
          pct,
          meta,
          "provider share_percentage fraction × 100 (explicit % strings retained); denominator not inferred",
          "OBSERVED",
        ),
      };
    },
  );
  return {
    symbol,
    meta,
    history,
    shareholders,
    nodes,
    relations,
    ownershipIntelligence: {
      topTransactions: r?.ownership?.top_transactions ?? null,
      institutionalFlow: r?.ownership?.institutional_transaction_flow ?? [],
      whaleInvestors: r?.ownership?.whale_investors ?? [],
      conglomerateGroups: r?.ownership?.conglomerates_group ?? [],
    },
    unavailable: [
      "total outstanding shares (verified basis)",
      ...(shareholders.some(
        (h) => h.aggregate && h.name.toLowerCase() === "treasury stock",
      )
        ? []
        : ["treasury shares"]),
      "government ownership",
      "controlling shareholder",
      "ultimate beneficial owner",
      "free-float history",
      "other listed holdings with resolved legal identity",
      "management and parent relationships",
    ],
  };
}
