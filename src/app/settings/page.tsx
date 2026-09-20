import { DemoNotice, PageHeading, Panel } from "@/components/ui";
import { demoMode } from "@/lib/server/mode";
export const metadata = { title: "Settings" };
export default function Settings() {
  if (!demoMode)
    return (
      <>
        <PageHeading
          title="Workspace settings"
          description="Production data sources. Credentials remain on the server."
        />
        <Panel title="Sectors + TradingView" note="No automatic demo fallback">
          <div className="settings-list">
            {[
              [
                "Stock universe",
                "All paginated IDX companies from Sectors; directory cached for 24 hours to conserve API credits.",
              ],
              [
                "Chart source",
                "TradingView only. OHLCV and phase regions are calculated per chart.",
              ],
              [
                "Non-chart intelligence",
                "Sectors classifications, free float and per-stock broker flow when available.",
              ],
              [
                "Unavailable data",
                "Missing values remain unavailable. No fictitious prices, brokers or scores.",
              ],
              [
                "Watchlist",
                "Browser-local production watchlist, isolated from demo mode.",
              ],
              [
                "Mode",
                "Production (default). Demo fixtures require FLOWPHASE_MODE=demo on the server.",
              ],
            ].map(([title, text]) => (
              <div className="settings-row" key={title}>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </>
    );
  return (
    <>
      <PageHeading
        title="Workspace settings"
        description="A local research environment with transparent defaults."
      />
      <DemoNotice />
      <div className="content-gap">
        <Panel
          title="Environment"
          note="TradingView charts and isolated demo analysis"
        >
          <div className="settings-list">
            {[
              [
                "Data source",
                "TradingView supplies market candles on stock detail pages. Broker flows, phases and replay remain synthetic fixtures.",
                "Mixed sources",
              ],
              [
                "Appearance",
                "Dark navy research workspace with semantic phase colors.",
                "Dark",
              ],
              [
                "Watchlist storage",
                "Saved locally in this browser. No account or cloud synchronization.",
                "Local",
              ],
              [
                "Market timezone",
                "Fixture dates are ISO calendar dates. Snapshot metadata is shown in UTC.",
                "Fixed fixtures",
              ],
              [
                "API integration",
                "Server-only TradingView connection; anonymous by default. Sectors is not connected. No bid-offer feed.",
                "TradingView",
              ],
            ].map(([title, description, value]) => (
              <div className="settings-row" key={title}>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
