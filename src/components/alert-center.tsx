"use client";
import { useState } from "react";
import type { Intelligence } from "@/domain/intelligence";
import { CORE_PHASES } from "@/domain/intelligence";
import { PageHeading } from "./ui";
import { AlertList } from "./intelligence-panels";
export function AlertCenter({ analyses }: { analyses: Intelligence[] }) {
  const [q, setQ] = useState(""),
    [type, setType] = useState(""),
    [severity, setSeverity] = useState(""),
    [broker, setBroker] = useState(""),
    [group, setGroup] = useState(""),
    [phase, setPhase] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [status, setStatus] = useState("");
  const all = analyses
    .flatMap((a) => a.alerts)
    .sort((a, b) => b.timestamp - a.timestamp);
  const filtered = all.filter(
    (a) =>
      (!q || a.ticker.includes(q.toUpperCase())) &&
      (!type || a.type === type) &&
      (!severity || a.severity === severity) &&
      (!broker || a.brokerCode === broker) &&
      (!group || a.brokerClassification === group) &&
      (!phase || a.phase === phase) &&
      (!status || a.status === status) &&
      (!start || a.timestamp >= Date.parse(start) / 1000) &&
      (!end || a.timestamp < Date.parse(end) / 1000 + 86400),
  );
  return (
    <>
      <PageHeading
        title="Alert center"
        description="Explainable signals from analysed coverage. Historical / batch data; no live-feed claim."
      />
      <div className="phase-map">
        {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
          <button
            className="phase-map-item"
            key={s}
            onClick={() => setSeverity(severity === s ? "" : s)}
            aria-pressed={severity === s}
          >
            <span>{s}</span>
            <strong>{all.filter((a) => a.severity === s).length}</strong>
          </button>
        ))}
      </div>
      <div className="panel analysis-toolbar">
        <label>
          Ticker
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {[
          {
            label: "Type",
            value: type,
            set: setType,
            options: [...new Set(all.map((a) => a.type))],
          },
          {
            label: "Broker",
            value: broker,
            set: setBroker,
            options: [
              ...new Set(
                all.flatMap((a) => (a.brokerCode ? [a.brokerCode] : [])),
              ),
            ],
          },
          {
            label: "Classification",
            value: group,
            set: setGroup,
            options: [
              "INSTITUTIONAL_ASSOCIATED",
              "RETAIL_ACCESSIBLE",
              "MIXED_OR_UNKNOWN",
            ],
          },
          {
            label: "Phase",
            value: phase,
            set: setPhase,
            options: [...CORE_PHASES, "UNCLASSIFIED", "TRANSITION"],
          },
          {
            label: "Status",
            value: status,
            set: setStatus,
            options: ["NEW", "EXPIRED"],
          },
        ].map((f) => (
          <label key={f.label}>
            {f.label}
            <select value={f.value} onChange={(e) => f.set(e.target.value)}>
              <option value="">All</option>
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          From
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <button
          className="button"
          onClick={() => {
            setQ("");
            setType("");
            setSeverity("");
            setBroker("");
            setGroup("");
            setPhase("");
            setStart("");
            setEnd("");
            setStatus("");
          }}
        >
          Reset
        </button>
      </div>
      <p className="chart-caption">
        {filtered.length} matching alerts · {analyses.length} analysed stocks ·
        Latest calculation{" "}
        {analyses
          .map((a) => a.calculatedAt)
          .sort()
          .at(-1) ?? "none"}
        . NEW means latest analysed session; it does not mean realtime. Older
        sessions are EXPIRED historical evidence.
      </p>
      <div className="panel">
        <AlertList alerts={filtered} />
      </div>
      <p className="chart-caption">
        Stealth detection unavailable: no verified second-level trades. Buy/sell
        aggressor-volume and free-float turnover alerts are disabled without the
        required fields.
      </p>
    </>
  );
}
