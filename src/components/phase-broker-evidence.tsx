"use client";
import { useMemo } from "react";
import Link from "next/link";
import type { Intelligence } from "@/domain/intelligence";
import type { PhaseRegion } from "@/domain/market";
import { inventoryByPhase } from "@/lib/intelligence/extended/inventory";
import { sessionDate } from "@/lib/phases/features";
import { Value } from "./research-primitives";
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
  const buyers = rows.filter((r) => r.metrics.netLot.value! > 0).slice(0, 3),
    sellers = rows.filter((r) => r.metrics.netLot.value! < 0).slice(-3);
  const signals = region.evidenceItems
    .filter(
      (e) =>
        e.status === "DERIVED" && e.description.includes("normalized support"),
    )
    .slice(0, 3);
  const signalLabels: Record<string, string> = {
    volumeGrowth: "Pertumbuhan volume",
    attentionGrowth: "Peningkatan aktivitas",
    breakoutAttempt: "Upaya menembus batas harga",
    controlledPriceImpact: "Dampak terhadap harga",
    lowVolumeCorrection: "Koreksi dengan volume rendah",
  };
  return (
    <section
      className="research-module phase-broker-panel"
      aria-label="Hovered phase broker evidence"
    >
      <div className="phase-broker-heading">
        <div>
          <small>DETAIL FASE TERPILIH</small>
          <h3>{region.phase.replaceAll("_", " ")}</h3>
        </div>
        <span>
          {sessionDate(region.startTimestamp)} →{" "}
          {sessionDate(region.endTimestamp)}
        </span>
      </div>
      <div className="phase-broker-section">
        <h4>Aktivitas broker pada periode ini</h4>
        {rows.length ? (
          <>
            <p>
              Hingga 3 pembeli dan 3 penjual bersih terbesar. Posisi awal, sisa
              kepemilikan absolut, dan laba/rugi belum tersedia.
            </p>
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
                        <Link href={"/brokers?code=" + r.broker.code}>
                          {r.broker.code}
                        </Link>
                      </td>
                      <td>
                        {r.metrics.netLot.value! > 0 ? "BUY +" : "SELL −"}
                      </td>
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
          </>
        ) : (
          <div className="phase-broker-empty">
            <strong>Belum ada data broker untuk periode terpilih</strong>
            <p>
              Aktivitas beli dan jual broker belum dapat ditampilkan untuk
              rentang tanggal ini.
            </p>
            {analysis.broker.flows.length > 0 && (
              <small>
                Riwayat broker yang tersedia: {analysis.broker.start} —{" "}
                {analysis.broker.end}.
              </small>
            )}
          </div>
        )}
      </div>
      <div className="phase-broker-section">
        <h4>Sinyal yang mendukung penilaian</h4>
        <p>
          Skor 0–100 menunjukkan dukungan tiap indikator, bukan probabilitas
          harga naik.
        </p>
        {signals.length > 0 && (
          <div className="phase-signal-grid">
            {signals.map((e, i) => (
              <div className="phase-signal-card" key={i}>
                <span>
                  {signalLabels[e.feature] ??
                    e.feature.replace(/([a-z])([A-Z])/g, "$1 $2")}
                </span>
                <strong>
                  {typeof e.value === "number" ? e.value.toFixed(1) : "—"}
                  <small> / 100</small>
                </strong>
                <span className="phase-score">
                  <span
                    style={{
                      width: `${typeof e.value === "number" ? Math.max(0, Math.min(100, e.value)) : 0}%`,
                    }}
                  />
                </span>
                <small>Hasil perhitungan model</small>
              </div>
            ))}
          </div>
        )}
        <details className="phase-evidence-details">
          <summary>
            Lihat seluruh bukti dan catatan teknis ({region.evidence.length})
          </summary>
          <ul className="phase-evidence-list">
            {region.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
