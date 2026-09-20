import type { CandleRequest, CandleSnapshot } from "@/domain/chart-market";
import type { ChartClient, ChartSession } from "./transport";
import { normalizePeriods } from "./adapters";
import { toTradingViewSymbol } from "./symbol";
import { MarketDataError } from "./errors";

/** Own one upstream session. Raw upstream errors never cross this boundary. */
export function subscribeCandles(
  createClient: () => ChartClient,
  request: CandleRequest,
  onData: (data: CandleSnapshot) => void,
  onError: (error: MarketDataError) => void,
  signal?: AbortSignal,
) {
  let client: ChartClient | undefined;
  let chart: ChartSession | undefined;
  let stopped = false;
  let first = true;
  const timer = setTimeout(() => fail(new MarketDataError("TIMEOUT")), 15_000);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    try {
      chart?.delete();
    } catch {
      /* Connection may already be gone. */
    }
    void client?.end().catch(() => {});
  };
  const fail = (error: MarketDataError) => {
    if (stopped) return;
    stop();
    onError(error);
  };
  const abort = () => fail(new MarketDataError("ABORTED"));
  if (signal?.aborted) {
    abort();
    return stop;
  }
  signal?.addEventListener("abort", abort, { once: true });
  try {
    client = createClient();
    // Package end() does not close a CONNECTING socket; close on late open too.
    client.onConnected(() => {
      if (stopped) void client?.end().catch(() => {});
    });
    client.onError(() => fail(new MarketDataError("UNAVAILABLE")));
    client.onDisconnected(() => fail(new MarketDataError("UNAVAILABLE")));
    chart = new client.Session.Chart();
    chart.onError(() => fail(new MarketDataError("UNAVAILABLE")));
    chart.onUpdate(() => {
      if (stopped || !chart?.periods.length) return;
      let snapshot: CandleSnapshot;
      try {
        snapshot = {
          ...request,
          symbol: toTradingViewSymbol(request.ticker),
          source: "TRADINGVIEW",
          delay: "UNKNOWN",
          fetchedAt: new Date().toISOString(),
          candles: normalizePeriods(chart.periods, request.limit),
        };
      } catch {
        fail(new MarketDataError("INVALID_DATA"));
        return;
      }
      if (first) {
        first = false;
        clearTimeout(timer);
      }
      onData(snapshot);
    });
    chart.setMarket(toTradingViewSymbol(request.ticker), {
      timeframe: request.timeframe,
      range: request.limit,
      session: "regular",
      adjustment: "splits",
    });
  } catch {
    fail(new MarketDataError("UNAVAILABLE"));
  }
  return stop;
}
