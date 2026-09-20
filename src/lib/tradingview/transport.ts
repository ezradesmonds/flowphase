/** Minimal contract audited against @mathieuc/tradingview 3.5.2. */
export interface ChartSession {
  periods: unknown[];
  onUpdate(cb: () => void): void;
  onError(cb: () => void): void;
  setMarket(
    symbol: string,
    options: {
      timeframe: string;
      range: number;
      session: "regular";
      adjustment: "splits";
    },
  ): void;
  delete(): void;
}
export interface ChartClient {
  Session: { Chart: new () => ChartSession };
  onConnected(cb: () => void): void;
  onDisconnected(cb: () => void): void;
  onError(cb: () => void): void;
  end(): Promise<void>;
}
