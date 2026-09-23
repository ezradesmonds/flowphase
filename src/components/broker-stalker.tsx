"use client";
import { useState } from "react";
import Link from "next/link";
import type { brokerUniverse } from "@/lib/intelligence/extended/service";
import {
  Value,
  Evidence,
  SaveResearch,
  exportCSV,
} from "./research-primitives";
type Data = Awaited<ReturnType<typeof brokerUniverse>>;
export function BrokerStalker({
  data,
  initialCode = "",
}: {
  data: Data;
  initialCode?: string;
}) {
  const [query, setQuery] = useState(initialCode),
    [sort, setSort] = useState("netLot");
  const rows = data.rows
    .filter((r) =>
      [r.broker.code, ...(r.broker.affiliation ? [r.broker.name] : [])].some(
        (s) => s.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    )
    .sort(
      (a, b) =>
        (b.metrics[sort as keyof typeof b.metrics].value ?? -Infinity) -
        (a.metrics[sort as keyof typeof a.metrics].value ?? -Infinity),
    );
  return (
    <section className="panel research-module">
      <h2>Broker Stalker</h2>
      <p>
        Coverage: {(data.coverage * 100).toFixed(1)}% of {data.total} supported
        stocks. This lists acquired analyses, not all trades across IDX. Open a
        stock to acquire its available broker history.
      </p>
      <div className="research-filters">
        <label>
          Broker code or name
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="AI, XL…"
          />
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {[
              "netLot",
              "netValue",
              "totalFrequency",
              "averageLot",
              "crossingRisk",
            ].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() =>
            exportCSV(
              rows.map((r) => ({
                symbol: r.symbol,
                broker: r.broker.code,
                ...Object.fromEntries(
                  Object.entries(r.metrics).map(([k, m]) => [k, m.value]),
                ),
                metadata: JSON.stringify(r.meta),
              })),
              "broker-stalker.csv",
            )
          }
        >
          Export CSV
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Broker",
                "Symbol / company",
                "Sector / phase",
                "Buy lot",
                "Sell lot",
                "Net lot",
                "Net value",
                "Frequency",
                "Avg lot/trade",
                "Avg buy price",
                "Avg sell price",
                "Observed net since start",
                "PnL",
                "Crossing",
                "Latest activity",
              ].map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol + r.broker.code}>
                <td>
                  {r.broker.code}
                  <small>
                    {r.broker.name}
                    <br />
                    {r.broker.ownershipType}
                    <br />
                    {r.broker.behaviorProxy}
                  </small>
                  <SaveResearch
                    type="BROKER"
                    id={r.broker.code}
                    label={r.broker.code}
                  />
                </td>
                <td>
                  <Link href={"/stocks/" + r.symbol}>{r.symbol}</Link>
                  <small>{r.company}</small>
                </td>
                <td>
                  {r.sector}
                  <small>{r.currentPhase}</small>
                </td>
                {(
                  [
                    "buyLot",
                    "sellLot",
                    "netLot",
                    "netValue",
                    "totalFrequency",
                    "averageLot",
                    "averageBuyPrice",
                    "averageSellPrice",
                    "observedClosing",
                    "unrealizedPnl",
                    "crossingRisk",
                  ] as const
                ).map((k) => (
                  <td key={k}>
                    <Value metric={r.metrics[k]} />
                  </td>
                ))}
                <td>
                  {r.history.at(-1)?.date ?? "Unavailable"}
                  <Evidence value={r.meta} />
                  <Link href={"/stocks/" + r.symbol + "#broker-timeline"}>
                    Phase behavior →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="empty-state">
          No acquired broker observations match. Names and affiliations remain
          Unknown until officially sourced.
        </p>
      )}
      <p>
        Split execution unavailable: no verified tick data. Foreign-affiliated
        brokers do not measure foreign investor flow.
      </p>
    </section>
  );
}
