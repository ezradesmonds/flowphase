"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { PHASES, type ScannerResult } from "@/domain/market";
import {
  defaultFilters,
  filterScanner,
  type ScannerFilters,
} from "@/lib/scanner";
import { dateLabel, percent, phaseLabel, signed } from "@/lib/format";
import {
  Confidence,
  DemoNotice,
  DetailLink,
  EmptyState,
  PageHeading,
  PhaseBadge,
} from "./ui";
export function StockTable({ rows }: { rows: ScannerResult[] }) {
  const router = useRouter();
  return (
    <div className="table-scroll">
      <table className="scanner-table">
        <caption className="sr-only">
          Demo scanner results. Net flow and remaining inventory ratio refer to
          demo cohort D1 + D2.
        </caption>
        <thead>
          <tr>
            {[
              "Ticker",
              "Company",
              "Phase",
              "Confidence",
              "Cycle start",
              "Cumulative net flow¹",
              "Est. remaining inventory¹",
              "Relative volume",
              "Distribution risk",
              "Data freshness",
              "Action",
            ].map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.ticker}
              onClick={() => router.push(`/stocks/${r.ticker}`)}
              style={{ cursor: "pointer" }}
            >
              <td>
                <Link className="stock-name" href={`/stocks/${r.ticker}`}>
                  {r.ticker}
                  <small>IDX · Demo</small>
                </Link>
              </td>
              <td>
                {r.companyName}
                <small className="muted" style={{ display: "block" }}>
                  {r.sector}
                </small>
              </td>
              <td>
                <PhaseBadge phase={r.currentPhase} />
              </td>
              <td>
                <Confidence value={r.confidence} />
              </td>
              <td>
                {dateLabel(r.cycleStart)}
                <small className="muted" style={{ display: "block" }}>
                  2026 · authored
                </small>
              </td>
              <td
                className={r.cumulativeNetFlow >= 0 ? "positive" : "negative"}
              >
                {signed(r.cumulativeNetFlow)} lots
              </td>
              <td>
                {percent(r.remainingInventoryRatio)}
                <small className="muted" style={{ display: "block" }}>
                  of cohort peak
                </small>
              </td>
              <td>
                {r.relativeVolume === null
                  ? "Unavailable"
                  : `${r.relativeVolume.toFixed(2)}×`}
              </td>
              <td>
                <span
                  className={`risk-pill ${r.distributionRisk >= 65 ? "high" : ""}`}
                >
                  {r.distributionRisk}/100
                </span>
              </td>
              <td className="freshness">
                28 Aug 2026<small>FIXED DEMO SNAPSHOT</small>
              </td>
              <td>
                <DetailLink ticker={r.ticker} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Scanner({
  rows,
  initialQuery = "",
  initialPhase = "ALL",
}: {
  rows: ScannerResult[];
  initialQuery?: string;
  initialPhase?: ScannerFilters["phase"];
}) {
  const [filters, setFilters] = useState<ScannerFilters>({
    ...defaultFilters,
    query: initialQuery,
    phase: initialPhase,
  });
  const results = filterScanner(rows, filters);
  function update<K extends keyof ScannerFilters>(
    key: K,
    value: ScannerFilters[K],
  ) {
    setFilters((f) => ({ ...f, [key]: value }));
  }
  return (
    <>
      <PageHeading
        eyebrow="RESEARCH / MARKET SCANNER"
        title="Market Scanner"
        description="Compare phase evidence, broker flow and risk across the demo universe."
      />
      <DemoNotice />
      <div className="filters">
        <label className="field search-field">
          <span>Ticker or company</span>
          <input
            type="search"
            placeholder="Search the demo universe…"
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Market phase</span>
          <select
            value={filters.phase}
            onChange={(e) =>
              update("phase", e.target.value as ScannerFilters["phase"])
            }
          >
            <option value="ALL">All phases</option>
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {phaseLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="field range-field">
          <span>Minimum confidence · {filters.minimumConfidence}%</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={filters.minimumConfidence}
            onChange={(e) =>
              update("minimumConfidence", Number(e.target.value))
            }
          />
        </label>
        <label className="field">
          <span>Sector · coming later</span>
          <select disabled aria-label="Sector filter unavailable">
            <option>All sectors</option>
          </select>
        </label>
        <label className="field">
          <span>Sort by</span>
          <select
            value={filters.sort}
            onChange={(e) =>
              update("sort", e.target.value as ScannerFilters["sort"])
            }
          >
            <option value="confidence">Phase confidence</option>
            <option value="distributionRisk">Distribution risk</option>
            <option value="relativeVolume">Relative volume</option>
            <option value="ticker">Ticker</option>
          </select>
        </label>
        <label className="field">
          <span>Order</span>
          <select
            value={filters.direction}
            onChange={(e) =>
              update("direction", e.target.value as "asc" | "desc")
            }
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
        <button
          className="button reset"
          onClick={() => setFilters({ ...defaultFilters })}
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>
      <div className="result-bar">
        <span role="status">
          <strong>{results.length}</strong> of {rows.length} demo stocks{" "}
          <span className="divider">/</span> Local fixtures only
        </span>
        <span style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <SlidersHorizontal size={13} /> Scores are illustrative, not
          probabilities
        </span>
      </div>
      <div className="panel">
        {results.length ? (
          <StockTable rows={results} />
        ) : (
          <EmptyState>
            <button
              className="button"
              onClick={() => setFilters({ ...defaultFilters })}
            >
              Clear all filters
            </button>
          </EmptyState>
        )}
      </div>
      <p className="chart-caption">
        ¹ Net flow and remaining inventory refer to the fixed demo cohort D1 +
        D2, not all market participants. A negative net flow is not literal
        short inventory.
      </p>
    </>
  );
}
