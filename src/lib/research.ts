import type { BrokerFlow } from "@/domain/market";
import type { IdxStock } from "@/domain/securities";
export function compareFreeFloat(
  stock: IdxStock,
  universe: readonly IdxStock[],
) {
  if (!stock.subsector || stock.freeFloat === null) return null;
  const values = universe
    .filter(
      (s) =>
        s.ticker !== stock.ticker &&
        s.subsector === stock.subsector &&
        s.freeFloat !== null,
    )
    .map((s) => s.freeFloat!)
    .sort((a, b) => a - b);
  if (!values.length) return null;
  const middle = Math.floor(values.length / 2);
  const median =
    values.length % 2
      ? values[middle]
      : (values[middle - 1] + values[middle]) / 2;
  return {
    peerCount: values.length,
    median,
    differencePoints: (stock.freeFloat - median) * 100,
  };
}
export function summarizeBrokerFlow(flows: readonly BrokerFlow[]) {
  const groups = new Map<
    string,
    {
      brokerCode: string;
      buyLot: number;
      sellLot: number;
      buyValue: number | null;
      sellValue: number | null;
    }
  >();
  for (const flow of flows) {
    const group = groups.get(flow.brokerCode) ?? {
      brokerCode: flow.brokerCode,
      buyLot: 0,
      sellLot: 0,
      buyValue: 0,
      sellValue: 0,
    };
    group.buyLot += flow.buyLot;
    group.sellLot += flow.sellLot;
    group.buyValue =
      group.buyValue === null || flow.buyValue === undefined
        ? null
        : group.buyValue + flow.buyValue;
    group.sellValue =
      group.sellValue === null || flow.sellValue === undefined
        ? null
        : group.sellValue + flow.sellValue;
    groups.set(flow.brokerCode, group);
  }
  const brokers = [...groups.values()]
    .map((b) => ({
      ...b,
      netLot: b.buyLot - b.sellLot,
      netValue:
        b.buyValue === null || b.sellValue === null
          ? null
          : b.buyValue - b.sellValue,
    }))
    .sort(
      (a, b) => b.netLot - a.netLot || a.brokerCode.localeCompare(b.brokerCode),
    );
  const grossBuy = brokers.reduce((s, b) => s + b.buyLot, 0);
  const top3Buy = [...brokers]
    .sort((a, b) => b.buyLot - a.buyLot)
    .slice(0, 3)
    .reduce((s, b) => s + b.buyLot, 0);
  return {
    brokers,
    days: new Set(flows.map((f) => f.date)).size,
    netBuyers: brokers.filter((b) => b.netLot > 0).length,
    netSellers: brokers.filter((b) => b.netLot < 0).length,
    top3BuyShare: grossBuy > 0 ? top3Buy / grossBuy : null,
  };
}
