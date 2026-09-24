"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Radar, RefreshCw } from "lucide-react";
import type { RadarCandidate, RadarSnapshot } from "@/domain/radar";
import { EmptyState, Panel, PhaseBadge } from "./ui";

function idr(value: number | null) {
  if (value === null) return "Unavailable";
  const abs = Math.abs(value);
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  if (abs >= 1e12) return `${sign}Rp${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}Rp${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}Rp${(abs / 1e6).toFixed(1)}M`;
  return `${sign}Rp${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function percent(value: number | null) {
  return value === null ? "Unavailable" : `${(value * 100).toFixed(1)}%`;
}

function triggerTone(type: RadarCandidate["triggers"][number]["type"]) {
  if (type === "TOP_GAINER") return "positive";
  if (type === "TOP_LOSER") return "negative";
  return "text-cyan";
}

export function MarketRadar({ snapshot }: { snapshot: RadarSnapshot }) {
  const router = useRouter();
  const [mode, setMode] = useState<"ALL" | "CONFLUENCE" | "GAINERS" | "LOSERS">("ALL");
  const [query, setQuery] = useState("");
  const [busyTicker, setBusyTicker] = useState<string | null>(null);
  const [errorTicker, setErrorTicker] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snapshot.candidates.filter((row) => {
      if (q && !`${row.ticker} ${row.companyName} ${row.sector ?? ""}`.toLowerCase().includes(q))
        return false;
      if (mode === "CONFLUENCE" && row.discoveryStrength < 2) return false;
      if (mode === "GAINERS" && !row.triggers.some((item) => item.type === "TOP_GAINER")) return false;
      if (mode === "LOSERS" && !row.triggers.some((item) => item.type === "TOP_LOSER")) return false;
      return true;
    });
  }, [mode, query, snapshot.candidates]);

  async function analyze(ticker: string) {
    setBusyTicker(ticker);
    setErrorTicker(null);
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!response.ok) throw new Error("analysis failed");
      router.push(`/stocks/${ticker}`);
      router.refresh();
    } catch {
      setErrorTicker(ticker);
      setBusyTicker(null);
    }
  }

  return (
    <div className="space-y-2 font-mono">
      <div className="demo-notice" role="status">
        <Radar size={13} />
        <strong>SECTORS MARKET DISCOVERY</strong>
        <span>
          {snapshot.marketDate ?? "LATEST AVAILABLE SESSION"} · CACHED RANKING FEEDS · FOREIGN FLOW CONTEXT BOUNDED TO TOP CANDIDATES
        </span>
      </div>

      {snapshot.warnings.map((warning) => (
        <p key={warning} className="chart-caption text-amber font-semibold" role="status">
          [WARNING] {warning}
        </p>
      ))}

      <div className="detail-metrics">
        <div className="detail-metric">
          <span>DISCOVERY CANDIDATES</span>
          <strong className="text-white">{snapshot.candidates.length}</strong>
        </div>
        <div className="detail-metric">
          <span>DUAL-SIGNAL CANDIDATES</span>
          <strong className="text-cyan">
            {snapshot.candidates.filter((row) => row.discoveryStrength === 2).length}
          </strong>
        </div>
        <div className="detail-metric">
          <span>ALREADY ANALYSED</span>
          <strong className="text-white">
            {snapshot.candidates.filter((row) => row.analysis).length}
          </strong>
        </div>
        <div className="detail-metric">
          <span>DISCOVERY LOGIC</span>
          <strong className="text-amber">ORDINAL · EXPLAINABLE</strong>
        </div>
      </div>

      <Panel title="[RADAR.01 // DISCOVERY_FILTERS]" note="NO BLACK-BOX SCORE">
        <div className="filter-toolbar" style={{ margin: 0, border: "none" }}>
          <label className="filter-group">
            <span className="filter-label">SEARCH:</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="TICKER / COMPANY / SECTOR"
              aria-label="Search radar candidates"
            />
          </label>
          <div className="filter-group" role="group" aria-label="Radar trigger filter">
            <span className="filter-label">TRIGGER:</span>
            {(["ALL", "CONFLUENCE", "GAINERS", "LOSERS"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`terminal-btn ${mode === value ? "active" : ""}`}
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
              >
                {value}
              </button>
            ))}
          </div>
          <button className="terminal-btn" type="button" onClick={() => router.refresh()}>
            <RefreshCw size={11} /> REFRESH VIEW
          </button>
        </div>
      </Panel>

      <Panel
        title="[RADAR.02 // RESEARCH_CANDIDATES]"
        note={`${rows.length} VISIBLE · PRIORITY = INDEPENDENT TRIGGER COUNT → BEST SOURCE RANK`}
      >
        {rows.length ? (
          <div className="table-scroll">
            <table className="scanner-table radar-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Security</th>
                  <th>Why it appeared</th>
                  <th>Foreign flow</th>
                  <th>Existing phase</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.ticker}>
                    <td>
                      <strong className={row.discoveryStrength === 2 ? "text-cyan" : "text-white"}>
                        {row.discoveryStrength}/2 SIGNALS
                      </strong>
                      <small className="muted" style={{ display: "block" }}>
                        BEST SOURCE RANK #{row.bestRank}
                      </small>
                    </td>
                    <td>
                      <Link href={`/stocks/${row.ticker}`} className="stock-name">
                        {row.ticker}
                      </Link>
                      <small className="muted" style={{ display: "block", maxWidth: 220 }}>
                        {row.companyName}
                      </small>
                      <small className="muted" style={{ display: "block" }}>
                        {row.sector ?? "SECTOR UNAVAILABLE"}
                      </small>
                    </td>
                    <td>
                      <div className="radar-trigger-list">
                        {row.triggers.map((item) => (
                          <div key={`${item.type}:${item.rank}`} className={triggerTone(item.type)}>
                            {item.label}
                            {item.type === "MOST_TRADED"
                              ? ` · ${item.date}`
                              : ` · ${(item.value * 100).toFixed(2)}% · ${item.date}`}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      {row.foreignFlow ? (
                        <>
                          <strong
                            className={
                              (row.foreignFlow.net ?? 0) > 0
                                ? "positive"
                                : (row.foreignFlow.net ?? 0) < 0
                                  ? "negative"
                                  : "text-white"
                            }
                          >
                            {idr(row.foreignFlow.net)}
                          </strong>
                          <small className="muted" style={{ display: "block" }}>
                            FOREIGN SHARE {percent(row.foreignFlow.share)} · {row.foreignFlow.date}
                          </small>
                        </>
                      ) : (
                        <span className="muted">Not enriched</span>
                      )}
                    </td>
                    <td>
                      {row.analysis ? (
                        <>
                          <PhaseBadge phase={row.analysis.state} />
                          <small className="muted" style={{ display: "block", marginTop: 4 }}>
                            EVIDENCE {row.analysis.confidence}/100 · {row.analysis.evidenceBasis.replaceAll("_", " ")}
                          </small>
                        </>
                      ) : (
                        <span className="muted">NOT ANALYSED</span>
                      )}
                    </td>
                    <td>
                      {row.analysis ? (
                        <Link className="terminal-btn cyan" href={`/stocks/${row.ticker}`}>
                          OPEN ANALYSIS <ArrowUpRight size={11} />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="terminal-btn primary"
                          disabled={busyTicker !== null}
                          onClick={() => analyze(row.ticker)}
                        >
                          {busyTicker === row.ticker ? "ANALYSING…" : "ANALYZE WITH FLOWPHASE"}
                        </button>
                      )}
                      {errorTicker === row.ticker && (
                        <small className="negative" style={{ display: "block", marginTop: 5 }}>
                          ANALYSIS BUSY / PROVIDER ERROR · RETRY
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="NO RADAR CANDIDATES MATCH"
            description="Clear the search or trigger filter. Discovery data is not replaced with synthetic production rows."
          />
        )}
      </Panel>

      <Panel title="[RADAR.03 // WHY_THIS_LIST]" note="AUDITABLE DISCOVERY METHOD">
        <div className="evidence-inline">
          <p>{snapshot.methodology}</p>
          <p>
            <strong>Foreign flow is contextual evidence only.</strong> A large inflow or outflow does not promote or demote a candidate because absolute flow is not directly comparable across different company sizes.
          </p>
          <p>
            <strong>Source coverage:</strong> {snapshot.sources.join(" · ")}
          </p>
          <p className="muted">
            Radar discovers research candidates; it does not predict direction. Open a candidate to run the existing price-volume, broker, phase, ownership and evidence workflow.
          </p>
        </div>
      </Panel>
    </div>
  );
}
