"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, TriangleAlert, ArrowUpRight, Activity } from "lucide-react";
import type { StockDetail } from "@/domain/market";
import { dateLabel, number, percent, phaseLabel, signed } from "@/lib/format";
import { CandleChart } from "./charts/candles";
import { TradingViewMarketChart } from "./charts/tradingview-market-chart";
import { FlowChart } from "./charts/flow";
import { DemoNotice, PageHeading, Panel, PhaseBadge } from "./ui";

export function StockAnalysis({ stock }: { stock: StockDetail }) {
  const [window, setWindow] = useState(60);
  const candles = useMemo(
    () => stock.candles.slice(-window),
    [stock.candles, window],
  );
  const latest = stock.candles.at(-1)!,
    previous = stock.candles.at(-2)!;
  const change = (latest.close / previous.close - 1) * 100;
  const cohortDates = stock.candles
    .filter((c) => c.date >= stock.phase.periodStart)
    .map((c) => c.date);
  const values = cohortDates.map((date) =>
    stock.flows
      .filter(
        (f) =>
          f.date >= stock.phase.periodStart &&
          f.date <= date &&
          ["D1", "D2"].includes(f.brokerCode),
      )
      .reduce((s, f) => s + f.buyLot - f.sellLot, 0),
  );
  const total = values.at(-1) ?? 0;

  return (
    <div className="space-y-2 font-mono">
      <PageHeading
        eyebrow="FLOWPHASE // STOCK ANALYSIS COCKPIT"
        title={`${stock.scanner.ticker} · ${stock.scanner.companyName}`}
        description={`${stock.scanner.sector ?? "General"} // IDX TICKER LABEL · SYNTHETIC DEMO SCENARIO`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/scanner" className="button">
              ALL STOCKS [F2]
            </Link>
            <Link href="/watchlist" className="button primary">
              WATCHLIST [F8]
            </Link>
          </div>
        }
      />

      <div className="panel" style={{ padding: 0, marginBottom: 6 }}>
        <div className="panel-heading">
          <div className="panel-title">
            <Activity size={12} className="text-cyan" />
            <span>[TRADINGVIEW MARKET CHART // {stock.scanner.ticker}]</span>
          </div>
          <span className="panel-tag">INTERACTIVE HUD</span>
        </div>
        <TradingViewMarketChart
          key={stock.scanner.ticker}
          ticker={stock.scanner.ticker}
        />
      </div>

      <DemoNotice />

      <div className="detail-metrics">
        <div className="detail-metric">
          <span>CLOSING PRICE (IDR)</span>
          <strong className="text-white">{number(latest.close)}</strong>
          <small className={change >= 0 ? "positive font-bold" : "negative font-bold"}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}% VS PREV SESSION
          </small>
        </div>

        <div className="detail-metric">
          <span>DETECTED PHASE</span>
          <div>
            <PhaseBadge phase={stock.phase.phase} />
          </div>
          <small>CONFIDENCE: {stock.phase.confidence}/100</small>
        </div>

        <div className="detail-metric">
          <span>CYCLE START PERIOD</span>
          <strong className="text-amber">{dateLabel(stock.phase.periodStart)}</strong>
          <small>{cohortDates.length} OBSERVED SESSIONS</small>
        </div>

        <div className="detail-metric">
          <span>DATA PROVENANCE</span>
          <strong className="text-slate-300">{phaseLabel(stock.phase.dataQuality)}</strong>
          <small>FIXTURE DETERMINISTIC DATA</small>
        </div>
      </div>

      <div className="detail-layout">
        <Panel
          title="[SEC.01 // PRICE_AND_VOLUME_BARS]"
          note="IDR CANDLESTICK HISTORY"
          action={
            <div className="flex items-center gap-1" aria-label="Chart period">
              {[20, 40, 60].map((n) => (
                <button
                  key={n}
                  className={`terminal-btn text-[9.5px] ${window === n ? "active" : ""}`}
                  aria-pressed={window === n}
                  onClick={() => setWindow(n)}
                >
                  {n} BARS
                </button>
              ))}
            </div>
          }
        >
          <div className="p-1">
            <CandleChart candles={candles} />
          </div>
          <div className="chart-caption">
            <span>VOLUME SHARES OCCUPIES THE LOWER BAND</span>
            <a
              className="text-cyan hover:text-amber font-semibold"
              href="https://www.tradingview.com/"
              target="_blank"
              rel="noreferrer"
            >
              CHARTS BY TRADINGVIEW →
            </a>
          </div>

          <div className="phase-timeline">
            {stock.cycles
              .filter((c) => c.end >= candles[0].date)
              .map((c) => (
                <div
                  key={c.id}
                  className={`phase-segment phase-${c.phase.toLowerCase()}`}
                  style={{
                    flex: stock.candles.filter(
                      (d) =>
                        d.date >= c.start &&
                        d.date <= c.end &&
                        d.date >= candles[0].date,
                    ).length,
                  }}
                >
                  {phaseLabel(c.phase)}
                  <small className="block text-[8px] text-slate-400 font-normal">
                    {dateLabel(
                      c.start < candles[0].date ? candles[0].date : c.start,
                    )}{" "}
                    — {dateLabel(c.end)}
                  </small>
                </div>
              ))}
          </div>
        </Panel>

        <Panel
          title="[SEC.02 // HEURISTIC_EVIDENCE]"
          note="PHASE MODEL DETECTION REASONING"
        >
          <ul className="evidence-list">
            {stock.phase.evidence.map((e) => (
              <li key={e} className="flex items-start gap-2">
                <Check size={13} className="text-green shrink-0 mt-0.5" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
          {stock.phase.warnings.length > 0 && (
            <div className="warning-list">
              <h3>
                <TriangleAlert size={12} className="text-red" /> INTERPRETATION LIMITS
              </h3>
              {stock.phase.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="two-column">
        <Panel
          title="[SEC.03 // BROKER_FLOW_COHORT]"
          note="COHORT D1 + D2 ACCUMULATION ESTIMATE"
        >
          <div className="p-3 bg-slate-950 flex items-baseline justify-between border-b border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block">NET COHORT FLOW</span>
              <strong
                className={`text-xl font-bold tabular-nums ${
                  total >= 0 ? "positive" : "negative"
                }`}
              >
                {signed(total)} LOTS
              </strong>
            </div>
            <span className="text-[9.5px] text-slate-500">
              ALL-BROKER SUM EQUALS ZERO
            </span>
          </div>
          <FlowChart values={values} />
        </Panel>

        <Panel
          title="[SEC.04 // PERIOD_COMPARISON]"
          note="COMPARATIVE RETURN BY PHASE PERIOD"
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PERIOD PHASE</th>
                  <th>SESSIONS</th>
                  <th className="text-right">PRICE RETURN</th>
                </tr>
              </thead>
              <tbody>
                {stock.cycles.slice(-2).map((c) => {
                  const rows = stock.candles.filter(
                    (d) => d.date >= c.start && d.date <= c.end,
                  );
                  const ret = (rows.at(-1)!.close / rows[0].close - 1) * 100;
                  return (
                    <tr key={c.id}>
                      <td>
                        <PhaseBadge phase={c.phase} />
                        <small className="block text-[9.5px] text-slate-400 mt-1">
                          {dateLabel(c.start)} — {dateLabel(c.end)}
                        </small>
                      </td>
                      <td className="tabular-nums font-bold">{rows.length}</td>
                      <td className={`text-right tabular-nums font-bold ${ret >= 0 ? "positive" : "negative"}`}>
                        {ret.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel
        title="[SEC.05 // OBSERVED_INVENTORY_DELTA]"
        note="TRANSACTION-FLOW ESTIMATES RESET AT CYCLE START"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>BROKER CODE</th>
                <th>ROLE CLASSIFICATION</th>
                <th className="text-right">SIGNED NET LOTS</th>
                <th className="text-right">PEAK ESTIMATE</th>
                <th className="text-right">REMAINING ESTIMATE</th>
                <th className="text-right">REMAINING / PEAK</th>
              </tr>
            </thead>
            <tbody>
              {stock.inventory.map((b) => (
                <tr key={b.brokerCode}>
                  <td className="font-bold text-cyan">{b.brokerCode}</td>
                  <td className="uppercase text-slate-300">
                    {b.role.toLowerCase().replaceAll("_", " ")}
                  </td>
                  <td
                    className={`text-right font-bold tabular-nums ${
                      b.cumulativeNetLot >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {signed(b.cumulativeNetLot)}
                  </td>
                  <td className="text-right tabular-nums">{number(b.peakEstimatedInventory)}</td>
                  <td className="text-right tabular-nums font-semibold">{number(b.estimatedRemainingInventory)} LOTS</td>
                  <td className="text-right tabular-nums font-bold text-amber">{percent(b.remainingRatio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-footnote">
          ESTIMATES RESET AT {stock.phase.periodStart}. OPENING INVENTORY PRIOR TO PERIOD START IS UNKNOWN.
        </div>
      </Panel>
    </div>
  );
}
