"use client";

import { useMemo, useState } from "react";
import type { Intelligence } from "@/domain/intelligence";
import { display, exportCSV } from "./research-primitives";

type BrokerRow = {
  code: string;
  buyValue: number | null;
  sellValue: number | null;
  buyLot: number;
  sellLot: number;
  netValue: number | null;
  netLot: number;
  frequency: number | null;
  averagePerTransaction: number | null;
  foreignNetValue: number | null;
  domesticNetValue: number | null;
};

const money = (value: number | null) => {
  if (value === null) return "Unavailable";
  const absolute = Math.abs(value);
  const units = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
  ] as const;
  const unit = units.find(([size]) => absolute >= size);
  return unit
    ? `${value < 0 ? "−" : ""}${(absolute / unit[0]).toFixed(2)}${unit[1]}`
    : display(value);
};

export function BrokerSummaryWorkspace({ analysis }: { analysis: Intelligence }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const grouped = new Map<string, BrokerRow>();
    for (const flow of analysis.broker.flows) {
      const current = grouped.get(flow.brokerCode) ?? {
        code: flow.brokerCode,
        buyValue: 0,
        sellValue: 0,
        buyLot: 0,
        sellLot: 0,
        netValue: 0,
        netLot: 0,
        frequency: 0,
        averagePerTransaction: null,
        foreignNetValue: 0,
        domesticNetValue: 0,
      };
      current.buyLot += flow.buyLot;
      current.sellLot += flow.sellLot;
      current.buyValue =
        current.buyValue === null || flow.buyValue === undefined
          ? null
          : current.buyValue + flow.buyValue;
      current.sellValue =
        current.sellValue === null || flow.sellValue === undefined
          ? null
          : current.sellValue + flow.sellValue;
      current.frequency =
        current.frequency === null ||
        flow.buyFrequency === undefined ||
        flow.sellFrequency === undefined
          ? null
          : current.frequency + flow.buyFrequency + flow.sellFrequency;
      const foreignFields = [
        flow.foreignBuyValue,
        flow.foreignSellValue,
      ];
      current.foreignNetValue =
        current.foreignNetValue === null || foreignFields.some((value) => value === undefined)
          ? null
          : current.foreignNetValue + flow.foreignBuyValue! - flow.foreignSellValue!;
      grouped.set(flow.brokerCode, current);
    }
    return [...grouped.values()]
      .map((row) => {
        const netValue =
          row.buyValue === null || row.sellValue === null
            ? null
            : row.buyValue - row.sellValue;
        return {
          ...row,
          netLot: row.buyLot - row.sellLot,
          netValue,
          averagePerTransaction:
            row.frequency && row.buyValue !== null && row.sellValue !== null
              ? (row.buyValue + row.sellValue) / row.frequency
              : null,
          domesticNetValue:
            netValue === null || row.foreignNetValue === null
              ? null
              : netValue - row.foreignNetValue,
        };
      })
      .sort((a, b) => (b.netValue ?? -Infinity) - (a.netValue ?? -Infinity));
  }, [analysis.broker.flows]);

  const visible = rows.filter((row) =>
    row.code.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const totalBuy = rows.every((row) => row.buyValue !== null)
    ? rows.reduce((sum, row) => sum + row.buyValue!, 0)
    : null;
  const totalSell = rows.every((row) => row.sellValue !== null)
    ? rows.reduce((sum, row) => sum + row.sellValue!, 0)
    : null;

  return (
    <section className="panel research-module broker-summary-module">
      <div className="research-module-heading">
        <div>
          <p className="module-kicker">[ Broker Summary ]</p>
          <h2>Raw Buy And Sell Activity By Broker</h2>
          <p className="muted">
            {analysis.ticker} · {analysis.broker.start || "Period Unavailable"} →{" "}
            {analysis.broker.end || "Period Unavailable"} · Sectors Daily Broker Summary
          </p>
        </div>
        <span className="panel-tag text-cyan">{rows.length} Brokers</span>
      </div>

      <div className="research-cards broker-summary-cards">
        <div><small>Total Buy</small><strong>{money(totalBuy)}</strong></div>
        <div><small>Total Sell</small><strong>{money(totalSell)}</strong></div>
        <div><small>Net Value</small><strong>{money(totalBuy === null || totalSell === null ? null : totalBuy - totalSell)}</strong></div>
        <div><small>Coverage</small><strong>{analysis.broker.flows.length} Daily Rows</strong></div>
      </div>

      <div className="research-filters">
        <label>
          Filter Broker
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Code…"
          />
        </label>
        <button
          className="button"
          onClick={() => exportCSV(visible, `${analysis.ticker}-broker-summary.csv`)}
        >
          Export CSV
        </button>
      </div>

      {visible.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Broker</th><th>Buy (Rp)</th><th>Buy (Lot)</th>
                <th>Sell (Rp)</th><th>Sell (Lot)</th><th>Net Value (Rp)</th>
                <th>Net Lot</th><th>Net Foreign</th><th>Net Domestic</th><th>Frequency</th><th>Average / Transaction</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => (
                <tr key={row.code}>
                  <td>{index + 1}</td>
                  <td><strong className="text-cyan">{row.code}</strong></td>
                  <td>{money(row.buyValue)}</td><td>{display(row.buyLot)}</td>
                  <td>{money(row.sellValue)}</td><td>{display(row.sellLot)}</td>
                  <td className={(row.netValue ?? 0) >= 0 ? "positive" : "negative"}>{money(row.netValue)}</td>
                  <td className={row.netLot >= 0 ? "positive" : "negative"}>{display(row.netLot)}</td>
                  <td>{money(row.foreignNetValue)}</td><td>{money(row.domesticNetValue)}</td>
                  <td>{display(row.frequency)}</td><td>{money(row.averagePerTransaction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">No Broker Rows Match This Filter.</p>
      )}
      <p className="muted broker-disclaimer">
        Net Broker Flow Is Transaction Activity, Not Shareholder Ownership. Missing Provider Fields Remain Unavailable.
      </p>
    </section>
  );
}
