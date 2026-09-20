import Link from "next/link";
import { demoMode } from "@/lib/server/mode";
import { ProductionDirectory } from "@/components/production-market";
import { marketRepository } from "@/lib/server/market";
import { DemoNotice, PageHeading, Panel, PhaseBadge } from "@/components/ui";
export default async function StocksPage() {
  if (!demoMode) return <ProductionDirectory view="stocks" />;
  const rows = await marketRepository.listStocks();
  return (
    <>
      <PageHeading
        title="Stock Analysis"
        description="Choose a demo stock to explore its price, phase evidence and broker-flow scenario."
      />
      <DemoNotice />
      <div className="phase-explanations content-gap">
        {rows.map((r) => (
          <Link key={r.ticker} href={`/stocks/${r.ticker}`}>
            <Panel title={r.ticker} note={r.companyName}>
              <div style={{ padding: "0 22px 22px" }}>
                <PhaseBadge phase={r.currentPhase} />
              </div>
            </Panel>
          </Link>
        ))}
      </div>
    </>
  );
}
