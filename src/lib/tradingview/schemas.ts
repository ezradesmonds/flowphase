import { z } from "zod";
import { TIMEFRAMES } from "@/domain/chart-market";
import { normalizeTicker } from "./symbol";
export const candleRequestSchema = z.object({
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,11}$/)
    .transform(normalizeTicker),
  timeframe: z.enum(TIMEFRAMES).default("1D"),
  limit: z.coerce.number().int().min(2).max(500).default(200),
});
export const providerPeriodSchema = z
  .object({
    time: z.number().int().positive().max(8640000000000),
    open: z.number().finite().nonnegative(),
    close: z.number().finite().nonnegative(),
    max: z.number().finite().nonnegative(),
    min: z.number().finite().nonnegative(),
    volume: z.number().finite().nonnegative(),
  })
  .refine(
    (p) =>
      p.max >= Math.max(p.open, p.close) &&
      p.min <= Math.min(p.open, p.close) &&
      p.max >= p.min,
    "Invalid OHLC bounds",
  );
