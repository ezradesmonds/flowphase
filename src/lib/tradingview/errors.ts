export class MarketDataError extends Error {
  constructor(
    public readonly code:
      "UNAVAILABLE" | "TIMEOUT" | "ABORTED" | "BUSY" | "INVALID_DATA",
  ) {
    super(
      {
        UNAVAILABLE:
          "TradingView data is unavailable. Access may be restricted or the symbol unsupported.",
        TIMEOUT: "TradingView did not respond in time.",
        ABORTED: "Request cancelled.",
        BUSY: "Market data capacity is busy. Please retry shortly.",
        INVALID_DATA: "TradingView returned invalid candle data.",
      }[code],
    );
  }
}
