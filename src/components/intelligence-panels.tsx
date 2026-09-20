"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type {
  Intelligence,
  MarketAlert,
  InventoryRow,
} from "@/domain/intelligence";
import type { PhaseRegion } from "@/domain/market";
import { TRANSACTION_CAPABILITY } from "@/config/analysis";
import {
  calculateInventory,
  aggregateGroups,
} from "@/lib/intelligence/inventory";
import { priceVolume } from "@/lib/intelligence/price-volume";
import { sessionDate } from "@/lib/intelligence/analyze";
import { num, readable, groupLabel } from "@/lib/intelligence/format";
export function AlertList({ alerts }: { alerts: MarketAlert[] }) {
  const [selected, setSelected] = useState<MarketAlert | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState(0);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(alerts.length / 30) - 1),
  );
  useEffect(() => {
    const element = dialog.current;
    if (selected && element) {
      element.showModal();
      return () => element.close();
    }
  }, [selected]);
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Session",
                "Ticker / phase",
                "Severity",
                "Type",
                "Broker",
                "Lots",
                "Value · IDR",
                "Confidence",
                "Status",
                "Evidence",
              ].map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alerts.slice(currentPage * 30, currentPage * 30 + 30).map((a) => (
              <tr key={a.id}>
                <td>{sessionDate(a.timestamp)}</td>
                <td>
                  <Link
                    prefetch={false}
                    className="text-link"
                    href={`/stocks/${a.ticker}`}
                  >
                    {a.ticker}
                  </Link>
                  <small className="cell-note">{readable(a.phase)}</small>
                </td>
                <td>
                  <span
                    className={`severity severity-${a.severity.toLowerCase()}`}
                  >
                    {a.severity}
                  </span>
                </td>
                <td>{readable(a.type)}</td>
                <td>{a.brokerCode ?? "—"}</td>
                <td>{num(a.lotAmount)}</td>
                <td>{num(a.estimatedValue)}</td>
                <td>{a.confidence}%</td>
                <td>{a.status}</td>
                <td>
                  <button className="button" onClick={() => setSelected(a)}>
                    Why?
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!alerts.length && (
          <p className="chart-caption">
            No alerts in the analysed selection. This does not establish that no
            market events occurred.
          </p>
        )}
      </div>
      {alerts.length > 30 && (
        <div className="analysis-toolbar">
          <button
            className="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous alerts
          </button>
          <span>
            Page {currentPage + 1} / {Math.ceil(alerts.length / 30)}
          </span>
          <button
            className="button"
            disabled={(currentPage + 1) * 30 >= alerts.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Next alerts
          </button>
        </div>
      )}
      {selected && (
        <dialog
          ref={dialog}
          onCancel={() => setSelected(null)}
          aria-label="Alert evidence"
          className="evidence-drawer"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelected(null);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            autoFocus
            className="button"
            onClick={() => setSelected(null)}
          >
            Close evidence
          </button>
          <h2>
            {selected.ticker} · {readable(selected.type)}
          </h2>
          <p>{selected.dataSource.join(" · ")} · Historical / batch</p>
          <h3>Why?</h3>
          {selected.evidence.map((e) => (
            <p key={e}>{e}</p>
          ))}
          <h3>Limitations</h3>
          {selected.warnings.map((e) => (
            <p key={e}>{e}</p>
          ))}
          <p>
            Phase at event: {readable(selected.phase)}. Rule confidence is not a
            probability.
          </p>
          <Link
            prefetch={false}
            className="button"
            href={`/stocks/${selected.ticker}#chart`}
          >
            Open chart
          </Link>{" "}
          <Link
            prefetch={false}
            className="button"
            href={`/stocks/${selected.ticker}#inventory`}
          >
            Broker inventory
          </Link>
        </dialog>
      )}
    </>
  );
}
function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {[
              "Broker / classification",
              "Gross buy",
              "Gross sell",
              "Net lots",
              "Average buy",
              "Average sell",
              "Peak",
              "Remaining",
              "Remaining %",
              "Activity / role",
              "Why?",
            ].map((t) => (
              <th key={t}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.brokerCode}>
              <td>
                <strong>{r.brokerCode}</strong>
                <small className="cell-note">
                  {groupLabel(r.profile.classification)} · heuristic{" "}
                  {r.profile.confidence}%
                </small>
              </td>
              <td>{num(r.grossBuyLot)}</td>
              <td>{num(r.grossSellLot)}</td>
              <td className={r.cumulativeNetLot >= 0 ? "positive" : "negative"}>
                {num(r.cumulativeNetLot)}
              </td>
              <td>{num(r.weightedAverageBuyPrice, 2)}</td>
              <td>{num(r.weightedAverageSellPrice, 2)}</td>
              <td>{num(r.peakEstimatedInventory)}</td>
              <td>{num(r.estimatedRemainingInventory)}</td>
              <td>
                {r.remainingRatio === null
                  ? "Unavailable"
                  : num(r.remainingRatio * 100, 1) + "%"}
              </td>
              <td>
                {r.activeTradingDays} reported days
                <small className="cell-note">{r.role}</small>
              </td>
              <td>
                <details>
                  <summary>Why?</summary>
                  <p>{r.profile.notes}</p>
                  <p>
                    Reduction from positive peak: {num(r.inventoryReduction)}{" "}
                    lots. Net value: {num(r.netValue)} IDR. Estimated market
                    value: {num(r.estimatedMarketValue)} IDR.
                  </p>
                  <p>
                    Net-buy consistency: {num(r.buyConsistency * 100, 1)}%;
                    net-sell consistency: {num(r.sellConsistency * 100, 1)}%.
                    First / last buy: {r.firstBuyDate ?? "—"} /{" "}
                    {r.lastBuyDate ?? "—"}. First / last sell:{" "}
                    {r.firstSellDate ?? "—"} / {r.lastSellDate ?? "—"}.
                  </p>
                  <p>
                    {r.history
                      .map((d) => `${d.date}: ${num(d.running)} net lots`)
                      .join("; ")}
                  </p>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="chart-caption">
          Broker inventory unavailable for this period.
        </p>
      )}
    </div>
  );
}
export function IntelligencePanels({
  analysis,
  selectedRegion,
  onSelectRegion,
}: {
  analysis: Intelligence;
  selectedRegion?: PhaseRegion;
  onSelectRegion: (region: PhaseRegion | undefined) => void;
}) {
  const [tab, setTab] = useState("Intelligence");
  const [cycleId, setCycleId] = useState("");
  const cycle =
    analysis.cycles.find((c) => c.id === cycleId) ?? analysis.cycles.at(-1);
  const period = selectedRegion ?? cycle;
  const start = period
    ? sessionDate(period.startTimestamp)
    : analysis.broker.start;
  const end = period?.endTimestamp
    ? sessionDate(period.endTimestamp)
    : analysis.candles?.candles.at(-1)
      ? sessionDate(analysis.candles.candles.at(-1)!.time)
      : analysis.broker.end;
  const availableStart =
    start > analysis.broker.start ? start : analysis.broker.start;
  const availableEnd = end < analysis.broker.end ? end : analysis.broker.end;
  const rows = calculateInventory(
    analysis.broker.flows,
    analysis.ticker,
    availableStart,
    availableEnd,
    analysis.candles?.candles.filter((c) => sessionDate(c.time) <= end).at(-1)
      ?.close ?? null,
  );
  const groups = aggregateGroups(rows),
    pv = analysis.priceVolume;
  const selectedCandles =
    analysis.candles?.candles.filter(
      (c) => c.time <= (selectedRegion?.endTimestamp ?? Infinity),
    ) ?? [];
  const selectedPv = priceVolume(selectedCandles);
  const alerts = analysis.alerts.filter(
    (a) => sessionDate(a.timestamp) >= start && sessionDate(a.timestamp) <= end,
  );
  return (
    <div className="intelligence-content" id="inventory">
      <div className="analysis-toolbar">
        <label>
          Cycle{" "}
          <select
            aria-label="Cycle selector"
            value={cycle?.id ?? ""}
            onChange={(e) => {
              setCycleId(e.target.value);
              onSelectRegion(undefined);
            }}
          >
            {!analysis.cycles.length && (
              <option value="">No detected cycles</option>
            )}
            {analysis.cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {sessionDate(c.startTimestamp)} · {c.status}
              </option>
            ))}
          </select>
        </label>
        <span>
          {cycle?.status ?? "INSUFFICIENT DATA"} ·{" "}
          {cycle?.evidenceStatus ?? "INSUFFICIENT_DATA"}
        </span>
      </div>
      <div className="phase-timeline" aria-label="Phase timeline">
        {(cycle?.phases ?? []).map((r) => (
          <button
            key={r.id}
            className="button"
            aria-pressed={selectedRegion?.id === r.id}
            onClick={() => onSelectRegion(r)}
          >
            {readable(r.phase)} · {sessionDate(r.startTimestamp)} ·{" "}
            {r.confidence}% {r.active ? "Active" : ""}
          </button>
        ))}
      </div>
      {selectedRegion && (
        <div className="evidence-inline">
          <button className="button" onClick={() => onSelectRegion(undefined)}>
            Clear selected phase
          </button>
          <h3>
            {readable(selectedRegion.phase)} · {selectedRegion.confidence}%
          </h3>
          <p>
            {sessionDate(selectedRegion.startTimestamp)} —{" "}
            {sessionDate(selectedRegion.endTimestamp)} ·{" "}
            {selectedRegion.cycleId} · {selectedRegion.brokerEvidence}
          </p>
          <p>{selectedRegion.evidence.join(" ")}</p>
          <p>
            {
              selectedCandles.filter(
                (c) => c.time >= selectedRegion.startTimestamp,
              ).length
            }{" "}
            bars ·{" "}
            {selectedPv?.explanation ?? "Price-volume state unavailable."}{" "}
            Relative volume at phase end: {num(selectedPv?.relativeVolume, 2)}×.
            Estimated remaining across reported brokers:{" "}
            {rows.length
              ? num(
                  rows.reduce((n, r) => n + r.estimatedRemainingInventory, 0),
                ) + " lots"
              : "unavailable"}
            .
          </p>
          <p>{selectedRegion.warnings.join(" ")}</p>
          <p>
            Phase return{" "}
            {num(
              (selectedRegion.endPrice / selectedRegion.startPrice - 1) * 100,
              2,
            )}
            %. {rows.length} brokers with available daily rows; {alerts.length}{" "}
            alerts in this period. Inventory below uses this selection.
          </p>
        </div>
      )}
      <div
        className="analysis-tabs"
        role="tablist"
        aria-label="Stock intelligence sections"
      >
        {[
          "Intelligence",
          "Broker Inventory",
          "Transactions",
          "Cycle History",
        ].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className="button"
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab}>
        {tab === "Intelligence" && (
          <>
            <div className="detail-metrics">
              {[
                ["Current phase", readable(analysis.phase)],
                [
                  "Confidence",
                  analysis.confidence
                    ? `${analysis.confidence}% · heuristic`
                    : "Unavailable",
                ],
                [
                  "Relative volume",
                  pv?.relativeVolume !== null &&
                  pv?.relativeVolume !== undefined
                    ? `${num(pv.relativeVolume, 2)}×`
                    : "Unavailable",
                ],
                [
                  "Active alerts",
                  String(
                    analysis.alerts.filter((a) => a.status === "NEW").length,
                  ),
                ],
              ].map(([label, value]) => (
                <div className="detail-metric" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <h3>Price-volume confirmation</h3>
            <p>
              {pv?.explanation ?? "Price-volume data unavailable."} Current
              phase: {readable(analysis.phase)}. Broker groups below are
              separate daily evidence.
            </p>
            <p>
              Rolling return{" "}
              {pv?.rollingReturn === null
                ? "Unavailable"
                : num((pv?.rollingReturn ?? 0) * 100, 2) + "%"}{" "}
              · z-score {num(pv?.volumeZScore, 2)} · ATR {num(pv?.atr, 2)} ·
              range / ATR {num(pv?.rangeExpansion, 2)} · price progress / volume{" "}
              {num(pv?.progressPerVolume, 8)}.
            </p>
            <p>
              Upper-wick rejection proxy {num((pv?.upperWick ?? 0) * 100, 1)}%;
              lower-wick absorption proxy {num((pv?.lowerWick ?? 0) * 100, 1)}%.{" "}
              {pv?.breakout
                ? "Breakout above prior 20-bar high."
                : pv?.breakdown
                  ? "Breakdown below prior 20-bar low."
                  : "No 20-bar breakout/breakdown."}
            </p>
            <details>
              <summary>Why? Price-volume and unavailable metrics</summary>
              <p>
                Uses the preceding 20 candles excluding the evaluated candle for
                volume baselines. Wick position is a price proxy, not aggressor
                side. Turnover, free-float turnover and true VWAP are
                unavailable: verified shares outstanding, free-float share count
                and trade-level price/volume are not integrated.
              </p>
              <p>{analysis.regions.at(-1)?.evidence.join(" ")}</p>
            </details>
            <div className="detail-metrics">
              {groups.map((g) => (
                <div key={g.classification} className="detail-metric">
                  <span>{groupLabel(g.classification)} · heuristic</span>
                  <strong>
                    {rows.length ? num(g.netLot) + " lots" : "Unavailable"}
                  </strong>
                  <small>
                    {g.brokers} contributing brokers · net IDR{" "}
                    {rows.length ? num(g.netValue) : "Unavailable"}
                  </small>
                </div>
              ))}
            </div>
            <h3>Period alerts</h3>
            <AlertList alerts={alerts} />
          </>
        )}
        {tab === "Broker Inventory" && (
          <>
            <h3>
              Estimated inventory since{" "}
              {start < availableStart
                ? "available broker history"
                : "cycle / selected phase start"}
            </h3>
            <p>
              {availableStart || "Unavailable"} —{" "}
              {availableEnd || "Unavailable"} · Sectors fetched{" "}
              {analysis.broker.fetchedAt}. Values IDR; 1 lot = 100 shares.
              Starting holdings unknown. Negative net flow does not imply short
              selling.
            </p>
            {analysis.broker.unavailableReason && (
              <p role="status">{analysis.broker.unavailableReason}</p>
            )}
            <InventoryTable rows={rows} />
            <details>
              <summary>Why? Inventory calculation</summary>
              <p>
                Chronological cumulative net = buy − sell. Peak = maximum
                positive cumulative net. Remaining = max(0, ending net).
                Reduction = peak − remaining. Ratio = remaining / peak,
                unavailable when peak is zero. Average price = gross value /
                (gross lots × 100), or lot-weighted provider average when values
                are missing. Missing daily sessions are not assumed zero;
                estimates cover reported rows only.
              </p>
            </details>
          </>
        )}
        {tab === "Transactions" && (
          <>
            <h3>{TRANSACTION_CAPABILITY.label}</h3>
            <p>{TRANSACTION_CAPABILITY.reason}</p>
            <p>Missing: {TRANSACTION_CAPABILITY.missing.join(", ")}.</p>
            <button className="button" disabled>
              Stealth detector unavailable
            </button>
            <p>
              Daily broker summaries are available in Broker Inventory. Neither
              total candle volume nor daily broker summaries establish
              individual trade sequences.
            </p>
          </>
        )}
        {tab === "Cycle History" && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Cycle start",
                    "End",
                    "Status",
                    "Observed phases",
                    "Return",
                    "Broker context",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.cycles.map((c) => (
                  <tr key={c.id}>
                    <td>{sessionDate(c.startTimestamp)}</td>
                    <td>
                      {c.endTimestamp ? sessionDate(c.endTimestamp) : "Active"}
                    </td>
                    <td>{c.status}</td>
                    <td>
                      {c.phases.map((p) => readable(p.phase)).join(" → ")}
                    </td>
                    <td>
                      {num(
                        (c.phases.at(-1)!.endPrice / c.phases[0].startPrice -
                          1) *
                          100,
                        2,
                      )}
                      %
                    </td>
                    <td>
                      <button
                        className="button"
                        onClick={() => {
                          setCycleId(c.id);
                          onSelectRegion(undefined);
                          setTab("Broker Inventory");
                        }}
                      >
                        Inspect period
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Cycles with missing phases remain incomplete. The latest cycle is
              active; an active cycle is not necessarily complete. A new
              accumulation after distribution or markdown closes the preceding
              candidate.
            </p>
          </div>
        )}
      </div>
      <details>
        <summary>Sources, freshness &amp; limitations</summary>
        <p>
          TradingView fetched {analysis.candles?.fetchedAt ?? "unavailable"} ·
          exchange delay unknown. Sectors daily summaries fetched{" "}
          {analysis.broker.fetchedAt}. Algorithm calculated{" "}
          {analysis.calculatedAt}. This page is historical / batch analysis, not
          a live alert feed.
        </p>
        {analysis.warnings.map((w) => (
          <p key={w}>{w}</p>
        ))}
        <p>
          Broker heuristic confidence is uncalibrated. Unknown/mixed brokers
          remain visible.{" "}
          <Link prefetch={false} href="/methodology">
            Read methodology
          </Link>
          .
        </p>
      </details>
    </div>
  );
}
