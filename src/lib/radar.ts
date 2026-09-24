import type { IdxStock } from "@/domain/securities";
import type {
  RadarCandidate,
  RadarTrigger,
  RadarTriggerType,
} from "@/domain/radar";
import type { AnalysisSummary } from "./intelligence/summary";

export interface RadarMoverInput {
  ticker: string;
  companyName: string;
  change: number;
  close: number;
  date: string;
  side: "GAINER" | "LOSER";
  rank: number;
}

export interface RadarActivityInput {
  ticker: string;
  companyName: string;
  volume: number;
  price: number;
  date: string;
  rank: number;
}

function trigger(
  type: RadarTriggerType,
  rank: number,
  value: number,
  date: string,
): RadarTrigger {
  return {
    type,
    rank,
    value,
    date,
    label:
      type === "MOST_TRADED"
        ? `#${rank} turnover-adjusted activity`
        : type === "TOP_GAINER"
          ? `#${rank} 1-day gainer`
          : `#${rank} 1-day loser`,
  };
}

/**
 * Discovery is ordinal rather than a black-box weighted score.
 * Priority = number of independent Sectors discovery triggers, then best rank.
 */
export function buildRadarCandidates(
  stocks: readonly IdxStock[],
  movers: readonly RadarMoverInput[],
  activity: readonly RadarActivityInput[],
  analyses: readonly AnalysisSummary[] = [],
): RadarCandidate[] {
  const stockMap = new Map(stocks.map((stock) => [stock.ticker, stock]));
  const analysisMap = new Map(analyses.map((row) => [row.ticker, row]));
  const rows = new Map<string, RadarCandidate>();
  const ensure = (
    ticker: string,
    fallbackName: string,
    close: number | null,
    date: string | null,
  ) => {
    const stock = stockMap.get(ticker);
    if (!stock) return null;
    const existing = rows.get(ticker);
    if (existing) {
      if (existing.close === null && close !== null) existing.close = close;
      if (!existing.marketDate && date) existing.marketDate = date;
      return existing;
    }
    const row: RadarCandidate = {
      ticker,
      companyName: stock.companyName || fallbackName,
      sector: stock.sector,
      subsector: stock.subsector,
      close,
      marketDate: date,
      triggers: [],
      discoveryStrength: 0,
      bestRank: Number.POSITIVE_INFINITY,
      foreignFlow: null,
      analysis: analysisMap.get(ticker) ?? null,
    };
    rows.set(ticker, row);
    return row;
  };

  for (const item of activity) {
    const row = ensure(item.ticker, item.companyName, item.price, item.date);
    if (!row) continue;
    row.triggers.push(trigger("MOST_TRADED", item.rank, item.volume, item.date));
  }
  for (const item of movers) {
    const row = ensure(item.ticker, item.companyName, item.close, item.date);
    if (!row) continue;
    row.triggers.push(
      trigger(
        item.side === "GAINER" ? "TOP_GAINER" : "TOP_LOSER",
        item.rank,
        item.change,
        item.date,
      ),
    );
  }

  return [...rows.values()]
    .map((row) => {
      const marketDate = row.triggers.map((item) => item.date).sort().at(-1) ?? null;
      const triggers = marketDate
        ? row.triggers.filter((item) => item.date === marketDate)
        : row.triggers;
      return {
        ...row,
        marketDate,
        triggers,
        discoveryStrength: new Set(
          triggers.map((item) =>
            item.type === "MOST_TRADED" ? "ACTIVITY" : "MOVE",
          ),
        ).size,
        bestRank: Math.min(...triggers.map((item) => item.rank)),
      };
    })
    .sort(
      (a, b) =>
        b.discoveryStrength - a.discoveryStrength ||
        a.bestRank - b.bestRank ||
        a.ticker.localeCompare(b.ticker),
    );
}
