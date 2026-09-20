import Link from "next/link";
import type { Intelligence } from "@/domain/intelligence";
import { CORE_PHASES } from "@/domain/intelligence";
import type { StockUniverse } from "@/domain/securities";
import { PageHeading, Panel } from "./ui";
import { AlertList } from "./intelligence-panels";
import { num, readable, groupLabel } from "@/lib/intelligence/format";
export function IntelligenceDashboard({
  universe,
  analyses,
}: {
  universe: StockUniverse;
  analyses: Intelligence[];
}) {
  const sufficient = analyses.filter(
    (a) => a.priceVolume?.sufficient && !a.priceVolume.anomaly,
  );
  const phases = [...CORE_PHASES, "UNCLASSIFIED", "TRANSITION"];
  const alerts = analyses
    .flatMap((a) => a.alerts)
    .filter((a) => a.status === "NEW")
    .sort((a, b) => b.timestamp - a.timestamp);
  const latest = analyses
    .map((a) => a.calculatedAt)
    .sort()
    .at(-1);
  return (
    <>
      <PageHeading
        title="Market intelligence"
        description="Phase structure, broker participation and unusual activity across your analysed coverage."
        action={
          <Link prefetch={false} href="/scanner" className="button">
            Expand coverage →
          </Link>
        }
      />
      <div className="source-strip">
        Analysed {analyses.length} of {universe.total} supported stocks ·{" "}
        {sufficient.length} with sufficient price-volume history ·{" "}
        {alerts.length} latest-session alerts
        <br />
        Sectors directory fetched {universe.fetchedAt} · TradingView{" "}
        {analyses.some((a) => a.candles)
          ? "snapshots available"
          : "not analysed"}{" "}
        · Last calculation {latest ?? "none"} · Historical / batch, exchange
        delay unknown
      </div>
      <div className="phase-map">
        {phases.map((phase) => {
          const count = analyses.filter((a) => a.phase === phase).length;
          return (
            <Link
              prefetch={false}
              href={`/scanner?phase=${phase}`}
              className={`phase-map-item phase-${phase.toLowerCase()}`}
              key={phase}
            >
              <span>{readable(phase)}</span>
              <strong>{count}</strong>
              <small>
                {analyses.length
                  ? num((count / analyses.length) * 100, 1)
                  : "0"}
                % of analysed coverage
              </small>
            </Link>
          );
        })}
      </div>
      {!analyses.length && (
        <div className="panel evidence-inline">
          <h2>No calculated coverage yet</h2>
          <p>
            Open a real Sectors stock or analyse a small scanner batch. Counts
            above describe zero analysed stocks, not the market.
          </p>
          <Link prefetch={false} href="/scanner" className="button">
            Choose stocks to investigate
          </Link>
        </div>
      )}
      <div className="two-column">
        <Panel
          title="New phase transitions"
          note="Most recent observed changes per analysed ticker"
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Transition</th>
                  <th>Date</th>
                  <th>Confidence change</th>
                </tr>
              </thead>
              <tbody>
                {analyses
                  .filter(
                    (a) =>
                      a.regions.length > 1 &&
                      a.regions.at(-1)!.phase !== a.regions.at(-2)!.phase,
                  )
                  .sort(
                    (a, b) =>
                      b.regions.at(-1)!.startTimestamp -
                      a.regions.at(-1)!.startTimestamp,
                  )
                  .slice(0, 10)
                  .map((a) => {
                    const current = a.regions.at(-1)!,
                      prior = a.regions.at(-2)!;
                    return (
                      <tr key={a.ticker}>
                        <td>
                          <Link
                            prefetch={false}
                            href={`/stocks/${a.ticker}`}
                            className="text-link"
                          >
                            {a.ticker}
                          </Link>
                        </td>
                        <td>
                          {readable(prior.phase)} → {readable(current.phase)}
                        </td>
                        <td>
                          {new Date(current.startTimestamp * 1000)
                            .toISOString()
                            .slice(0, 10)}
                        </td>
                        <td>{current.confidence - prior.confidence} points</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="chart-caption">
            Gaps may contain unclassified/transition bars. A phase change is not
            a trade recommendation.
          </p>
        </Panel>
        <Panel
          title="Stocks to investigate"
          note="Strongest current heuristic confidence; not a return ranking"
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Phase</th>
                  <th>Confidence</th>
                  <th>RVOL</th>
                  <th>Why?</th>
                </tr>
              </thead>
              <tbody>
                {[...analyses]
                  .sort((a, b) => b.confidence - a.confidence)
                  .slice(0, 10)
                  .map((a) => (
                    <tr key={a.ticker}>
                      <td>
                        <Link
                          prefetch={false}
                          href={`/stocks/${a.ticker}`}
                          className="text-link"
                        >
                          {a.ticker}
                        </Link>
                      </td>
                      <td>{readable(a.phase)}</td>
                      <td>{a.confidence}%</td>
                      <td>{num(a.priceVolume?.relativeVolume, 2)}</td>
                      <td>
                        <Link prefetch={false} href={`/stocks/${a.ticker}`}>
                          Evidence →
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <div className="two-column">
        {(["INSTITUTIONAL_ASSOCIATED", "RETAIL_ACCESSIBLE"] as const).map(
          (classification) => (
            <Panel
              key={classification}
              title={`${groupLabel(classification)} flow leaders`}
              note="Heuristic groups · available broker periods may differ"
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Stock / phase</th>
                      <th>Net lots</th>
                      <th>Brokers</th>
                      <th>Net IDR</th>
                      <th>Price change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses
                      .filter((a) => a.inventory.length)
                      .map((a) => ({
                        a,
                        g: a.groups.find(
                          (g) => g.classification === classification,
                        )!,
                      }))
                      .sort((a, b) => b.g.netLot - a.g.netLot)
                      .slice(0, 8)
                      .map(({ a, g }) => (
                        <tr key={a.ticker}>
                          <td>
                            <Link
                              prefetch={false}
                              href={`/stocks/${a.ticker}`}
                              className="text-link"
                            >
                              {a.ticker}
                            </Link>
                            <small className="cell-note">
                              {readable(a.phase)}
                            </small>
                          </td>
                          <td>{num(g.netLot)}</td>
                          <td>{g.brokers}</td>
                          <td>{num(g.netValue)}</td>
                          <td>
                            {a.priceVolume?.priceReturn === null
                              ? "Unavailable"
                              : num(
                                  (a.priceVolume?.priceReturn ?? 0) * 100,
                                  2,
                                ) + "%"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="chart-caption">
                Why? Sum of signed net flow for configured brokers over each
                stock&apos;s available period. Unknown/mixed flow remains
                visible in stock detail.
              </p>
            </Panel>
          ),
        )}
      </div>
      <Panel
        title="High-priority alerts"
        note="Latest analysed candle / session · historical alerts available in Alert Center"
      >
        <AlertList
          alerts={alerts
            .filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL")
            .slice(0, 15)}
        />
        <p className="chart-caption">
          <Link prefetch={false} href="/alerts">
            Open all alerts →
          </Link>
        </p>
      </Panel>
      <p className="chart-caption">
        A cache older than 15 minutes is stale. Refresh individual stocks from
        their page or the scanner; there is no automatic universe-wide polling.
        All analytical scores require calibration.{" "}
        <Link prefetch={false} href="/methodology">
          Why these rules?
        </Link>
      </p>
    </>
  );
}
