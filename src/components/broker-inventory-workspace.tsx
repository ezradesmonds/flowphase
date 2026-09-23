"use client";
import { InventoryPhaseCharts } from "./inventory-charts";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Intelligence } from "@/domain/intelligence";
import type { Affiliation } from "@/lib/intelligence/extended/model";
import {
  inventoryByPhase,
  type PhaseInventoryRow,
} from "@/lib/intelligence/extended/inventory";
import {
  Value,
  Evidence,
  display,
  exportCSV,
  SaveResearch,
} from "./research-primitives";
const EMPTY_AFFILIATIONS: Affiliation[] = [];
const colors = ["#60a5fa", "#c084fc", "#fb923c", "#f87171", "#34d399"];
export function BrokerInventoryWorkspace({
  analysis,
  affiliations = EMPTY_AFFILIATIONS,
}: {
  analysis: Intelligence;
  affiliations?: Affiliation[];
}) {
  const [phase, setPhase] = useState("CUSTOM"),
    [affiliation, setAffiliation] = useState("ALL"),
    [proxy, setProxy] = useState("ALL"),
    [sort, setSort] = useState("netLot"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [compare, setCompare] = useState<string[] | null>(null);
  const all = useMemo(
    () =>
      inventoryByPhase(
        analysis,
        start || undefined,
        end || undefined,
        affiliations,
      ),
    [analysis, start, end, affiliations],
  );
  const rows = all
    .filter(
      (r) =>
        r.phase === phase &&
        (affiliation === "ALL" || r.broker.ownershipType === affiliation) &&
        (proxy === "ALL" || r.broker.behaviorProxy === proxy),
    )
    .sort(
      (a, b) =>
        (b.metrics[sort as keyof typeof b.metrics]?.value ?? -Infinity) -
        (a.metrics[sort as keyof typeof a.metrics]?.value ?? -Infinity),
    );
  const summaries = all.filter((r) => r.phase === "CUSTOM");
  const selected = compare ?? summaries.slice(0, 3).map((r) => r.broker.code);
  const lines = summaries.filter((r) => selected.includes(r.broker.code));
  const dates = [
      ...new Set(lines.flatMap((r) => r.history.map((h) => h.date))),
    ].sort(),
    max = Math.max(
      1,
      ...lines.flatMap((r) => r.history.map((h) => Math.abs(h.running))),
    );
  const leaders = [
    [
      "Top accumulator",
      [...summaries]
        .sort(
          (a, b) =>
            (b.metrics.netLot.value ?? -Infinity) -
            (a.metrics.netLot.value ?? -Infinity),
        )
        .find((r) => (r.metrics.netLot.value ?? 0) > 0),
    ],
    [
      "Top distributor",
      [...summaries]
        .sort(
          (a, b) =>
            (a.metrics.netLot.value ?? Infinity) -
            (b.metrics.netLot.value ?? Infinity),
        )
        .find((r) => (r.metrics.netLot.value ?? 0) < 0),
    ],
    [
      "Highest frequency",
      [...summaries]
        .filter((r) => r.metrics.totalFrequency.value !== null)
        .sort(
          (a, b) =>
            b.metrics.totalFrequency.value! - a.metrics.totalFrequency.value!,
        )[0],
    ],
    [
      "Largest average lot",
      [...summaries]
        .filter((r) => r.metrics.averageLot.value !== null)
        .sort(
          (a, b) => b.metrics.averageLot.value! - a.metrics.averageLot.value!,
        )[0],
    ],
    [
      "Highest crossing risk",
      [...summaries]
        .filter((r) => r.metrics.crossingRisk.value !== null)
        .sort(
          (a, b) =>
            b.metrics.crossingRisk.value! - a.metrics.crossingRisk.value!,
        )[0],
    ],
  ] as [string, PhaseInventoryRow | undefined][];
  return (
    <section className="panel research-module">
      <h2>Broker Inventory by Phase</h2>
      <p>
        Observed Cumulative Net Inventory Since{" "}
        {summaries[0]?.origin ?? "Unavailable"} ·{" "}
        <strong>Pre-period Inventory: Unknown</strong>
      </p>
      <p className="muted">
        Signed net change is not actual ownership. PnL unavailable: opening
        holdings and chronological executions are not verified.
      </p>
      <div className="research-cards">
        {leaders.map(([label, r]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{r?.broker.code ?? "Unavailable"}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        Foreign-affiliated / local / state-affiliated leaders:{" "}
        {affiliations.length
          ? "filter affiliation below"
          : "Unavailable — no officially sourced broker registry configured"}
        .
      </p>
      <div className="research-filters">
        <label>
          Phase
          <select value={phase} onChange={(e) => setPhase(e.target.value)}>
            {[
              "CUSTOM",
              "CYCLE",
              "AKUMULASI",
              "POMPOM",
              "MENGGORENG",
              "DISTRIBUSI",
              "POST_DISTRIBUTION_MARKDOWN",
              "TRANSITION",
              "UNCERTAIN",
              "INSUFFICIENT_DATA",
            ].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Start
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          End
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label>
          Broker affiliation
          <select
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
          >
            {[
              "ALL",
              "LOCAL_PRIVATE",
              "LOCAL_STATE_OWNED_OR_AFFILIATED",
              "FOREIGN_AFFILIATED",
              "JOINT_VENTURE",
              "UNKNOWN",
            ].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Behavior proxy
          <select value={proxy} onChange={(e) => setProxy(e.target.value)}>
            {[
              "ALL",
              "RETAIL_PROXY",
              "INSTITUTIONAL_PROXY",
              "MIXED",
              "UNKNOWN",
            ].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {[
              "netLot",
              "netValue",
              "totalFrequency",
              "averageLot",
              "depletion",
              "crossingRisk",
              "unrealizedPnl",
            ].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <button
          className="button"
          onClick={() =>
            exportCSV(
              rows.map((r) => ({
                symbol: r.symbol,
                broker: r.broker.code,
                phase: r.phase,
                start: r.periodStart,
                end: r.periodEnd,
                ...Object.fromEntries(
                  Object.entries(r.metrics).map(([k, m]) => [k, m.value]),
                ),
                source: r.meta.source.join(";"),
                as_of: r.meta.as_of,
                confidence: r.meta.confidence,
                quality_flags: r.meta.quality_flags.join(";"),
                metadata: JSON.stringify(r.metrics),
              })),
              analysis.ticker + "-broker-inventory.csv",
            )
          }
        >
          Export filtered CSV
        </button>
      </div>
      {!rows.length ? (
        <p className="empty-state">
          No broker observations match these filters. Missing data is not zero.
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Compare ≤5",
                  "Broker / identity",
                  "Phase & period",
                  "Buy lot",
                  "Sell lot",
                  "Net lot",
                  "Net value Rp",
                  "Frequency",
                  "Avg lot/trade",
                  "Crossing",
                  "Coverage",
                  "Detail",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.segmentId + r.broker.code}>
                  <td>
                    <input
                      aria-label={"Compare " + r.broker.code}
                      type="checkbox"
                      checked={selected.includes(r.broker.code)}
                      onChange={(e) =>
                        setCompare(
                          e.target.checked
                            ? [
                                ...selected.filter((c) => c !== r.broker.code),
                                r.broker.code,
                              ].slice(-5)
                            : selected.filter((c) => c !== r.broker.code),
                        )
                      }
                    />
                  </td>
                  <td>
                    <Link href={"/brokers?code=" + r.broker.code}>
                      {r.broker.code}
                    </Link>
                    <small>
                      {r.broker.name}
                      <br />
                      {r.broker.ownershipType}
                      <br />
                      {r.broker.behaviorProxy}
                    </small>
                  </td>
                  <td>
                    {r.phase}
                    <small>
                      {r.periodStart} → {r.periodEnd}
                    </small>
                  </td>
                  {(
                    [
                      "buyLot",
                      "sellLot",
                      "netLot",
                      "netValue",
                      "totalFrequency",
                      "averageLot",
                      "crossingRisk",
                    ] as const
                  ).map((k) => (
                    <td key={k}>
                      <Value metric={r.metrics[k]} />
                    </td>
                  ))}
                  <td>{display(r.coverage * 100)}%</td>
                  <td>
                    <details>
                      <summary>Expand</summary>
                      <SaveResearch
                        type="BROKER"
                        id={r.broker.code}
                        label={r.broker.code}
                      />
                      <dl>
                        {Object.entries(r.metrics).map(([k, m]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>
                              <Value metric={m} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <h4>Phase ledger</h4>
                      {all
                        .filter(
                          (p) =>
                            p.broker.code === r.broker.code &&
                            p.phase !== "CUSTOM" &&
                            p.phase !== "CYCLE",
                        )
                        .map((p) => (
                          <p key={p.segmentId}>
                            {p.phase} · {p.periodStart} → {p.periodEnd}:{" "}
                            {display(p.metrics.observedOpening.value)} + (
                            {display(p.metrics.netLot.value)}) →{" "}
                            {display(p.metrics.observedClosing.value)}
                          </p>
                        ))}
                      <Evidence
                        value={{
                          meta: r.meta,
                          sourceAverages: r.sourceAverages,
                        }}
                      />
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="research-chart-grid">
        <div>
          <h3>Cumulative net inventory · selected brokers</h3>
          <svg
            viewBox="0 0 700 260"
            role="img"
            aria-label="Observed cumulative net inventory line chart"
          >
            <line
              x1="35"
              y1="125"
              x2="690"
              y2="125"
              stroke="currentColor"
              opacity=".3"
            />
            {lines.map((r, i) => (
              <polyline
                key={r.broker.code}
                fill="none"
                stroke={colors[i]}
                strokeWidth="2"
                points={r.history
                  .map(
                    (h) =>
                      35 +
                      (dates.indexOf(h.date) / Math.max(1, dates.length - 1)) *
                        650 +
                      "," +
                      (125 - (h.running / max) * 100),
                  )
                  .join(" ")}
              >
                <title>
                  {r.broker.code + ": signed cumulative net, not holdings"}
                </title>
              </polyline>
            ))}
            <text x="35" y="245" fill="currentColor">
              {dates[0]} → {dates.at(-1)} · ±{display(max)} lots
            </text>
          </svg>
          {lines.map((r, i) => (
            <span
              style={{ color: colors[i], marginRight: 16 }}
              key={r.broker.code}
            >
              {r.broker.code}
            </span>
          ))}
        </div>
        <div>
          <h3>Phase change / waterfall</h3>
          {lines.map((r, i) => (
            <details key={r.broker.code} open={i === 0}>
              <summary>{r.broker.code} · cumulative observed net</summary>
              {all
                .filter(
                  (p) =>
                    p.broker.code === r.broker.code &&
                    p.phase !== "CUSTOM" &&
                    p.phase !== "CYCLE",
                )
                .map((p) => (
                  <div key={p.segmentId} className="research-waterfall">
                    <span>
                      {p.phase} · {p.periodStart}
                    </span>
                    <div
                      style={{
                        width:
                          Math.max(
                            1,
                            Math.min(
                              100,
                              (Math.abs(p.metrics.netLot.value ?? 0) / max) *
                                100,
                            ),
                          ) + "%",
                        background: colors[i],
                        height: 8,
                      }}
                    />
                    <small>
                      {display(p.metrics.observedOpening.value)} →{" "}
                      {display(p.metrics.observedClosing.value)} (
                      {display(p.metrics.netLot.value)} lot)
                    </small>
                  </div>
                ))}
            </details>
          ))}
        </div>
      </div>
      <InventoryPhaseCharts rows={all} brokers={selected} />
      <h3 id="broker-timeline">Broker behavior timeline</h3>
      <div className="research-timeline">
        {analysis.regions.map((region) => {
          const period = all
            .filter(
              (r) =>
                r.segmentId === region.id && r.metrics.netLot.value !== null,
            )
            .sort((a, b) => b.metrics.netLot.value! - a.metrics.netLot.value!);
          return (
            <details key={region.id}>
              <summary>
                {region.label} ·{" "}
                {new Date(region.startTimestamp * 1000)
                  .toISOString()
                  .slice(0, 10)}{" "}
                →{" "}
                {new Date(region.endTimestamp * 1000)
                  .toISOString()
                  .slice(0, 10)}
              </summary>
              <p>
                Top buyers:{" "}
                {period
                  .filter((r) => r.metrics.netLot.value! > 0)
                  .slice(0, 3)
                  .map(
                    (r) =>
                      r.broker.code + " +" + display(r.metrics.netLot.value),
                  )
                  .join(" | ") || "Unavailable"}
              </p>
              <p>
                Top sellers:{" "}
                {period
                  .filter((r) => r.metrics.netLot.value! < 0)
                  .slice(-3)
                  .map(
                    (r) =>
                      r.broker.code + " " + display(r.metrics.netLot.value),
                  )
                  .join(" | ") || "Unavailable"}
              </p>
              <Evidence
                value={{
                  phaseEvidence: region.evidenceItems,
                  brokerEvidence: period.slice(0, 3),
                }}
              />
            </details>
          );
        })}
      </div>
    </section>
  );
}
