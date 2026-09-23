import { z } from "zod";
export const sectorSymbol = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}(\.JK)?$/)
  .transform((s) => s.replace(/\.JK$/, ""));
export const companiesPageSchema = z.object({
  results: z.array(
    z.object({
      symbol: sectorSymbol,
      company_name: z.string().trim().min(1),
      query_values: z
        .object({
          sector: z.string().nullish(),
          sub_sector: z.string().nullish(),
        })
        .nullish(),
    }),
  ),
  pagination: z.object({
    total_count: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
    has_next: z.boolean(),
    next_offset: z.number().int().nonnegative().nullable(),
  }),
});
export const freeFloatSchema = z.array(
  z.object({
    symbol: sectorSymbol,
    free_float: z.number().finite().min(0).max(1).nullable(),
  }),
);
const amount = z.number().finite().nonnegative();
export const dailyPricesSchema = z.array(
  z.object({
    symbol: sectorSymbol,
    date: z.iso.date(),
    open: amount.nullable(),
    high: amount.nullable(),
    low: amount.nullable(),
    close: amount,
    volume: amount,
    market_cap: amount.nullish(),
  }),
);

/** Missing OHLC stays null; never substitute the close or synthesize candles. */
export function normalizeDailyPrices(payload: unknown, ticker: string) {
  const rows = dailyPricesSchema.parse(payload);
  const dates = new Set<string>();
  for (const row of rows) {
    if (row.symbol !== ticker || dates.has(row.date))
      throw new Error("Invalid daily identity or duplicate date.");
    dates.add(row.date);
    if (
      row.high !== null &&
      row.low !== null &&
      (row.high < row.low ||
        row.close > row.high ||
        row.close < row.low ||
        (row.open !== null && (row.open > row.high || row.open < row.low)))
    )
      throw new Error("Invalid OHLC range.");
  }
  return rows
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({
      ticker: row.symbol,
      date: row.date,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volumeShares: row.volume,
      marketCapIdr: row.market_cap ?? null,
    }));
}
export const brokerSchema = z.object({
  symbol: sectorSymbol,
  start: z.iso.date(),
  end: z.iso.date(),
  data: z.array(
    z.object({
      date: z.iso.date(),
      summary: z.array(
        z.object({
          broker_code: z.string().min(1),
          bfreq: amount.nullish(),
          sfreq: amount.nullish(),
          blot: amount,
          slot: amount,
          bval: amount.nullish(),
          sval: amount.nullish(),
          bavg_per_share: amount.nullish(),
          savg_per_share: amount.nullish(),
        }),
      ),
    }),
  ),
});
