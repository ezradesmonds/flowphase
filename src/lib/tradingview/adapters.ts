import type { MarketCandle } from "@/domain/chart-market";
import { providerPeriodSchema } from "./schemas";
export function normalizePeriods(
  input: unknown[],
  limit: number,
): MarketCandle[] {
  const rows = new Map<number, MarketCandle>();
  for (const item of input) {
    const p = providerPeriodSchema.parse(item);
    rows.set(p.time, {
      time: p.time,
      open: p.open,
      high: p.max,
      low: p.min,
      close: p.close,
      volume: p.volume,
    });
  }
  return [...rows.values()].sort((a, b) => a.time - b.time).slice(-limit);
}
