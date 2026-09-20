import { normalizeTicker, toTradingViewSymbol } from "@/lib/tradingview/symbol";
export function GET(request: Request) {
  try {
    const ticker = normalizeTicker(
      new URL(request.url).searchParams.get("ticker") ?? "",
    );
    return Response.json({
      ticker,
      symbol: toTradingViewSymbol(ticker),
      exchange: "IDX",
      verified: false,
      note: "Canonical mapping only; availability is checked when requesting candles.",
    });
  } catch {
    return Response.json(
      {
        error: "INVALID_TICKER",
        message: "Use a bare IDX ticker such as BBCA.",
      },
      { status: 400 },
    );
  }
}
