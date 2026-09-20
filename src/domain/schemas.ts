import { z } from "zod";
import { PHASES } from "./market";
export const tickerSchema = z.string().regex(/^[A-Z]{4}$/);
export const scannerSchema = z.object({
  ticker: tickerSchema,
  companyName: z.string().min(1),
  sector: z.string().optional(),
  currentPhase: z.enum(PHASES),
  confidence: z.number().min(0).max(100),
  cycleStart: z.iso.date(),
  cumulativeNetFlow: z.number().finite(),
  remainingInventoryRatio: z.number().min(0).max(1).nullable(),
  relativeVolume: z.number().nonnegative().nullable(),
  distributionRisk: z.number().min(0).max(100),
  lastUpdated: z.iso.datetime(),
});
export const candleSchema = z
  .object({
    ticker: tickerSchema,
    date: z.iso.date(),
    open: z.number().positive(),
    high: z.number().positive(),
    low: z.number().positive(),
    close: z.number().positive(),
    volume: z.number().int().nonnegative(),
    value: z.number().nonnegative().optional(),
  })
  .refine(
    (c) =>
      c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close),
    "Invalid OHLC bounds",
  );
