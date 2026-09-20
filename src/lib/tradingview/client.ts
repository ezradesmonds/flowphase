import "server-only";
import TradingView from "@mathieuc/tradingview";
import { MarketDataError } from "./errors";
export function createTradingViewClient() {
  const token = process.env.TRADINGVIEW_SESSION;
  const signature = process.env.TRADINGVIEW_SIGNATURE;
  if (Boolean(token) !== Boolean(signature))
    throw new MarketDataError("UNAVAILABLE");
  // Anonymous by default. Never enable the package's global debug logger.
  return new TradingView.Client(token && signature ? { token, signature } : {});
}
