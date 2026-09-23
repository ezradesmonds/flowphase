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
import { PageHeading, Panel } from "./ui";

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
    <div className="space-y-2 font-mono">
      <PageHeading
        eyebrow="FLOWPHASE // BROKER SURVEILLANCE"
        title="BROKER STALKER & INSTITUTIONAL FLOW COCKPIT"
        description={`Observed coverage: ${(data.coverage * 100).toFixed(1)}% of ${data.total} supported IDX securities.`}
      />

      <Panel title="[SEC.01 // BROKER_SEARCH_AND_EXPORT]">
        <div className="filter-toolbar" style={{ margin: 0, border: "none" }}>
          <div className="filter-group">
            <span className="filter-label">BROKER CODE / NAME:</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.G. AI, XL, YP, CC..."
              className="w-48 text-xs uppercase"
            />
          </div>

          <div className="filter-group">
            <span className="filter-label">SORT METRIC:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {[
                "netLot",
                "netValue",
                "totalFrequency",
                "averageLot",
                "crossingRisk",
              ].map((k) => (
                <option key={k} value={k}>{k.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <button
            className="terminal-btn primary ml-auto"
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
            EXPORT CSV [↵]
          </button>
        </div>
      </Panel>

      <div className="panel table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "BROKER",
                "SECURITY",
                "SECTOR / PHASE",
                "BUY LOT",
                "SELL LOT",
                "NET LOT",
                "NET VALUE (IDR)",
                "FREQUENCY",
                "AVG LOT/TRADE",
                "AVG BUY",
                "AVG SELL",
                "OBSERVED NET",
                "UNREALIZED PNL",
                "CROSSING",
                "LATEST / ACTION",
              ].map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol + r.broker.code}>
                <td>
                  <strong className="text-cyan font-bold block">{r.broker.code}</strong>
                  <small className="text-[9px] text-slate-400 block">
                    {r.broker.name} · {r.broker.ownershipType}
                  </small>
                </td>
                <td>
                  <Link href={"/stocks/" + r.symbol} className="text-amber hover:text-white font-bold">
                    {r.symbol}
                  </Link>
                  <small className="block text-[9.5px] text-slate-400">{r.company}</small>
                </td>
                <td>
                  <span className="text-slate-200">{r.sector}</span>
                  <small className="block text-amber font-semibold">{r.currentPhase}</small>
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
                  <td key={k} className="tabular-nums">
                    <Value metric={r.metrics[k]} />
                  </td>
                ))}
                <td>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">
                      {r.history.at(-1)?.date ?? "Unavailable"}
                    </span>
                    <Link
                      href={"/stocks/" + r.symbol + "#broker-timeline"}
                      className="terminal-btn text-[9px] py-0.2 px-1 text-cyan"
                    >
                      PHASE →
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length && (
        <p className="empty-state p-6 text-center text-xs text-slate-500 font-mono">
          NO MATCHING BROKER OBSERVATIONS. NAMES AND AFFILIATIONS REMAIN SOURCED DIRECTLY FROM OFFICIAL REGISTRATIONS.
        </p>
      )}
    </div>
  );
}
