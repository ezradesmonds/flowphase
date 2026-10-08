"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Intelligence } from "@/domain/intelligence";
import type { PhaseRegion, PrimaryPhase } from "@/domain/market";
import { inventoryByPhase } from "@/lib/intelligence/extended/inventory";
import { sessionDate } from "@/lib/phases/features";
import {
  evidenceLabel,
  researchBrief,
} from "@/lib/intelligence/research-brief";
import { Value } from "./research-primitives";

const PHASE_ORDER: PrimaryPhase[] = [
  "AKUMULASI",
  "POMPOM",
  "MENGGORENG",
  "DISTRIBUSI",
];

function basis(region: PhaseRegion) {
  if (region.brokerEvidence === "BROKER_SUPPORTED") {
    return {
      label: "SECTORS-BACKED FLOWPHASE CANDIDATE",
      tone: "verified",
      detail:
        "Phase score combines TradingView price/volume with available Sectors broker aggregates in the trailing model window, which may include sessions before this region starts.",
    };
  }
  if (region.brokerEvidence === "PRICE_VOLUME_ONLY") {
    return {
      label: "PRICE-VOLUME CANDIDATE ONLY",
      tone: "limited",
      detail:
        "Usable Sectors broker evidence is not present for this region. This is intentionally not presented as a full FlowPhase signal.",
    };
  }
  return {
    label: "INSUFFICIENT EVIDENCE",
    tone: "limited",
    detail:
      "The available history does not meet the evidence requirements for a supported phase candidate.",
  };
}

export function PhaseBrokerEvidence({
  analysis,
  region,
}: {
  analysis: Intelligence;
  region: PhaseRegion;
}) {
  const rows = useMemo(
    () =>
      inventoryByPhase(
        analysis,
        sessionDate(region.startTimestamp),
        sessionDate(region.endTimestamp),
      )
        .filter((r) => r.phase === "CUSTOM" && r.metrics.netLot.value !== null)
        .sort((a, b) => b.metrics.netLot.value! - a.metrics.netLot.value!),
    [analysis, region],
  );

  const buyers = rows.filter((r) => r.metrics.netLot.value! > 0).slice(0, 3);
  const sellers = rows.filter((r) => r.metrics.netLot.value! < 0).slice(-3);
  const status = basis(region);
  const brief = researchBrief(region);

  const supporting = region.evidenceItems
    .filter((e) => e.status !== "UNAVAILABLE" && e.feature !== "phase")
    .slice(0, 6);
  const opposing = region.againstEvidence.slice(0, 6);
  const phaseScores = PHASE_ORDER.map((phase) => ({
    phase,
    score: region.scores[phase] ?? 0,
  })).sort((a, b) => b.score - a.score);
  const sources = [
    ...new Set(
      [...supporting, ...opposing]
        .map((e) => e.source)
        .filter((source) => source && source.trim()),
    ),
  ];
  const maxCrossingRisk = rows.length
    ? Math.max(...rows.map((r) => r.metrics.crossingRisk.value ?? 0))
    : null;

  return (
    <section
      className="research-module phase-broker-panel evidence-v3"
      aria-label="Selected phase evidence and broker context"
    >
      <div className="phase-broker-heading">
        <div>
          <small>FLOWPHASE EVIDENCE // SELECTED REGION</small>
          <h3>{region.phase.replaceAll("_", " ")}</h3>
        </div>
        <span>
          {sessionDate(region.startTimestamp)} →{" "}
          {sessionDate(region.endTimestamp)}
        </span>
      </div>

      <section
        className="research-brief"
        aria-label="Ringkasan riset fase terpilih"
      >
        <small>RINGKASAN RISET // PERIODE TERPILIH</small>
        <h4>{brief.conclusion}</h4>
        <div className="research-brief-grid">
          <div>
            <h5>Yang mendukung</h5>
            {brief.supporting.length ? (
              <ul>
                {brief.supporting.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            ) : (
              <p>
                Belum ada dukungan terukur yang cukup untuk kandidat fase ini.
              </p>
            )}
          </div>
          <div>
            <h5>Yang perlu diragukan</h5>
            {brief.caution.length ? (
              <ul>
                {brief.caution.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            ) : (
              <p>
                Tidak ada bukti penyangkal eksplisit yang tercatat; ini bukan
                bukti bahwa kandidat pasti benar.
              </p>
            )}
          </div>
          <div>
            <h5>Periksa berikutnya</h5>
            <p>{brief.nextCheck}</p>
          </div>
        </div>
        <p className="research-brief-limit">
          Ringkasan aturan model, bukan rekomendasi investasi. Skor dukungan
          bukan peluang profit; net broker bukan kepemilikan absolut.
        </p>
      </section>

      <div className={`signal-basis-banner ${status.tone}`}>
        <div>
          <small>SIGNAL BASIS</small>
          <strong>{status.label}</strong>
        </div>
        <p>{status.detail}</p>
      </div>

      <div className="evidence-metric-grid">
        <div>
          <small>MODEL EVIDENCE SCORE</small>
          <strong>{region.confidence}%</strong>
          <span>Rule strength, not probability</span>
        </div>
        <div>
          <small>EVIDENCE COVERAGE</small>
          <strong>{(region.coverage * 100).toFixed(0)}%</strong>
          <span>Available weighted inputs</span>
        </div>
        <div>
          <small>DATA QUALITY FACTOR</small>
          <strong>{(region.dataQualityFactor * 100).toFixed(0)}%</strong>
          <span>Freshness / input quality adjustment</span>
        </div>
        <div>
          <small>SECTORS BROKER INPUTS USED</small>
          <strong>
            {region.brokerEvidence === "BROKER_SUPPORTED" ? "YES" : "NO"}
          </strong>
          <span>
            {rows.length
              ? `${rows.length} brokers in selected period`
              : "No same-period rows; check the trailing model window"}
          </span>
        </div>
      </div>

      <div className="phase-scoreboard" aria-label="Phase score comparison">
        <div className="phase-scoreboard-heading">
          <div>
            <h4>Phase score comparison</h4>
            <p>
              Classification uses the strongest supported score after rules,
              ambiguity margin, confirmation, and hysteresis.
            </p>
          </div>
          <span>{region.algorithmVersion}</span>
        </div>
        <div className="phase-scoreboard-grid">
          {phaseScores.map(({ phase, score }, index) => (
            <div className="phase-score-row" key={phase}>
              <div>
                <strong>{phase}</strong>
                {index === 0 && <small>TOP SCORE</small>}
              </div>
              <span className="phase-score">
                <span
                  style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                />
              </span>
              <b>{score.toFixed(1)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="evidence-columns">
        <div className="evidence-column supporting">
          <div className="evidence-column-heading">
            <h4>Evidence supporting the candidate</h4>
            <span>{supporting.length} shown</span>
          </div>
          {supporting.length ? (
            <ul>
              {supporting.map((item, i) => (
                <li key={`${item.feature}-${i}`}>
                  <div>
                    <strong>{evidenceLabel(item)}</strong>
                    <small>
                      {item.status} · {item.source}
                    </small>
                  </div>
                  <p>{item.description}</p>
                  {typeof item.value === "number" && (
                    <b>{item.value.toFixed(1)}</b>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="phase-help">
              No supporting evidence items available.
            </p>
          )}
        </div>

        <div className="evidence-column against">
          <div className="evidence-column-heading">
            <h4>Evidence against / unavailable</h4>
            <span>{opposing.length} shown</span>
          </div>
          {opposing.length ? (
            <ul>
              {opposing.map((item, i) => (
                <li key={`${item.feature}-${i}`}>
                  <div>
                    <strong>{evidenceLabel(item)}</strong>
                    <small>
                      {item.status} · {item.source}
                    </small>
                  </div>
                  <p>{item.description}</p>
                  {typeof item.value === "number" && (
                    <b>{item.value.toFixed(1)}</b>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="phase-help">
              No explicit opposing evidence recorded.
            </p>
          )}
        </div>
      </div>

      <div className="phase-broker-section">
        <div className="phase-broker-section-heading">
          <div>
            <h4>Broker activity during this region</h4>
            <p>
              Up to three largest observed net buyers and net sellers. These are
              broker transaction aggregates, not beneficial-owner holdings.
            </p>
          </div>
          {maxCrossingRisk !== null && (
            <span>
              MAX CROSSING-RISK PROXY {(maxCrossingRisk * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Broker",
                    "Direction",
                    "Net lot",
                    "Net value",
                    "Frequency",
                    "Avg lot/trade",
                    "Avg buy",
                    "Avg sell",
                    "Observed net since start",
                    "Crossing",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...buyers, ...sellers].map((r) => (
                  <tr key={r.broker.code}>
                    <td>
                      <Link href={`/brokers?code=${r.broker.code}`}>
                        {r.broker.code}
                      </Link>
                    </td>
                    <td>{r.metrics.netLot.value! > 0 ? "BUY +" : "SELL −"}</td>
                    {(
                      [
                        "netLot",
                        "netValue",
                        "totalFrequency",
                        "averageLot",
                        "averageBuyPrice",
                        "averageSellPrice",
                        "observedClosing",
                        "crossingRisk",
                      ] as const
                    ).map((k) => (
                      <td key={k}>
                        <Value metric={r.metrics[k]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="phase-broker-empty">
            <strong>No Sectors broker rows for the selected period</strong>
            <p>
              {region.brokerEvidence === "BROKER_SUPPORTED"
                ? "The model used broker inputs from preceding sessions in its trailing window. There are no broker transactions to display within this region's exact dates."
                : "Price/volume context may still form a candidate, but broker-flow confirmation cannot be claimed for this region."}
            </p>
            {analysis.broker.flows.length > 0 && (
              <small>
                Available broker history: {analysis.broker.start} —{" "}
                {analysis.broker.end}
              </small>
            )}
          </div>
        )}
      </div>

      <details className="phase-evidence-details evidence-audit-details">
        <summary>
          Technical audit trail · warnings, sources and raw evidence (
          {region.evidence.length})
        </summary>
        <div className="evidence-audit-grid">
          <div>
            <h4>Sources represented</h4>
            <ul>
              {sources.length ? (
                sources.map((source) => <li key={source}>{source}</li>)
              ) : (
                <li>No source metadata recorded.</li>
              )}
            </ul>
          </div>
          <div>
            <h4>Warnings / limitations</h4>
            <ul>
              {region.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
        <h4>Raw evidence strings</h4>
        <ul className="phase-evidence-list">
          {region.evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
