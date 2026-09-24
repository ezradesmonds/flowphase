"use client";
import { useState } from "react";
import type { Intelligence } from "@/domain/intelligence";
import { CORE_PHASES } from "@/domain/intelligence";
import { PageHeading, Panel } from "./ui";
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
    <div className="space-y-2 font-mono">
      <PageHeading
        eyebrow="FLOWPHASE // SURVEILLANCE FEED"
        title="MARKET INTELLIGENCE ALERT CENTER"
        description="Current-analysis and historical batch signals across price-volume anomalies and observed broker inventory deltas. NEW means latest analysed session, not realtime."
      />

      {/* Severity HUD Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => {
          const count = all.filter((a) => a.severity === s).length;
          const isActive = severity === s;
          return (
            <button
              key={s}
              onClick={() => setSeverity(severity === s ? "" : s)}
              className={`hud-card text-left transition-all ${
                isActive ? "border-amber bg-slate-900" : "border-slate-800"
              }`}
              style={{
                borderTop: `2px solid ${
                  s === "CRITICAL"
                    ? "var(--red)"
                    : s === "HIGH"
                      ? "var(--orange)"
                      : s === "MEDIUM"
                        ? "var(--amber)"
                        : "var(--cyan)"
                }`,
              }}
            >
              <div className="hud-card-header">
                <span className="font-bold tracking-wider">{s} SEVERITY</span>
                <span className="text-[9px] text-slate-500">[FILTER]</span>
              </div>
              <div className="hud-card-value">
                <span className={s === "CRITICAL" ? "text-red" : s === "HIGH" ? "text-orange" : "text-white"}>
                  {count}
                </span>
                <small>ALERTS</small>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Controls */}
      <Panel title="[SEC.01 // SURVEILLANCE_CRITERIA_FILTERS]">
        <div className="filter-toolbar" style={{ margin: 0, border: "none" }}>
          <div className="filter-group">
            <span className="filter-label">TICKER:</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ALL TICKERS"
              className="w-28 text-xs uppercase"
            />
          </div>

          <div className="filter-group">
            <span className="filter-label">TYPE:</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">ALL SIGNAL TYPES</option>
              {[...new Set(all.map((a) => a.type))].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">BROKER:</span>
            <select value={broker} onChange={(e) => setBroker(e.target.value)}>
              <option value="">ALL BROKERS</option>
              {[...new Set(all.flatMap((a) => (a.brokerCode ? [a.brokerCode] : [])))].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">PHASE:</span>
            <select value={phase} onChange={(e) => setPhase(e.target.value)}>
              <option value="">ALL PHASES</option>
              {[...CORE_PHASES, "UNCERTAIN", "TRANSITION"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">STATUS:</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">ALL</option>
              <option value="NEW">NEW ONLY</option>
              <option value="EXPIRED">EXPIRED HISTORICAL</option>
            </select>
          </div>

          <button
            className="terminal-btn"
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
            RESET
          </button>
        </div>
      </Panel>

      <div className="chart-caption flex items-center justify-between">
        <span>MATCHING ALERTS: {filtered.length} // COVERAGE: {analyses.length} SECURITIES</span>
        <span className="text-amber">EXPLAINABLE DETERMINISTIC AUDIT</span>
      </div>

      <div className="panel" style={{ marginBottom: 4 }}>
        <AlertList alerts={filtered} />
      </div>
    </div>
  );
}
