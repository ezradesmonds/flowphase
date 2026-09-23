import type { BrokerFlow } from "@/domain/market";
import type {
  InventoryRow,
  FlowGroup,
  BrokerProfile,
} from "@/domain/intelligence";
import { brokerProfile, BROKER_REGISTRY } from "@/config/brokers";
import { PHASE_CONFIG } from "@/config/phases";
export const SHARES_PER_LOT = PHASE_CONFIG.sharesPerLot;
export type OpeningPosition = {
  lots: number;
  averageCost: number;
  source: string;
  asOf: string;
};
export function calculateInventory(
  flows: readonly BrokerFlow[],
  ticker: string,
  start: string,
  end: string,
  price: number | null = null,
  registry: readonly BrokerProfile[] = BROKER_REGISTRY,
  opening: Readonly<Record<string, OpeningPosition>> = {},
): InventoryRow[] {
  const grouped = new Map<string, BrokerFlow[]>();
  for (const row of flows.filter(
    (r) => r.ticker === ticker && r.date >= start && r.date <= end,
  )) {
    if (![row.buyLot, row.sellLot].every((v) => Number.isFinite(v) && v >= 0))
      continue;
    const code = row.brokerCode.trim().toUpperCase();
    grouped.set(code, [...(grouped.get(code) ?? []), row]);
  }
  return [...grouped]
    .map(([brokerCode, rows]) => {
      rows.sort((a, b) => a.date.localeCompare(b.date));
      const days = new Map<string, { buy: number; sell: number }>();
      for (const r of rows) {
        const d = days.get(r.date) ?? { buy: 0, sell: 0 };
        d.buy += r.buyLot;
        d.sell += r.sellLot;
        days.set(r.date, d);
      }
      let running = 0,
        peak = 0;
      const sorted = [...days].sort(([a], [b]) => a.localeCompare(b));
      const history = sorted.map(([date, d]) => {
        const net = d.buy - d.sell;
        running += net;
        peak = Math.max(peak, running);
        return { date, net, running };
      });
      const grossBuyLot = rows.reduce((n, r) => n + r.buyLot, 0),
        grossSellLot = rows.reduce((n, r) => n + r.sellLot, 0);
      const value = (side: "buy" | "sell") =>
        rows.reduce<number | null>((n, r) => {
          const lot = side === "buy" ? r.buyLot : r.sellLot;
          const v = side === "buy" ? r.buyValue : r.sellValue;
          return n === null ||
            (lot > 0 && (v === undefined || !Number.isFinite(v) || v < 0))
            ? null
            : n + (v ?? 0);
        }, 0);
      const grossBuyValue = value("buy"),
        grossSellValue = value("sell");
      const average = (
        side: "buy" | "sell",
        lots: number,
        total: number | null,
      ) => {
        if (!lots) return null;
        if (total !== null) return total / (lots * SHARES_PER_LOT);
        let weighted = 0;
        for (const r of rows) {
          const lot = side === "buy" ? r.buyLot : r.sellLot,
            p = side === "buy" ? r.averageBuy : r.averageSell;
          if (lot && (p === undefined || !Number.isFinite(p))) return null;
          weighted += lot * (p ?? 0);
        }
        return weighted / lots;
      };
      const buys = sorted.filter(([, d]) => d.buy > 0),
        sells = sorted.filter(([, d]) => d.sell > 0);
      const position = opening[brokerCode];
      const hasOpening =
        !!position &&
        position.asOf === start &&
        !!position.source &&
        Number.isFinite(position.lots) &&
        position.lots >= 0 &&
        Number.isFinite(position.averageCost) &&
        position.averageCost >= 0;
      let holding: number | null = hasOpening ? position.lots : null;
      let cost: number | null = hasOpening ? position.averageCost : null;
      let holdingPeak: number | null = holding;
      for (const r of rows) {
        if (holding === null) break;
        if (r.buyLot > 0) {
          const buyPrice =
            r.buyValue !== undefined
              ? r.buyValue / (r.buyLot * SHARES_PER_LOT)
              : r.averageBuy;
          cost =
            buyPrice !== undefined && Number.isFinite(buyPrice) && buyPrice >= 0
              ? holding === 0
                ? buyPrice
                : cost !== null
                  ? (holding * cost + r.buyLot * buyPrice) /
                    (holding + r.buyLot)
                  : null
              : null;
          holding += r.buyLot;
        }
        // Daily aggregate convention: buys then sells. No intraday ordering claim.
        holding -= r.sellLot;
        if (holding < 0) {
          holding = null;
          cost = null;
          holdingPeak = null;
          break;
        }
        holdingPeak = Math.max(holdingPeak ?? 0, holding);
      }
      const grossLot = grossBuyLot + grossSellLot;
      const grossToNetRatio = grossLot / Math.max(Math.abs(running), 1);
      const crossingRisk = grossLot
        ? Math.min(1, (2 * Math.min(grossBuyLot, grossSellLot)) / grossLot)
        : 0;
      const material = Math.max(
        1,
        (grossLot / Math.max(1, sorted.length)) *
          PHASE_CONFIG.materialFlowFraction,
      );
      const materialBuys = history.filter((d) => d.net >= material);
      const materialSells = history.filter((d) => d.net <= -material);
      return {
        ticker,
        brokerCode,
        profile: brokerProfile(brokerCode, registry, end, ticker),
        periodStart: start,
        periodEnd: end,
        grossBuyLot,
        grossSellLot,
        grossBuyValue,
        grossSellValue,
        netValue:
          grossBuyValue === null || grossSellValue === null
            ? null
            : grossBuyValue - grossSellValue,
        cumulativeNetLot: running,
        peakEstimatedInventory: holdingPeak,
        estimatedRemainingInventory: holding,
        inventoryReduction:
          holdingPeak !== null && holding !== null
            ? holdingPeak - holding
            : null,
        remainingRatio:
          holdingPeak !== null && holdingPeak > 0 && holding !== null
            ? holding / holdingPeak
            : null,
        inventoryDepletionRatio:
          holdingPeak !== null && holdingPeak > 0 && holding !== null
            ? 1 - holding / holdingPeak
            : null,
        observedPeakNetLot: peak,
        observedNetDepletionRatio:
          peak > 0 ? Math.max(0, Math.min(1, (peak - running) / peak)) : null,
        grossToNetRatio,
        crossingRisk,
        crossingWarning: grossToNetRatio >= PHASE_CONFIG.crossingWarningRatio,
        firstAccumulationDate: materialBuys[0]?.date ?? null,
        lastMaterialBuyDate: materialBuys.at(-1)?.date ?? null,
        lastMaterialSellDate: materialSells.at(-1)?.date ?? null,
        movingAverageCost: cost,
        costBasisMethod: "MOVING_WEIGHTED_AVERAGE" as const,
        openingInventoryLot: hasOpening ? position.lots : null,
        weightedAverageBuyPrice: average("buy", grossBuyLot, grossBuyValue),
        weightedAverageSellPrice: average("sell", grossSellLot, grossSellValue),
        firstBuyDate: buys[0]?.[0] ?? null,
        lastBuyDate: buys.at(-1)?.[0] ?? null,
        firstSellDate: sells[0]?.[0] ?? null,
        lastSellDate: sells.at(-1)?.[0] ?? null,
        buyConsistency: history.filter((d) => d.net > 0).length / sorted.length,
        sellConsistency:
          history.filter((d) => d.net < 0).length / sorted.length,
        activeTradingDays: sorted.length,
        estimatedMarketValue:
          price !== null && price > 0 && holding !== null
            ? holding * SHARES_PER_LOT * price
            : null,
        role:
          running > 0 ? "Accumulator" : running < 0 ? "Distributor" : "Neutral",
        startingInventory: hasOpening
          ? ("SUPPLIED_ESTIMATE" as const)
          : ("UNKNOWN" as const),
        history,
      };
    })
    .sort((a, b) => b.cumulativeNetLot - a.cumulativeNetLot)
    .map((r, i, rows) => ({
      ...r,
      role:
        r.cumulativeNetLot > 0 && i === 0
          ? "Dominant Accumulator"
          : r.cumulativeNetLot < 0 && i === rows.length - 1
            ? "Dominant Distributor"
            : r.role,
    }));
}
export function aggregateGroups(rows: InventoryRow[]): FlowGroup[] {
  return (
    [
      "INSTITUTIONAL_ASSOCIATED",
      "RETAIL_ACCESSIBLE",
      "MIXED_OR_UNKNOWN",
    ] as const
  ).map((classification) => {
    const selected = rows.filter(
      (r) => r.profile.classification === classification,
    );
    return {
      classification,
      netLot: selected.reduce((n, r) => n + r.cumulativeNetLot, 0),
      netValue: selected.some((r) => r.netValue === null)
        ? null
        : selected.reduce((n, r) => n + (r.netValue ?? 0), 0),
      brokers: selected.length,
      remaining:
        !selected.length ||
        selected.some((r) => r.estimatedRemainingInventory === null)
          ? null
          : selected.reduce((n, r) => n + r.estimatedRemainingInventory!, 0),
    };
  });
}
