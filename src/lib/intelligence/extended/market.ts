import type { Intelligence } from "@/domain/intelligence";
import type { IdxStock } from "@/domain/securities";
import type { MarketCandle } from "@/domain/chart-market";
import { brokerProfile, type BrokerProfile } from "@/config/brokers";
import { metric, type Meta } from "./model";
import { sessionDate } from "../analyze";
export function marketActivity(
  analyses: Intelligence[],
  stocks: IdxStock[],
  foreign: Record<
    string,
    { date: string; net: number | null; asOf: string }[]
  > = {},
  asOf = new Date().toISOString(),
  registry?: readonly BrokerProfile[],
) {
  const today = sessionDate(Date.parse(asOf) / 1000);
  // The current Jakarta session may still be trading. Never compare its partial
  // volume against completed daily baselines or yesterday's broker aggregates.
  analyses = analyses.map((a) => ({
    ...a,
    candles: a.candles
      ? {
          ...a.candles,
          candles: a.candles.candles.filter((c) => sessionDate(c.time) < today),
        }
      : null,
  }));
  const dates = analyses
      .flatMap((a) =>
        a.candles?.candles.at(-1)
          ? [sessionDate(a.candles.candles.at(-1)!.time)]
          : [],
      )
      .sort(),
    date = dates.at(-1) ?? null;
  const included = analyses.filter(
    (a) =>
      a.candles?.candles.at(-1) &&
      sessionDate(a.candles.candles.at(-1)!.time) === date,
  );
  const meta: Meta = {
    source: [
      "TradingView daily",
      ...(Object.keys(foreign).length ? ["Sectors /foreign-flow/"] : []),
      "Sectors broker aggregates and company directory",
    ],
    as_of:
      included
        .map((a) => a.calculatedAt)
        .sort()
        .at(-1) ?? null,
    period_start: date,
    period_end: date,
    calculation_method: "equal-weight analysed subset, common latest session",
    data_status: included.length ? "DERIVED" : "UNAVAILABLE",
    confidence: included.length ? 40 : 0,
    quality_flags: [
      "PARTIAL_UNIVERSE",
      "NOT_OFFICIAL_SECTOR_INDEX",
      "FOREIGN_FLOW_NOT_BROKER_AFFILIATION",
      "CURRENT_JAKARTA_SESSION_EXCLUDED",
    ],
  };
  const members = included.flatMap((a) => {
    const bars = a.candles!.candles,
      last = bars.at(-1)!,
      prior = bars.at(-2);
    if (!prior) return [];
    const baseline = bars.slice(-21, -1);
    const avg =
      baseline.length >= 5
        ? baseline.reduce((s, c) => s + c.volume, 0) / baseline.length
        : null;
    const flow = a.broker.flows.filter((f) => f.date === date);
    const profileRegistry = registry ?? a.inventory.map((row) => row.profile);
    const proxy = flow.filter(
      (f) =>
        brokerProfile(f.brokerCode, profileRegistry, f.date, a.ticker)
          .classification === "INSTITUTIONAL_ASSOCIATED",
    );
    return [
      {
        symbol: a.ticker,
        sector: stocks.find((s) => s.ticker === a.ticker)?.sector ?? "Unknown",
        phase:
          a.regions.find(
            (r) =>
              sessionDate(r.startTimestamp) <= date! &&
              sessionDate(r.endTimestamp) >= date!,
          )?.phase ?? "INSUFFICIENT_DATA",
        return: last.close / prior.close - 1,
        relativeVolume: avg && avg > 0 ? last.volume / avg : null,
        volume: last.volume,
        foreignNetValue:
          foreign[a.ticker]?.find((f) => f.date === date)?.net ?? null,
        institutionalNetValue:
          proxy.length &&
          proxy.every(
            (f) => f.buyValue !== undefined && f.sellValue !== undefined,
          )
            ? proxy.reduce((s, f) => s + f.buyValue! - f.sellValue!, 0)
            : null,
        transitionCount: a.regions.filter(
          (r) => sessionDate(r.startTimestamp) === date,
        ).length,
      },
    ];
  });
  const benchmark = members.length
    ? members.reduce((s, m) => s + m.return, 0) / members.length
    : 0;
  const sectors = [...new Set(members.map((m) => m.sector))].map((sector) => {
    const rows = members.filter((m) => m.sector === sector),
      ret = rows.reduce((s, r) => s + r.return, 0) / rows.length,
      rv = rows.every((r) => r.relativeVolume !== null)
        ? rows.reduce((s, r) => s + r.relativeVolume!, 0) / rows.length
        : null,
      flow = rows.every((r) => r.institutionalNetValue !== null)
        ? rows.reduce((s, r) => s + r.institutionalNetValue!, 0)
        : null,
      x = (ret - benchmark) * 100,
      y = rv === null ? null : rv - 1;
    return {
      sector,
      members: rows,
      metrics: {
        return: metric(ret, meta, "equal-weight one-session return"),
        relativeStrength: metric(
          x,
          meta,
          "sector return − analysed-subset return, percentage points",
        ),
        relativeVolume: metric(
          rv,
          meta,
          "mean stock volume / trailing 20-session mean, min 5 observations",
        ),
        breadth: metric(
          rows.filter((r) => r.return > 0).length / rows.length,
          meta,
          "advancers / included stocks",
        ),
        institutionalFlow: metric(
          flow,
          meta,
          "observed institutional-proxy net value; missing stays null",
        ),
        foreignFlow: metric(
          rows.every((r) => r.foreignNetValue !== null)
            ? rows.reduce((s, r) => s + r.foreignNetValue!, 0)
            : null,
          {
            ...meta,
            source: ["Sectors /foreign-flow/"],
            as_of:
              Object.values(foreign)
                .flat()
                .map((f) => f.asOf)
                .sort()
                .at(-1) ?? null,
          },
          "sum aligned investor-origin net flow for all included sector members; any missing stays null",
        ),
        transitions: metric(
          rows.reduce((s, r) => s + r.transitionCount, 0),
          meta,
          "new segments on session",
        ),
      },
      quadrant:
        y === null
          ? "Unavailable"
          : x >= 0
            ? y >= 0
              ? "Leading"
              : "Weakening"
            : y >= 0
              ? "Improving"
              : "Lagging",
      phaseCounts: Object.fromEntries(
        [...new Set(rows.map((r) => r.phase))].map((p) => [
          p,
          rows.filter((r) => r.phase === p).length,
        ]),
      ),
    };
  });
  return {
    meta,
    members,
    sectors,
    coverage: stocks.length ? members.length / stocks.length : 0,
    summary: {
      foreignNetFlow: metric(
        members.length && members.every((m) => m.foreignNetValue !== null)
          ? members.reduce((s, m) => s + m.foreignNetValue!, 0)
          : null,
        { ...meta, source: ["Sectors /foreign-flow/"] },
        "sum aligned investor-origin net flow for included stocks",
      ),
      advancers: metric(
        members.length ? members.filter((m) => m.return > 0).length : null,
        meta,
        "subset advancing stocks",
      ),
      decliners: metric(
        members.length ? members.filter((m) => m.return < 0).length : null,
        meta,
        "subset declining stocks",
      ),
      volume: metric(
        members.length ? members.reduce((s, m) => s + m.volume, 0) : null,
        meta,
        "subset reported daily volume",
      ),
      marketValue: metric(
        null,
        meta,
        "verified market-wide traded value unavailable",
      ),
      ihsg: metric(null, meta, "verified IHSG series not configured"),
    },
  };
}
export function seasonality(bars: MarketCandle[]) {
  const returns = bars.slice(1).map((b, i) => ({
    date: sessionDate(b.time),
    value: b.close / bars[i].close - 1,
    volume: b.volume,
  }));
  return ["month", "weekday"].flatMap((kind) =>
    Array.from({ length: kind === "month" ? 12 : 7 }, (_, i) => {
      const rows = returns.filter((r) =>
          kind === "month"
            ? Number(r.date.slice(5, 7)) === i + 1
            : new Date(r.date + "T00:00:00Z").getUTCDay() === i,
        ),
        v = rows.map((r) => r.value).sort((a, b) => a - b),
        n = v.length,
        w = v.filter((x) => x > 0).length,
        p = n ? w / n : 0,
        z = 1.96,
        den = 1 + (z * z) / Math.max(n, 1),
        center = (p + (z * z) / (2 * Math.max(n, 1))) / den,
        half =
          (z *
            Math.sqrt(
              (p * (1 - p)) / Math.max(n, 1) +
                (z * z) / (4 * Math.max(n, 1) ** 2),
            )) /
          den;
      return {
        kind,
        bucket: i + (kind === "month" ? 1 : 0),
        sampleSize: n,
        medianReturn: n
          ? (v[Math.floor((n - 1) / 2)] + v[Math.floor(n / 2)]) / 2
          : null,
        winRate: n ? p : null,
        winRateCI: n
          ? [Math.max(0, center - half), Math.min(1, center + half)]
          : null,
        meanVolume: n ? rows.reduce((s, r) => s + r.volume, 0) / n : null,
      };
    }),
  );
}
