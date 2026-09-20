import "server-only";
import type { CandleRequest, CandleSnapshot } from "@/domain/chart-market";
import type { MarketDataRepository } from "./market-data-repository";
import { createTradingViewClient } from "../tradingview/client";
import { subscribeCandles } from "../tradingview/session";
export const tradingViewMarketDataRepository: MarketDataRepository = {
  getCandles(request: CandleRequest, signal?: AbortSignal) {
    return new Promise<CandleSnapshot>((resolve, reject) => {
      let stop = () => {};
      stop = subscribeCandles(
        createTradingViewClient,
        request,
        (data) => {
          // Handles synchronous test transports as well as WebSocket callbacks.
          queueMicrotask(() => {
            stop();
            resolve(data);
          });
        },
        reject,
        signal,
      );
    });
  },
};
