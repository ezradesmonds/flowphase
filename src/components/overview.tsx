import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers, ScanLine, Terminal } from "lucide-react";
import type { ScannerResult } from "@/domain/market";
import { PHASES } from "@/domain/market";
import {
  Confidence,
  DemoNotice,
  DetailLink,
  PageHeading,
  Panel,
  PhaseBadge,
} from "./ui";
import { phaseLabel, signed } from "@/lib/format";

export function Overview({ rows }: { rows: ScannerResult[] }) {
  const counts = PHASES.map((phase) => ({
    phase,
    count: rows.filter((r) => r.currentPhase === phase).length,
  }));
  const accumulation = rows
    .filter((r) => r.currentPhase === "AKUMULASI")
    .sort((a, b) => b.confidence - a.confidence);
  const risk = [...rows]
    .sort((a, b) => b.distributionRisk - a.distributionRisk)
    .slice(0, 3);

  return (
    <div className="space-y-2 font-mono">
      <PageHeading
        eyebrow="FLOWPHASE // MARKET OVERVIEW"
        title="MARKET CYCLE INTELLIGENCE"
        description="Track price cycle phase transitions, broker accumulation patterns, and institutional flow across the Indonesian stock market."
        action={
          <Link href="/scanner" className="button primary">
            OPEN SCANNER [F2] <ArrowUpRight size={13} />
          </Link>
        }
      />
      <DemoNotice />

      <div className="overview-intro flex items-center justify-between text-[10px] text-slate-500 py-1 border-b border-slate-800 mb-2">
        <span className="text-amber flex items-center gap-1.5 font-bold">
          <Terminal size={12} /> DEMO UNIVERSE [SYNTHETIC SNAPSHOT]
        </span>
        <span className="text-slate-400">
          FIXTURE DATE: 28 AUG 2026 // 12 ILLUSTRATIVE SCENARIOS
        </span>
      </div>

      <div className="summary-grid">
        <div className="stat-card total-card" style={{ borderTop: "2px solid var(--cyan)" }}>
          <div className="stat-label">
            <span>UNIVERSE</span>
            <ScanLine size={13} className="text-cyan" />
          </div>
          <div className="stat-value text-cyan">
            {rows.length}
            <span>TICKERS</span>
          </div>
          <p>LOCAL DETERMINISTIC FIXTURES</p>
        </div>

        {counts.map(({ phase, count }) => (
          <Link
            href={`/scanner?phase=${phase}`}
            className={`stat-card phase-${phase.toLowerCase()}`}
            key={phase}
          >
            <div className="stat-label">
              <span className="phase-dot" />
              {phaseLabel(phase)}
            </div>
            <div className="stat-value">
              {count}
              <span>{Math.round((count / rows.length) * 100)}%</span>
            </div>
            <p className="flex items-center gap-1">
              INSPECT <ArrowRight size={10} />
            </p>
          </Link>
        ))}
      </div>

      <div className="overview-middle">
        <Panel
          title="[SEC.01 // PHASE_DISTRIBUTION]"
          note="CROSS-SECTION OF DEMO UNIVERSE"
          action={<span className="subtle-tag">{rows.length} STOCKS</span>}
        >
          <div className="distribution-layout">
            <div
              className="phase-donut"
              role="img"
              aria-label={counts
                .map((c) => `${phaseLabel(c.phase)}: ${c.count}`)
                .join(", ")}
            >
              <div>
                <Layers size={18} className="text-amber" />
                <strong className="text-lg text-white font-bold">{rows.length}</strong>
                <span className="text-[9px] text-slate-400">TICKERS</span>
              </div>
            </div>
            <div className="distribution-legend">
              {counts.map(({ phase, count }) => (
                <Link
                  href={`/scanner?phase=${phase}`}
                  key={phase}
                  className={`phase-${phase.toLowerCase()}`}
                >
                  <span className="phase-dot" />
                  <span>{phaseLabel(phase)}</span>
                  <strong>{count}</strong>
                  <small>{Math.round((count / rows.length) * 100)}%</small>
                </Link>
              ))}
            </div>
          </div>
          <div className="panel-footnote">
            PHASE REGION CLASSIFICATION BASED ON DETERMINISTIC HEURISTICS
          </div>
        </Panel>

        <Panel
          title="[SEC.02 // TIMELINE_EVENTS]"
          note="AUTHORED TRANSITION EVENTS"
          action={
            <Link href="/cycle-replay" className="button text-[10px] text-amber">
              REPLAY [↵] <ArrowUpRight size={11} />
            </Link>
          }
        >
          <div className="events">
            {[rows[1], rows[3], rows[5], rows[2]].map((r, i) => (
              <Link
                href={`/stocks/${r.ticker}`}
                key={r.ticker}
                className="event"
              >
                <div
                  className={`event-marker phase-${r.currentPhase.toLowerCase()}`}
                >
                  <span className="phase-dot" />
                </div>
                <div>
                  <strong>
                    {r.ticker}
                    <small>{r.companyName}</small>
                  </strong>
                  <div className="phase-transition">
                    <span>{i === 0 ? "Akumulasi" : "Pompom"}</span>
                    <ArrowRight size={10} />
                    <PhaseBadge phase={r.currentPhase} />
                  </div>
                </div>
                <span className="event-date">
                  {["06 JUL", "03 AUG", "03 AUG", "03 AUG"][i]}
                  <small>DEMO EVENT</small>
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="two-column">
        <Panel
          title="[SEC.03 // ACCUMULATION_CANDIDATES]"
          note="RANKED BY ESTIMATED CONFIDENCE"
          action={<span className="section-number">SEC 03</span>}
        >
          <div className="table-scroll">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>TICKER</th>
                  <th>CONFIDENCE</th>
                  <th>NET FLOW (COHORT)</th>
                  <th className="text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {accumulation.map((r) => (
                  <tr key={r.ticker}>
                    <td>
                      <Link className="text-cyan hover:text-amber font-bold" href={`/stocks/${r.ticker}`}>
                        {r.ticker}
                        <small className="block text-[9.5px] text-slate-400 font-normal">
                          {r.companyName}
                        </small>
                      </Link>
                    </td>
                    <td>
                      <Confidence value={r.confidence} />
                    </td>
                    <td className="positive tabular-nums font-bold">
                      {signed(r.cumulativeNetFlow)} <small className="text-slate-400 font-normal">LOTS</small>
                    </td>
                    <td className="text-right">
                      <DetailLink ticker={r.ticker} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link
            className="panel-footnote flex items-center justify-between text-cyan hover:text-amber"
            href="/scanner?phase=AKUMULASI"
          >
            <span>VIEW ALL ACCUMULATION SCENARIOS</span>
            <ArrowRight size={12} />
          </Link>
        </Panel>

        <Panel
          title="[SEC.04 // DISTRIBUTION_RISK_WATCH]"
          note="EVALUATED BY DISTRIBUTION RISK METER"
          action={<span className="section-number">SEC 04</span>}
        >
          <div className="p-2 space-y-1.5">
            {risk.map((r) => (
              <Link
                href={`/stocks/${r.ticker}`}
                key={r.ticker}
                className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-slate-900 border border-slate-800 rounded-xs flex items-center justify-center text-amber font-bold text-[10px]">
                    {r.ticker.slice(0, 2)}
                  </div>
                  <div>
                    <strong className="text-white font-bold block">{r.ticker}</strong>
                    <small className="text-slate-400 text-[9.5px]">{r.companyName}</small>
                  </div>
                </div>

                <div className="w-28 text-right">
                  <div className="text-red font-bold tabular-nums">
                    {r.distributionRisk}
                    <small className="text-slate-500 font-normal">/100</small>
                  </div>
                  <div className="meter danger mt-1">
                    <i style={{ width: `${r.distributionRisk}%` }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="panel-footnote">
            RISK EVALUATION IS AN OBJECTIVE SIGNAL, NOT DIRECT TRADING ADVICE
          </div>
        </Panel>
      </div>

      <div className="method-callout">
        <div className="callout-icon">
          <Layers size={16} />
        </div>
        <div>
          <h2>EVIDENCE FIRST. INTERPRETATION SECOND.</h2>
          <p>
            Understand transaction-flow inventory limits and where data boundaries are drawn.
          </p>
        </div>
        <Link href="/methodology">
          METHODOLOGY AUDIT <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
