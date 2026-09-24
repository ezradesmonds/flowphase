import "server-only";
import { sectorsRepository } from "@/lib/repositories/sectors-repository";
import { listAnalyses } from "@/lib/intelligence/store";
import { analysisSummary } from "@/lib/intelligence/summary";
import { buildRadarCandidates } from "@/lib/radar";
import type { RadarSnapshot } from "@/domain/radar";
import {
  getLatestRadarForeignFlow,
  getRadarMostTraded,
  getRadarMovers,
} from "@/lib/sectors/radar";

const FOREIGN_ENRICH_LIMIT = 10;

async function mapBounded<T, R>(
  values: readonly T[],
  concurrency: number,
  fn: (value: T) => Promise<R>,
) {
  const output: PromiseSettledResult<R>[] = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      try {
        output[index] = { status: "fulfilled", value: await fn(values[index]) };
      } catch (reason) {
        output[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return output;
}

export async function getMarketRadar(): Promise<RadarSnapshot> {
  const [universe, analyses, moversResult, tradedResult] = await Promise.all([
    sectorsRepository.listStocks(),
    listAnalyses(),
    getRadarMovers().then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const, value: null }),
    ),
    getRadarMostTraded().then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const, value: null }),
    ),
  ]);

  const warnings = [...universe.warnings];
  if (!moversResult.ok) warnings.push("Top-mover discovery feed is unavailable.");
  if (!tradedResult.ok) warnings.push("Most-traded discovery feed is unavailable.");
  if (!moversResult.ok && !tradedResult.ok)
    throw new Error("Sectors discovery feeds are unavailable.");

  const gainers = moversResult.value?.top_gainers?.["1d"] ?? [];
  const losers = moversResult.value?.top_losers?.["1d"] ?? [];
  const movers = [
    ...gainers.map((row, index) => ({
      ticker: row.symbol,
      companyName: row.name,
      change: row.price_change,
      close: row.last_close_price,
      date: row.latest_close_date,
      side: "GAINER" as const,
      rank: index + 1,
    })),
    ...losers.map((row, index) => ({
      ticker: row.symbol,
      companyName: row.name,
      change: row.price_change,
      close: row.last_close_price,
      date: row.latest_close_date,
      side: "LOSER" as const,
      rank: index + 1,
    })),
  ];

  const tradedDates = Object.keys(tradedResult.value ?? {}).sort();
  const tradedDate = tradedDates.at(-1) ?? null;
  const activity = (tradedDate ? tradedResult.value?.[tradedDate] ?? [] : []).map(
    (row, index) => ({
      ticker: row.symbol,
      companyName: row.company_name,
      volume: row.volume,
      price: row.price,
      date: tradedDate!,
      rank: index + 1,
    }),
  );

  const summaries = analyses.map(analysisSummary);
  const candidates = buildRadarCandidates(
    universe.stocks,
    movers,
    activity,
    summaries,
  ).slice(0, 15);

  const enrichmentTargets = candidates.slice(0, FOREIGN_ENRICH_LIMIT);
  const foreign = await mapBounded(
    enrichmentTargets,
    2,
    (candidate) => getLatestRadarForeignFlow(candidate.ticker),
  );
  foreign.forEach((result, index) => {
    if (result.status === "fulfilled")
      enrichmentTargets[index].foreignFlow = result.value;
  });
  if (foreign.some((result) => result.status === "rejected"))
    warnings.push(
      "Foreign-flow context is partially unavailable; discovery ranking is unchanged.",
    );
  if (candidates.length > FOREIGN_ENRICH_LIMIT)
    warnings.push(
      `Foreign-flow enrichment is intentionally bounded to the first ${FOREIGN_ENRICH_LIMIT} candidates to control API credits.`,
    );

  const marketDates = [
    ...movers.map((row) => row.date),
    ...(tradedDate ? [tradedDate] : []),
  ].sort();

  return {
    fetchedAt: new Date().toISOString(),
    marketDate: marketDates.at(-1) ?? null,
    candidates,
    warnings,
    sources: [
      "Sectors Top Company Movers · 1D · min market cap Rp1T",
      "Sectors Most Traded · turnover-adjusted",
      "Sectors Daily Net Foreign Inflow · bounded context",
    ],
    methodology:
      "Priority is deterministic: on the same market session, candidates with both independent discovery signals (1-day mover + turnover-adjusted most-traded) rank above single-signal candidates; ties use the best ordinal source rank. Foreign flow is context only and never changes discovery priority.",
  };
}
