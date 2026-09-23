import type { BrokerFlow } from "@/domain/market";

/** Keep the first observation time for an unchanged source row. Revised rows
 * receive a new watermark; never silently backdate revised evidence. */
export function mergeBrokerHistory(
  previous: readonly BrokerFlow[],
  incoming: readonly BrokerFlow[],
) {
  const key = (r: BrokerFlow) => `${r.ticker}:${r.date}:${r.brokerCode}`;
  const rows = new Map(previous.map((r) => [key(r), r]));
  for (const row of incoming) {
    const old = rows.get(key(row));
    const comparable = (r: BrokerFlow) => [
      r.buyLot,
      r.sellLot,
      r.buyValue,
      r.sellValue,
      r.averageBuy,
      r.averageSell,
      r.buyFrequency,
      r.sellFrequency,
    ];
    const unchanged =
      old &&
      JSON.stringify(comparable(old)) === JSON.stringify(comparable(row));
    rows.set(
      key(row),
      unchanged && old.availableAt
        ? { ...row, availableAt: old.availableAt }
        : row,
    );
  }
  return [...rows.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.brokerCode.localeCompare(b.brokerCode),
  );
}
