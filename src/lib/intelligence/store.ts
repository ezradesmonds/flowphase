import "server-only";
import { mkdir, readFile, readdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Intelligence } from "@/domain/intelligence";
import { ANALYSIS_RULES } from "@/config/analysis";
import { sectorsRepository } from "@/lib/repositories/sectors-repository";
import { getMarketCandles } from "@/lib/services/market-data-service";
import { getBrokerHistory } from "./broker-history";
import { analyze, sessionDate } from "./analyze";
const directory = path.join(process.cwd(), ".flowphase", "analysis-v1");
const pending = new Map<string, Promise<Intelligence>>();
async function read(ticker: string): Promise<Intelligence | null> {
  try {
    const value = JSON.parse(
      await readFile(path.join(directory, `${ticker}.json`), "utf8"),
    ) as Intelligence;
    return value.version === 1 && value.ticker === ticker ? value : null;
  } catch {
    return null;
  }
}
export async function listAnalyses(): Promise<Intelligence[]> {
  try {
    const files = await readdir(directory);
    return (
      await Promise.all(
        files
          .filter((f) => /^[A-Z]{4}\.json$/.test(f))
          .map((f) => read(f.slice(0, 4))),
      )
    ).filter((v): v is Intelligence => v !== null);
  } catch {
    return [];
  }
}
export async function getIntelligence(ticker: string): Promise<Intelligence> {
  ticker = ticker.toUpperCase();
  if (!/^[A-Z]{4}$/.test(ticker)) throw new Error("Invalid ticker");
  const previous = await read(ticker);
  if (
    previous &&
    Date.now() - Date.parse(previous.calculatedAt) <
      ANALYSIS_RULES.cacheSeconds * 1000
  )
    return previous;
  const existing = pending.get(ticker);
  if (existing) return existing;
  if (pending.size >= 2) throw new Error("Analysis busy. Retry shortly.");
  const work = (async () => {
    const universe = await sectorsRepository.listStocks();
    if (!universe.stocks.some((s) => s.ticker === ticker))
      throw new Error("Unsupported Sectors ticker");
    let snapshot = null;
    try {
      snapshot = await getMarketCandles({
        ticker,
        timeframe: "1D",
        limit: 200,
      });
    } catch {
      /* unavailable is explicit */
    }
    // Exclude today's not-yet-complete broker session. Dates are Jakarta calendar dates.
    const end = sessionDate(Date.now() / 1000 - 86400);
    const broker = await getBrokerHistory(ticker, end);
    const result = analyze(ticker, snapshot, broker);
    await mkdir(directory, { recursive: true });
    const temp = path.join(directory, `${ticker}.${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(result), "utf8");
    await rename(temp, path.join(directory, `${ticker}.json`));
    return result;
  })().finally(() => pending.delete(ticker));
  pending.set(ticker, work);
  return work;
}
