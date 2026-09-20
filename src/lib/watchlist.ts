import { z } from "zod";
export const WATCHLIST_KEY = "flowphase.demo.watchlist.v1";
export function parseWatchlist(
  raw: string | null,
  validTickers: string[],
): string[] {
  if (raw === null) return [];
  const parsed = z.array(z.string()).safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error("Invalid watchlist format");
  return [...new Set(parsed.data)].filter((t) => validTickers.includes(t));
}
