"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, TriangleAlert } from "lucide-react";
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
    <>
      <PageHeading
        eyebrow="RESEARCH / STOCK ANALYSIS"
        title={`${stock.scanner.ticker} · ${stock.scanner.companyName}`}
        description={`${stock.scanner.sector} / IDX ticker label · Synthetic demo scenario`}
        action={
          <Link href="/watchlist" className="button">
            Manage watchlist
          </Link>
        }
      />
      <TradingViewMarketChart
        key={stock.scanner.ticker}
        ticker={stock.scanner.ticker}
      />
      <div className="content-gap">
        <DemoNotice />
      </div>
      <div className="detail-metrics">
        <div className="detail-metric">
          <span>Demo closing price · IDR</span>
          <strong>{number(latest.close)}</strong>
          <small className={change >= 0 ? "positive" : "negative"}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}% vs previous demo session
          </small>
        </div>
        <div className="detail-metric">
          <span>Illustrative phase</span>
          <strong>
            <PhaseBadge phase={stock.phase.phase} />
          </strong>
          <small>Phase confidence · {stock.phase.confidence}/100</small>
        </div>
        <div className="detail-metric">
          <span>Authored cycle start</span>
          <strong>{dateLabel(stock.phase.periodStart)}</strong>
          <small>{cohortDates.length} demo sessions · 2026</small>
        </div>
        <div className="detail-metric">
          <span>Data quality</span>
          <strong>{phaseLabel(stock.phase.dataQuality)}</strong>
          <small>Fixture data · no provider verification</small>
        </div>
      </div>
      <div className="detail-layout">
        <Panel
          title="Price & volume"
          note="IDR · Synthetic daily candles"
          action={
            <div className="period-controls" aria-label="Chart period">
              {[20, 40, 60].map((n) => (
                <button
                  key={n}
                  aria-pressed={window === n}
                  onClick={() => setWindow(n)}
                >
                  {n} sessions
                </button>
              ))}
            </div>
          }
        >
          <CandleChart candles={candles} />
          <p className="chart-caption">
            Volume (shares) occupies the lower chart band. Pan or zoom to
            inspect.{" "}
            <a
              className="text-link"
              href="https://www.tradingview.com/"
              target="_blank"
              rel="noreferrer"
            >
              Charts by TradingView
            </a>
          </p>
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
                  <small>
                    {dateLabel(
                      c.start < candles[0].date ? candles[0].date : c.start,
                    )}{" "}
                    — {dateLabel(c.end)}
                  </small>
                </div>
              ))}
          </div>
          <p className="chart-caption">
            Authored phase timeline follows the selected session window; it does
            not track chart panning. This demo timeline remains authored;
            calculated regions appear on the TradingView chart above.
          </p>
        </Panel>
        <Panel
          title="Why this phase?"
          note="Transparent evidence for the illustrative scenario"
        >
          <ul className="evidence-list">
            {stock.phase.evidence.map((e) => (
              <li key={e}>
                <Check size={15} />
                <span>{e}</span>
              </li>
            ))}
          </ul>
          <div className="warning-list">
            <h3>
              <TriangleAlert size={15} /> Interpretation warnings
            </h3>
            {stock.phase.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        </Panel>
      </div>
      <div className="two-column">
        <Panel
          title="Broker flow summary"
          note="Demo cohort D1 + D2 · lots since cycle start"
        >
          <div style={{ padding: "0 22px" }}>
            <strong
              className={total >= 0 ? "positive" : "negative"}
              style={{ fontSize: 28 }}
            >
              {signed(total)} <small>net lots</small>
            </strong>
            <p style={{ fontSize: 11, marginTop: 6 }}>
              Fixed cohort for comparison; all-broker net flow sums to zero.
            </p>
          </div>
          <FlowChart values={values} />
        </Panel>
        <Panel
          title="Period comparison"
          note="Two authored demo periods · automatic detection pending"
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Demo period</th>
                  <th>Sessions</th>
                  <th>Price progress</th>
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
                        <small
                          style={{
                            display: "block",
                            marginTop: 8,
                            color: "var(--muted)",
                          }}
                        >
                          {dateLabel(c.start)} — {dateLabel(c.end)}
                        </small>
                      </td>
                      <td>{rows.length}</td>
                      <td className={ret >= 0 ? "positive" : "negative"}>
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
        title="Observed inventory change since cycle start"
        note="Transaction-flow estimates, not broker ownership. Broker codes D1–D4 are fictional."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Demo broker",
                  "Role",
                  "Signed net lots",
                  "Peak estimate",
                  "Remaining estimate",
                  "Remaining / peak",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stock.inventory.map((b) => (
                <tr key={b.brokerCode}>
                  <td>{b.brokerCode}</td>
                  <td>{b.role.toLowerCase().replaceAll("_", " ")}</td>
                  <td
                    className={
                      b.cumulativeNetLot >= 0 ? "positive" : "negative"
                    }
                  >
                    {signed(b.cumulativeNetLot)}
                  </td>
                  <td>{number(b.peakEstimatedInventory)}</td>
                  <td>{number(b.estimatedRemainingInventory)} lots</td>
                  <td>{percent(b.remainingRatio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-footnote">
          Estimates reset at {stock.phase.periodStart}. Negative signed flows
          are retained. Opening inventory is unknown; remaining holdings and ratios are unavailable.
        </div>
      </Panel>
      <div className="two-column content-gap">
        <Panel
          title="Cycle timeline"
          note="Predetermined scenarios for interface exploration"
        >
          <div className="evidence-list">
            {stock.cycles.map((c) => (
              <div key={c.id} style={{ marginBottom: 16 }}>
                <PhaseBadge phase={c.phase} />
                <p style={{ fontSize: 12, marginTop: 7 }}>
                  {dateLabel(c.start)} — {dateLabel(c.end)} · {c.explanation}
                </p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Data provenance" note="Transparent by design">
          <div className="settings-list">
            <div className="settings-row">
              <div>
                <h3>Local deterministic fixtures</h3>
                <p>
                  Snapshot: 28 August 2026 · 09:00 UTC
                  <br />
                  Prices and flows do not represent actual market history.
                </p>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <h3>Order-book data unavailable</h3>
                <p>
                  No bid-offer feed is connected. TradingView market candles
                  appear in the separate panel above.
                </p>
              </div>
            </div>
            <Link className="text-link" href="/methodology">
              Read calculations, limitations and disclaimer →
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
