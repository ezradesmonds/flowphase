import "server-only";
import type { CandleRequest, CandleSnapshot } from "@/domain/chart-market";
import { tradingViewMarketDataRepository } from "../repositories/tradingview-market-data-repository";
import { MarketDataError } from "../tradingview/errors";
// Per-process bounds. A multi-instance deployment needs a shared quota/cache.
const cache = new Map<string, { expires: number; data: CandleSnapshot }>();
let active = 0;
export function reserveConnection() {
  if (active >= 4) throw new MarketDataError("BUSY");
  active++;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      active--;
    }
  };
}
export async function getMarketCandles(
  request: CandleRequest,
  signal?: AbortSignal,
) {
  const key = JSON.stringify(request);
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data;
  const release = reserveConnection();
  try {
    const data = await tradingViewMarketDataRepository.getCandles(
      request,
      signal,
    );
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 15_000, data });
    return data;
  } finally {
    release();
  }
}
