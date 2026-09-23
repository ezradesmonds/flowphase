import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers, ScanLine } from "lucide-react";
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
    <>
      <PageHeading
        eyebrow="MARKET INTELLIGENCE / OVERVIEW"
        title="See the flow. Understand the phase."
        description="Explore price cycles and broker activity across the Indonesian market."
        action={
          <Link href="/scanner" className="button primary">
            Open scanner <ArrowUpRight size={17} />
          </Link>
        }
      />
      <DemoNotice />
      <div className="overview-intro">
        <span>
          <span className="tiny-square" /> Demo universe
        </span>
        <span>
          Fixture snapshot · 28 Aug 2026 <span className="divider">/</span> 12
          illustrative scenarios
        </span>
      </div>
      <div className="summary-grid">
        <div className="stat-card total-card">
          <div className="stat-label">
            <span>Stocks in demo</span>
            <ScanLine size={18} />
          </div>
          <div className="stat-value">
            {rows.length}
            <span>IDX tickers</span>
          </div>
          <p>Local fixtures · no live scan</p>
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
            <p>
              View scenarios <ArrowRight size={12} />
            </p>
          </Link>
        ))}
      </div>
      <div className="overview-middle">
        <Panel
          title="Market phase distribution"
          note="A cross-section of the demo universe"
          action={<span className="subtle-tag">12 STOCKS</span>}
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
                <Layers size={21} />
                <strong>12</strong>
                <span>demo stocks</span>
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
            Phase labels illustrate different scenarios, not current IDX
            conditions.
          </div>
        </Panel>
        <Panel
          title="Recent phase changes"
          note="Authored events in the demo timeline"
          action={
            <Link href="/cycle-replay" className="text-link">
              Replay <ArrowUpRight size={14} />
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
                    <span>{i === 0 ? "Accumulation" : "Pompom"}</span>
                    <ArrowRight size={12} />
                    <PhaseBadge phase={r.currentPhase} />
                  </div>
                </div>
                <span className="event-date">
                  {["06 Jul", "03 Aug", "03 Aug", "03 Aug"][i]}
                  <small>Demo event</small>
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
      <div className="two-column">
        <Panel
          title="Accumulation candidates"
          note="Illustrative accumulation evidence, ranked by confidence"
          action={<span className="section-number">01</span>}
        >
          <div className="table-scroll">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Phase confidence</th>
                  <th>Cohort net flow</th>
                  <th>
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {accumulation.map((r) => (
                  <tr key={r.ticker}>
                    <td>
                      <Link className="stock-name" href={`/stocks/${r.ticker}`}>
                        {r.ticker}
                        <small>{r.companyName}</small>
                      </Link>
                    </td>
                    <td>
                      <Confidence value={r.confidence} />
                    </td>
                    <td className="positive mono">
                      {signed(r.cumulativeNetFlow)} <small>lots</small>
                    </td>
                    <td>
                      <DetailLink ticker={r.ticker} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link
            className="panel-bottom-link"
            href="/scanner?phase=AKUMULASI"
          >
            Explore accumulation scenarios <ArrowRight size={15} />
          </Link>
        </Panel>
        <Panel
          title="Distribution risk watch"
          note="Higher scores indicate more illustrative warning signs"
          action={<span className="section-number">02</span>}
        >
          <div className="risk-list">
            {risk.map((r) => (
              <Link href={`/stocks/${r.ticker}`} key={r.ticker}>
                <div className="ticker-avatar">{r.ticker.slice(0, 2)}</div>
                <div className="risk-stock">
                  <strong>{r.ticker}</strong>
                  <small>{r.companyName}</small>
                </div>
                <div className="risk-score">
                  <strong>
                    {r.distributionRisk}
                    <small>/100</small>
                  </strong>
                  <div className="meter danger">
                    <i style={{ width: `${r.distributionRisk}%` }} />
                  </div>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
          <div className="panel-footnote">
            A risk score is not a recommendation to buy or sell.
          </div>
        </Panel>
      </div>
      <div className="method-callout">
        <div className="callout-icon">
          <Layers size={21} />
        </div>
        <div>
          <h2>Evidence first. Interpretation second.</h2>
          <p>
            Understand what estimated inventory can tell you—and where the data
            stops.
          </p>
        </div>
        <Link href="/methodology">
          Explore the methodology <ArrowUpRight size={16} />
        </Link>
      </div>
    </>
  );
}
