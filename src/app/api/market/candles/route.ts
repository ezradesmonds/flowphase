import { candleRequestSchema } from "@/lib/tradingview/schemas";
import { getMarketCandles } from "@/lib/services/market-data-service";
import { MarketDataError } from "@/lib/tradingview/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const parsed = candleRequestSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json(
      {
        error: "INVALID_REQUEST",
        message:
          "Use an IDX ticker, supported timeframe and limit from 2 to 500.",
      },
      { status: 400 },
    );
  try {
    return Response.json(await getMarketCandles(parsed.data, request.signal), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const safe =
      error instanceof MarketDataError
        ? error
        : new MarketDataError("UNAVAILABLE");
    return Response.json(
      { error: safe.code, message: safe.message },
      {
        status:
          safe.code === "BUSY" ? 429 : safe.code === "TIMEOUT" ? 504 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
