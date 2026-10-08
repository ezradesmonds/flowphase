import type { BrokerProfile, Intelligence } from "@/domain/intelligence";
import type { BrokerFlow } from "@/domain/market";
import { brokerProfile } from "@/config/brokers";
import { metric, RULES, type Affiliation, type Meta } from "./model";
import { sessionDate } from "../analyze";
export function brokerIdentity(
  code: string,
  date: string,
  ticker: string,
  affiliations: Affiliation[] = [],
  registry?: readonly BrokerProfile[],
) {
  const affiliation = affiliations.find(
    (a) =>
      a.broker_code === code &&
      a.effective_from <= date &&
      (!a.effective_to || a.effective_to >= date),
  );
  const p = brokerProfile(code, registry, date, ticker);
  return {
    code,
    name: affiliation?.broker_name ?? "Name unavailable",
    affiliation: affiliation ?? null,
    ownershipType: affiliation?.ownership_type ?? "UNKNOWN",
    behaviorProxy:
      p.classification === "RETAIL_ACCESSIBLE"
        ? "RETAIL_PROXY"
        : p.classification === "INSTITUTIONAL_ASSOCIATED"
          ? "INSTITUTIONAL_PROXY"
          : "UNKNOWN",
    behaviorSource: p.source,
    behaviorConfidence: p.confidence,
  };
}
export function inventoryByPhase(
  a: Intelligence,
  start?: string,
  end?: string,
  affiliations: Affiliation[] = [],
  registry?: readonly BrokerProfile[],
) {
  const analysisProfiles = a.inventory.map((row) => row.profile);
  const profileRegistry = registry ?? analysisProfiles;
  const all = a.broker.flows
    .filter((f) => f.ticker === a.ticker)
    .sort((a, b) => a.date.localeCompare(b.date));
  const origin = all[0]?.date ?? null,
    lo = start ?? origin ?? a.broker.start,
    hi = end ?? a.broker.end;
  const periods = [
    { id: "CUSTOM", phase: "CUSTOM", start: lo, end: hi },
    ...a.cycles.map((c) => ({
      id: c.id,
      phase: "CYCLE",
      start: sessionDate(c.startTimestamp),
      end: sessionDate(
        c.endTimestamp ?? a.regions.at(-1)?.endTimestamp ?? c.startTimestamp,
      ),
    })),
    ...a.regions.map((r) => ({
      id: r.id,
      phase: r.phase,
      start: sessionDate(r.startTimestamp),
      end: sessionDate(r.endTimestamp),
    })),
  ];
  return periods.flatMap((period) => {
    const first = period.start > lo ? period.start : lo,
      last = period.end < hi ? period.end : hi;
    if (first > last) return [];
    const codes = [
      ...new Set(all.filter((f) => f.date <= last).map((f) => f.brokerCode)),
    ];
    return codes.map((code) => {
      const rows = all.filter(
          (f) => f.brokerCode === code && f.date >= first && f.date <= last,
        ),
        prior = all.filter((f) => f.brokerCode === code && f.date < first);
      const coverageDays = new Set(
        all.filter((f) => f.date >= first && f.date <= last).map((f) => f.date),
      ).size;
      const expected =
        a.candles?.candles.filter(
          (c) => sessionDate(c.time) >= first && sessionDate(c.time) <= last,
        ).length ?? 0;
      const coverage = expected ? Math.min(1, coverageDays / expected) : 0;
      const flags = [
        "PRE_PERIOD_INVENTORY_UNKNOWN",
        "AGGREGATES_NOT_CHRONOLOGICAL",
        "CROSSING_PROXY_NOT_MATCHED_TRADES",
        "COVERAGE_IS_SESSION_PRESENCE_NOT_BROKER_COMPLETENESS",
      ];
      const sum = (key: keyof BrokerFlow) =>
        rows.length &&
        rows.every(
          (r) =>
            typeof r[key] === "number" &&
            Number.isFinite(r[key]) &&
            (r[key] as number) >= 0,
        )
          ? rows.reduce((s, r) => s + (r[key] as number), 0)
          : null;
      const buy = sum("buyLot"),
        sell = sum("sellLot"),
        net = buy === null || sell === null ? null : buy - sell,
        gross = buy === null || sell === null ? null : buy + sell,
        bv = sum("buyValue"),
        sv = sum("sellValue"),
        bf = sum("buyFrequency"),
        sf = sum("sellFrequency"),
        freq = bf === null || sf === null ? null : bf + sf;
      const opening = prior.reduce((s, r) => s + r.buyLot - r.sellLot, 0),
        closing = opening + (net ?? 0);
      if (closing < 0) flags.push("NEGATIVE_OBSERVED_NET_UNSEEN_OPENING");
      // Same-day two-sided activity, not a whole-cycle buy/sell round trip.
      const risk = gross
        ? rows.reduce((s, r) => s + 2 * Math.min(r.buyLot, r.sellLot), 0) /
          gross
        : gross === 0
          ? 0
          : null;
      if (risk !== null && risk >= RULES.crossingThreshold)
        flags.push("HIGH_CROSSING_RISK");
      const meta: Meta = {
        source: ["Sectors /broker-summary/", "TradingView daily close"],
        as_of: a.broker.fetchedAt,
        period_start: first,
        period_end: last,
        calculation_method: "daily aggregates",
        data_status: rows.length ? "DERIVED" : "UNAVAILABLE",
        confidence: Math.round(coverage * 70 * (1 - (risk ?? 0) * 0.5)),
        quality_flags: flags,
      };
      const m = (n: number | null, method: string) => metric(n, meta, method);
      let running = 0,
        peak = 0;
      const history = all
        .filter((f) => f.brokerCode === code && f.date <= last)
        .map((f) => {
          running += f.buyLot - f.sellLot;
          peak = Math.max(peak, running);
          return { date: f.date, net: f.buyLot - f.sellLot, running };
        });
      const averages = (
        side: "buy" | "sell",
        lots: number | null,
        value: number | null,
      ) =>
        lots && value !== null ? value / (lots * RULES.sharesPerLot) : null;
      const metrics = {
        buyLot: m(buy, "sum buy lots"),
        sellLot: m(sell, "sum sell lots"),
        netLot: m(net, "buy − sell lots"),
        grossLot: m(gross, "buy + sell lots"),
        buyValue: m(bv, "sum buy value Rp"),
        sellValue: m(sv, "sum sell value Rp"),
        netValue: m(
          bv === null || sv === null ? null : bv - sv,
          "buy − sell value Rp",
        ),
        buyFrequency: m(bf, "sum buy frequency; missing stays null"),
        sellFrequency: m(sf, "sum sell frequency; missing stays null"),
        totalFrequency: m(freq, "buy + sell frequency"),
        averageLot: m(
          gross === null || freq === null ? null : gross / Math.max(freq, 1),
          "gross lots / max(frequency,1)",
        ),
        averageBuyLot: m(
          buy === null || bf === null ? null : buy / Math.max(bf, 1),
          "buy lots / max(buy frequency,1)",
        ),
        averageSellLot: m(
          sell === null || sf === null ? null : sell / Math.max(sf, 1),
          "sell lots / max(sell frequency,1)",
        ),
        averageBuyPrice: m(
          averages("buy", buy, bv),
          "buy value / (buy lots × shares per lot)",
        ),
        averageSellPrice: m(
          averages("sell", sell, sv),
          "sell value / (sell lots × shares per lot)",
        ),
        observedOpening: m(
          origin && origin <= first ? opening : null,
          "signed cumulative net since " + origin + "; NOT absolute holdings",
        ),
        inventoryChange: m(net, "phase buy − sell lots"),
        observedClosing: m(
          rows.length ? closing : null,
          "observed opening + observed change; NOT holdings",
        ),
        estimatedRemaining: m(null, "opening holdings unavailable"),
        currentPrice: metric(
          a.candles?.candles.at(-1)?.close ?? null,
          {
            ...meta,
            source: ["TradingView"],
            period_start: a.candles?.candles.at(-1)
              ? sessionDate(a.candles.candles.at(-1)!.time)
              : null,
            period_end: a.candles?.candles.at(-1)
              ? sessionDate(a.candles.candles.at(-1)!.time)
              : null,
          },
          "latest acquired close",
          "OBSERVED",
        ),
        costBasis: m(
          null,
          "opening cost and chronological executions unavailable",
        ),
        unrealizedPnl: m(null, "PnL unavailable"),
        realizedPnl: m(null, "PnL unavailable: daily order unknown"),
        grossToNet: m(
          gross === null || net === null
            ? null
            : gross / Math.max(Math.abs(net), 1),
          "gross / max(abs(net),1)",
        ),
        crossingRisk: m(risk, "sum daily 2×min(buy,sell) / gross"),
        depletion: m(
          peak > 0 ? (peak - running) / peak : null,
          "observed signed-net peak drawdown; not absolute inventory depletion",
        ),
      };
      return {
        symbol: a.ticker,
        broker: brokerIdentity(
          code,
          last,
          a.ticker,
          affiliations,
          profileRegistry,
        ),
        segmentId: period.id,
        phase: period.phase,
        periodStart: first,
        periodEnd: last,
        origin,
        meta,
        coverage,
        metrics,
        history,
        sourceAverages: rows.map((r) => ({
          date: r.date,
          buy: r.averageBuy ?? null,
          sell: r.averageSell ?? null,
        })),
      };
    });
  });
}
export type PhaseInventoryRow = ReturnType<typeof inventoryByPhase>[number];
