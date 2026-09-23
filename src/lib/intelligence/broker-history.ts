import "server-only";
import { unstable_cache } from "next/cache";
import type { BrokerSnapshot } from "@/domain/securities";
import { brokerSchema } from "@/lib/sectors/schemas";
import { sectorsFetch } from "@/lib/sectors/client";
const cachedBrokerFetch = unstable_cache(
  async (ticker: string, end: string): Promise<BrokerSnapshot> => {
    const endMs = Date.parse(`${end}T00:00:00Z`);
    const date = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const result: BrokerSnapshot = {
      ticker,
      start: date(endMs - 41 * 86400000),
      end,
      fetchedAt: new Date().toISOString(),
      flows: [],
      unavailableReason: null,
    };
    const seen = new Map<string, string>();
    // Sequential, disjoint windows; three credits at most per cache refresh.
    for (let i = 0; i < 3; i++) {
      const windowEnd = date(endMs - i * 14 * 86400000),
        start = date(endMs - (i * 14 + 13) * 86400000);
      const data = brokerSchema.parse(
        await sectorsFetch(
          `/broker-summary/${ticker}/?start=${start}&end=${windowEnd}`,
        ),
      );
      if (data.symbol !== ticker) throw new Error("Symbol mismatch");
      for (const day of data.data) {
        if (day.date < start || day.date > windowEnd)
          throw new Error("Date outside request");
        for (const r of day.summary) {
          const key = `${day.date}:${r.broker_code.toUpperCase()}`,
            value = JSON.stringify(r);
          if (seen.has(key)) {
            if (seen.get(key) !== value)
              throw new Error("Conflicting broker rows");
            continue;
          }
          seen.set(key, value);
          result.flows.push({
            ticker,
            date: day.date,
            brokerCode: r.broker_code.toUpperCase(),
            buyLot: r.blot,
            sellLot: r.slot,
            buyValue: r.bval ?? undefined,
            sellValue: r.sval ?? undefined,
            averageBuy: r.bavg_per_share ?? undefined,
            averageSell: r.savg_per_share ?? undefined,
            buyFrequency: r.bfreq ?? undefined,
            sellFrequency: r.sfreq ?? undefined,
            foreignBuyFrequency: r.f_bfreq ?? undefined,
            foreignSellFrequency: r.f_sfreq ?? undefined,
            foreignBuyLot: r.f_blot ?? undefined,
            foreignSellLot: r.f_slot ?? undefined,
            foreignBuyValue: r.f_bval ?? undefined,
            foreignSellValue: r.f_sval ?? undefined,
            availableAt: result.fetchedAt,
          });
        }
      }
    }
    result.flows.sort((a, b) => a.date.localeCompare(b.date));
    if (!result.flows.length)
      result.unavailableReason =
        "No broker data returned for the requested 42-day period.";
    return result;
  },
  ["sectors-broker-history-v1"],
  { revalidate: 900 },
);

export async function getBrokerHistory(
  ticker: string,
  end: string,
): Promise<BrokerSnapshot> {
  try {
    return await cachedBrokerFetch(ticker, end);
  } catch {
    const endMs = Date.parse(`${end}T00:00:00Z`);
    const date = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    return {
      ticker,
      start: date(endMs - 41 * 86400000),
      end,
      fetchedAt: new Date().toISOString(),
      flows: [],
      unavailableReason:
        "Broker history unavailable or incomplete. Retry after the 15-minute cache expires; no partial baseline is used.",
    };
  }
}
