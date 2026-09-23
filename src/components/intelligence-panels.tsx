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
          <p>
            Actual: {num(selected.actualValue)} · Baseline:{" "}
            {num(selected.baseline)} · Coverage:{" "}
            {num(selected.coverage * 100, 1)}%
          </p>
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
              "Observed net change · lots",
              "Average buy",
              "Average sell",
              "Peak",
              "Remaining",
              "Remaining %",
              "Buy value · IDR",
              "Sell value · IDR",
              "Net value · IDR",
              "Opening inventory",
              "Inventory depletion",
              "Gross / net",
              "Crossing warning",
              "First accumulation",
              "Last material buy",
              "Last material sell",
              "Moving average cost",
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
              <td>{num(r.grossBuyValue)}</td>
              <td>{num(r.grossSellValue)}</td>
              <td>{num(r.netValue)}</td>
              <td>
                {r.openingInventoryLot === null
                  ? "Unknown"
                  : num(r.openingInventoryLot)}
              </td>
              <td>
                {r.inventoryDepletionRatio === null
                  ? "Unavailable"
                  : num(r.inventoryDepletionRatio * 100, 1) + "%"}
              </td>
              <td>{num(r.grossToNetRatio, 2)}</td>
              <td>{r.crossingWarning ? "SUSPECTED_CROSSING" : "No warning"}</td>
              <td>{r.firstAccumulationDate ?? "Unavailable"}</td>
              <td>{r.lastMaterialBuyDate ?? "Unavailable"}</td>
              <td>{r.lastMaterialSellDate ?? "Unavailable"}</td>
              <td>{num(r.movingAverageCost, 2)}</td>
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
  const [showAllPhases, setShowAllPhases] = useState(false);
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
          Periode siklus{" "}
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
      <section className="phase-history-panel">
        <div className="phase-history-heading">
          <div>
            <h2>Perjalanan fase saham</h2>
            <p>
              Urutan dari lama ke baru. Pilih kartu untuk melihat alasan dan
              data pada periode tersebut.
            </p>
          </div>
          <button
            className="button"
            onClick={() => setShowAllPhases((v) => !v)}
          >
            {showAllPhases
              ? "Tampilkan 6 terbaru"
              : `Lihat semua ${cycle?.phases.length ?? 0} fase`}
          </button>
        </div>
        <p className="phase-help">
          Skor menunjukkan kekuatan bukti model, bukan peluang harga naik. Fase
          dengan bukti terbatas masih berupa kandidat.
        </p>
        <div
          className="phase-timeline phase-history-grid"
          aria-label="Phase timeline"
        >
          {(showAllPhases
            ? (cycle?.phases ?? [])
            : (cycle?.phases ?? []).slice(-6)
          ).map((r) => (
            <button
              key={r.id}
              className={`button phase-history-card phase-${r.phase.toLowerCase()}`}
              aria-pressed={selectedRegion?.id === r.id}
              onClick={() => onSelectRegion(r)}
            >
              <span className="phase-card-heading">
                <strong>
                  {r.phase === "UNCERTAIN"
                    ? "Belum ada arah jelas"
                    : r.phase === "TRANSITION"
                      ? "Peralihan fase"
                      : r.phase === "INSUFFICIENT_DATA"
                        ? "Data belum cukup"
                        : `${readable(r.phase)}${r.label.toLowerCase().includes("candidate") ? " · kandidat" : ""}`}
                </strong>
                {r.active && <em>Terkini</em>}
              </span>
              <span>
                {sessionDate(r.startTimestamp)} — {sessionDate(r.endTimestamp)}
              </span>
              <span className="phase-score">
                <span
                  style={{
                    width: `${Math.max(0, Math.min(100, r.confidence))}%`,
                  }}
                />
              </span>
              <small>
                Skor bukti {r.confidence}% ·{" "}
                {r.brokerEvidence === "PRICE_VOLUME_ONLY"
                  ? "Harga & volume saja"
                  : "Lihat rincian bukti"}
              </small>
            </button>
          ))}
        </div>
        {!cycle?.phases.length && (
          <p className="phase-help">
            Belum ada fase terdeteksi untuk siklus ini.
          </p>
        )}
      </section>
      {selectedRegion && (
        <div className="evidence-inline phase-selection">
          <button className="button" onClick={() => onSelectRegion(undefined)}>
            Kembali ke seluruh siklus
          </button>
          <h2>Ringkasan periode terpilih</h2>
          <div className="phase-summary-grid">
            <div>
              <small>Fase</small>
              <strong>{readable(selectedRegion.phase)}</strong>
            </div>
            <div>
              <small>Skor bukti model</small>
              <strong>{selectedRegion.confidence}%</strong>
            </div>
            <div>
              <small>Kelengkapan data</small>
              <strong>{num(selectedRegion.coverage * 100, 1)}%</strong>
            </div>
            <div>
              <small>Perubahan harga periode</small>
              <strong>
                {num(
                  (selectedRegion.endPrice / selectedRegion.startPrice - 1) *
                    100,
                  2,
                )}
                %
              </strong>
            </div>
          </div>
          <p>
            {sessionDate(selectedRegion.startTimestamp)} —{" "}
            {sessionDate(selectedRegion.endTimestamp)}. Tabel broker di bawah
            mengikuti periode ini.
          </p>
          <p className="phase-explanation">
            {selectedRegion.phase === "TRANSITION"
              ? "Pola sedang berubah. Model belum memiliki bukti yang cukup untuk menetapkan fase baru."
              : selectedRegion.phase === "UNCERTAIN"
                ? "Sinyal belum konsisten. Gunakan data tambahan sebelum menarik kesimpulan."
                : selectedRegion.phase === "INSUFFICIENT_DATA"
                  ? "Riwayat yang tersedia belum cukup untuk menilai fase pada periode ini."
                  : "Model menemukan pola kandidat dari data yang tersedia. Periksa kekuatan dan kelengkapan buktinya sebelum menggunakan hasil ini."}{" "}
            {rows.length
              ? `${rows.length} broker memiliki data pada periode ini.`
              : "Data broker tidak tersedia pada periode ini; kesimpulan kepemilikan tidak dapat dibuat."}
          </p>
          <details className="phase-evidence-details">
            <summary>
              Lihat bukti, keterbatasan, dan rincian perhitungan
            </summary>
            <h3>
              {readable(selectedRegion.phase)} · {selectedRegion.confidence}%
            </h3>
            <p>
              {sessionDate(selectedRegion.startTimestamp)} —{" "}
              {sessionDate(selectedRegion.endTimestamp)} ·{" "}
              {selectedRegion.cycleId} · {selectedRegion.brokerEvidence}
            </p>
            <p>
              {selectedRegion.label} · Coverage{" "}
              {num(selectedRegion.coverage * 100, 1)}% ·{" "}
              {selectedRegion.algorithmVersion}
            </p>
            {selectedRegion.evidenceItems.slice(0, 3).map((e, i) => (
              <p key={i}>
                {e.status}: {e.description}
              </p>
            ))}
            <h4>Evidence against / unavailable</h4>
            {selectedRegion.againstEvidence.map((e, i) => (
              <p key={i}>
                {e.status}: {e.description}
              </p>
            ))}
            <p>
              {
                selectedCandles.filter(
                  (c) => c.time >= selectedRegion.startTimestamp,
                ).length
              }{" "}
              bars ·{" "}
              {selectedPv?.explanation ?? "Price-volume state unavailable."}{" "}
              Relative volume at phase end: {num(selectedPv?.relativeVolume, 2)}
              ×. Estimated remaining across reported brokers:{" "}
              {rows.length &&
              rows.every((r) => r.estimatedRemainingInventory !== null)
                ? num(
                    rows.reduce(
                      (n, r) => n + r.estimatedRemainingInventory!,
                      0,
                    ),
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
              %. {rows.length} brokers with available daily rows;{" "}
              {alerts.length} alerts in this period. Inventory below uses this
              selection.
            </p>
          </details>
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
                [
                  "Current phase",
                  analysis.regions.at(-1)?.label ?? readable(analysis.phase),
                ],
                ["Market condition", readable(analysis.marketCondition)],
                ["Coverage", num(analysis.coverage * 100, 1) + "%"],
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
              Observed Inventory Change Since{" "}
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
                Observed cumulative net = sum(buy lots − sell lots) since the
                selected start. Opening inventory: Unknown. Remaining holdings,
                remaining ratio and cost basis stay unavailable without a
                supplied opening position. Average trade price = value / (lots ×
                100). A supplied opening position uses moving weighted average
                cost, with daily buys then sells; never FIFO. Missing sessions
                are not zero activity.
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
              accumulation after post-distribution markdown closes the preceding
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
