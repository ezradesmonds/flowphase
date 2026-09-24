"use client";
import { ForeignFlowPanel } from "./foreign-flow-panel";
import { ExtendedAlerts } from "./extended-alerts";
import { extendedAlerts } from "@/lib/intelligence/extended/alerts";
import { useState } from "react";
import type { Intelligence } from "@/domain/intelligence";
import { BrokerInventoryWorkspace } from "./broker-inventory-workspace";
import { BrokerSummaryWorkspace } from "./broker-summary-workspace";
import { HolderWorkspace } from "./holder-workspace";
import { OwnershipWorkspace } from "./ownership-workspace";
import { seasonality } from "@/lib/intelligence/extended/market";
import { positionSize } from "@/lib/intelligence/extended/model";
import { display, Evidence } from "./research-primitives";
export function StockResearchTabs({ analysis }: { analysis: Intelligence }) {
  const [tab, setTab] = useState("Analisa Broker"),
    [risk, setRisk] = useState(100000),
    [entry, setEntry] = useState(0),
    [stop, setStop] = useState(0),
    [buffer, setBuffer] = useState(3);
  let sizing = null;
  try {
    sizing = positionSize(risk, entry, stop, null, buffer);
  } catch {}
  const seasonal = seasonality(analysis.candles?.candles ?? []);
  return (
    <div className="research-workspace">
      <nav className="research-tabs" aria-label="Stock research tabs">
        {[
          "Analisa Broker",
          "Broker Summary",
          "Holder > 1%",
          "Holder > 5%",
          "Peta Investor",
          "Institutional Proxy Flow",
          "Seasonality",
          "Money & Risk",
        ].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {tab === "Analisa Broker" ? (
        <BrokerInventoryWorkspace analysis={analysis} />
      ) : tab === "Broker Summary" ? (
        <BrokerSummaryWorkspace analysis={analysis} />
      ) : tab === "Holder > 1%" ? (
        <HolderWorkspace symbol={analysis.ticker} minimumPercentage={1} />
      ) : tab === "Holder > 5%" ? (
        <HolderWorkspace symbol={analysis.ticker} minimumPercentage={5} />
      ) : tab === "Peta Investor" ? (
        <OwnershipWorkspace symbol={analysis.ticker} initialThreshold={1} />
      ) : tab === "Institutional Proxy Flow" ? (
        <>
          <ForeignFlowPanel symbol={analysis.ticker} />
          <ExtendedAlerts alerts={extendedAlerts(analysis)} />
        </>
      ) : tab === "Seasonality" ? (
        <section className="panel research-module">
          <h2>Seasonality · supporting evidence</h2>
          <p>
            Daily returns grouped by calendar month or weekday. Wilson 95%
            interval for positive-return frequency. No phase is determined by
            seasonality. Event-window behavior unavailable without aligned
            verified events.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Sample size</th>
                  <th>Median daily return</th>
                  <th>Win rate</th>
                  <th>95% win-rate interval</th>
                  <th>Mean volume</th>
                </tr>
              </thead>
              <tbody>
                {seasonal.map((s) => (
                  <tr key={s.kind + s.bucket}>
                    <td>
                      {s.kind} {s.bucket}
                    </td>
                    <td>{s.sampleSize}</td>
                    <td>
                      {display(
                        s.medianReturn === null ? null : s.medianReturn * 100,
                      )}
                      %
                    </td>
                    <td>
                      {display(s.winRate === null ? null : s.winRate * 100)}%
                    </td>
                    <td>
                      {s.winRateCI
                        ?.map((n) => display(n * 100) + "%")
                        .join(" – ") ?? "Unavailable"}
                    </td>
                    <td>{display(s.meanVolume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Evidence
            value={{
              source: analysis.candles?.source,
              as_of: analysis.candles?.fetchedAt,
              calculation_method:
                "daily close-to-close returns; unadjusted action risk; non-independent observations",
              period_start: analysis.candles?.candles[0]?.time,
              period_end: analysis.candles?.candles.at(-1)?.time,
              data_status: "DERIVED",
              confidence: 30,
              quality_flags: ["SMALL_SAMPLES", "SUPPORTING_EVIDENCE_ONLY"],
            }}
          />
        </section>
      ) : (
        <section className="panel research-module">
          <h2>Money & Risk Management</h2>
          <div className="research-filters">
            {(
              [
                ["Maximum risk Rp", risk, setRisk],
                ["Entry price", entry, setEntry],
                ["Stop-loss price", stop, setStop],
                ["Liquidity buffer", buffer, setBuffer],
              ] as const
            ).map(([label, value, setter]) => (
              <label key={label}>
                {label}
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => setter(Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          <p>
            Position:{" "}
            {sizing
              ? display(sizing.positionLot) + " lots"
              : "Enter positive, distinct entry/stop prices"}{" "}
            · Required visible exit capacity:{" "}
            {sizing
              ? display(sizing.requiredVisibleExitCapacity) + " lots"
              : "Unavailable"}
          </p>
          <p>
            Visible exit liquidity and exit coverage ratio: unavailable. Visible
            bids can be cancelled and are not an exit guarantee. Size excludes
            fees and slippage.
          </p>
        </section>
      )}
    </div>
  );
}
