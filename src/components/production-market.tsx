import { analysisSummary } from "@/lib/intelligence/summary";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sectorsRepository } from "@/lib/repositories/sectors-repository";
import { StockDirectory } from "./stock-directory";
import { PageHeading } from "./ui";
import { TradingViewMarketChart } from "./charts/tradingview-market-chart";
import { getIntelligence, listAnalyses } from "@/lib/intelligence/store";
import { IntelligenceDashboard } from "./intelligence-dashboard";
import { compareFreeFloat } from "@/lib/research";

export function ProviderUnavailable() {
  return (
    <>
      <PageHeading
        title="Sectors data unavailable"
        description="The IDX directory could not be loaded. Check server configuration, API access or quota, then retry. No demo data is substituted."
      />
      <Link className="button" href="/scanner">
        Retry directory
      </Link>
    </>
  );
}
export async function ProductionDirectory({
  view = "scanner",
  query = "",
  phase = "",
}: {
  view?: "scanner" | "overview" | "stocks" | "watchlist" | "brokers" | "replay";
  query?: string;
  phase?: string;
}) {
  let universe;
  try {
    universe = await sectorsRepository.listStocks();
  } catch {
    return <ProviderUnavailable />;
  }
  const analyses = (await listAnalyses()).filter((a) =>
    universe.stocks.some((s) => s.ticker === a.ticker),
  );
  if (view === "overview")
    return <IntelligenceDashboard universe={universe} analyses={analyses} />;
  return (
    <StockDirectory
      key={`${view}:${query}:${phase}`}
      universe={universe}
      initialQuery={query}
      initialPhase={phase}
      analyses={analyses.map(analysisSummary)}
      view={view}
    />
  );
}
export async function ProductionStock({
  ticker,
  view = "detail",
}: {
  ticker: string;
  view?: "detail" | "brokers" | "replay";
}) {
  let universe;
  try {
    universe = await sectorsRepository.listStocks();
  } catch {
    return <ProviderUnavailable />;
  }
  const stock = universe.stocks.find((s) => s.ticker === ticker.toUpperCase());
  if (!stock) notFound();
  let analysis;
  try {
    analysis = await getIntelligence(stock.ticker);
  } catch {
    return (
      <>
        <PageHeading
          title={`${stock.ticker} · ${stock.companyName}`}
          description="Analysis is busy or unavailable. Retry shortly."
        />
        <Link href={`/stocks/${stock.ticker}`} className="button">
          Retry analysis
        </Link>
      </>
    );
  }
  const peers = compareFreeFloat(stock, universe.stocks);
  return (
    <>
      <PageHeading
        title={`${stock.ticker} · ${stock.companyName}`}
        description={`${stock.sector ?? "Sector unavailable"} / ${stock.subsector ?? "Subsector unavailable"}`}
        action={
          <Link className="button" href="/scanner">
            All IDX stocks
          </Link>
        }
      />
      <div className="source-strip">
        Company & broker data: Sectors · Company fetched {universe.fetchedAt} ·
        Free float{" "}
        {stock.freeFloat === null
          ? "unavailable"
          : (stock.freeFloat * 100).toFixed(2) + "%"}{" "}
        · Price & volume: TradingView
      </div>
      <div id="chart">
        <TradingViewMarketChart
          key={`${stock.ticker}:${view}`}
          ticker={stock.ticker}
          production
          replay={view === "replay"}
          analysis={analysis}
        />
      </div>
      <details className="panel evidence-inline">
        <summary>Company structure &amp; peers · Why?</summary>
        <p>
          {peers
            ? `Public free float is ${Math.abs(peers.differencePoints).toFixed(2)} percentage points ${peers.differencePoints >= 0 ? "above" : "below"} the ${(peers.median * 100).toFixed(2)}% median of ${peers.peerCount} other companies in the same subsector.`
            : "Peer comparison unavailable."}
        </p>
        <p>
          Sectors public ownership share does not measure executable liquidity.
          Observation dates may differ.
        </p>
      </details>
    </>
  );
}
