import { MarketRadar } from "@/components/market-radar";
import { PageHeading } from "@/components/ui";
import { getMarketRadar } from "@/lib/market-radar";
import { demoMode } from "@/lib/server/mode";

export const metadata = { title: "Market Radar" };
export const dynamic = "force-dynamic";

export default async function RadarPage() {
  if (demoMode)
    return (
      <>
        <PageHeading
          eyebrow="DISCOVER // SECTORS MARKET STRUCTURE"
          title="Market Radar"
          description="Market Radar uses live Sectors ranking feeds and is intentionally disabled in synthetic demo mode."
        />
        <div className="empty-state p-8 text-center">
          <strong>PRODUCTION DATA REQUIRED</strong>
          <p className="muted mt-2">Set FLOWPHASE_MODE=production and configure SECTORS_API_KEY.</p>
        </div>
      </>
    );
  try {
    const snapshot = await getMarketRadar();
    return (
      <>
        <PageHeading
          eyebrow="DISCOVER // SECTORS MARKET STRUCTURE"
          title="Market Radar"
          description="Reduce the IDX universe into explainable research candidates before running deeper FlowPhase phase analysis."
        />
        <MarketRadar snapshot={snapshot} />
      </>
    );
  } catch {
    return (
      <>
        <PageHeading
          eyebrow="DISCOVER // SECTORS MARKET STRUCTURE"
          title="Market Radar"
          description="Sectors discovery feeds are currently unavailable. No synthetic market candidates are substituted."
        />
        <div className="empty-state p-8 text-center" role="alert">
          <strong>RADAR DATA UNAVAILABLE</strong>
          <p className="muted mt-2">
            Check Sectors credentials, plan access or rate limits, then reload this page.
          </p>
        </div>
      </>
    );
  }
}
