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
import { mergeBrokerHistory } from "./history";
import { ALGORITHM_VERSION, PHASE_CONFIG } from "@/config/phases";
import { getSectorsBrokerRegistry } from "@/lib/sectors/brokers";
// Preserve v1 verbatim; combined legacy labels need rescoring, not renaming.
const directory = path.join(process.cwd(), ".flowphase", "analysis-v2");
const pending = new Map<string, Promise<Intelligence>>();
async function read(ticker: string): Promise<Intelligence | null> {
  try {
    const value = JSON.parse(
      await readFile(path.join(directory, `${ticker}.json`), "utf8"),
    ) as Intelligence;
    return value.version === 2 && value.ticker === ticker ? value : null;
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
  let brokerRegistry;
  try {
    brokerRegistry = await getSectorsBrokerRegistry();
  } catch {
    brokerRegistry = undefined;
  }
  const authoritativeBrokerMetadataPresent =
    !brokerRegistry ||
    !previous?.inventory.some(
      (row) =>
        row.profile.source === "USER_HEURISTIC" && row.profile.confidence > 0,
    );
  if (
    previous &&
    authoritativeBrokerMetadataPresent &&
    previous.algorithmVersion === ALGORITHM_VERSION &&
    previous.configVersion === PHASE_CONFIG.version &&
    previous.candles !== null &&
    !(
      previous.broker.flows.length === 0 &&
      previous.broker.unavailableReason?.includes("unavailable")
    ) &&
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
        limit: 500,
      });
    } catch {
      /* unavailable is explicit */
    }
    // Exclude today's not-yet-complete broker session. Dates are Jakarta calendar dates.
    const end = sessionDate(Date.now() / 1000 - 86400);
    const latestBroker = await getBrokerHistory(ticker, end);
    const flows = mergeBrokerHistory(
      previous?.broker.flows ?? [],
      latestBroker.flows,
    );
    const broker = {
      ...latestBroker,
      flows,
      start: flows[0]?.date ?? latestBroker.start,
    };
    // Preserve every already acquired bar instead of discarding history on refresh.
    if (snapshot && previous?.candles?.source === snapshot.source) {
      const merged = new Map(previous.candles.candles.map((c) => [c.time, c]));
      for (const c of snapshot.candles) merged.set(c.time, c);
      snapshot = {
        ...snapshot,
        candles: [...merged.values()].sort((a, b) => a.time - b.time),
      };
    }
    const result = analyze(
      ticker,
      snapshot,
      broker,
      new Date().toISOString(),
      brokerRegistry,
    );
    await mkdir(directory, { recursive: true });
    const temp = path.join(directory, `${ticker}.${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(result), "utf8");
    await rename(temp, path.join(directory, `${ticker}.json`));
    return result;
  })().finally(() => pending.delete(ticker));
  pending.set(ticker, work);
  return work;
}
