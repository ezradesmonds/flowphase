import Link from "next/link";
import { redirect } from "next/navigation";
import { demoMode } from "@/lib/server/mode";
import { marketRepository } from "@/lib/server/market";
import { DemoNotice, PageHeading, Panel } from "@/components/ui";
import { number, signed } from "@/lib/format";
export const metadata = { title: "Broker Flow" };
export default async function BrokerFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  if (!demoMode) {
    const ticker = (await searchParams).ticker;
    redirect(
      ticker
        ? `/stocks/${encodeURIComponent(ticker.toUpperCase())}#inventory`
        : "/stocks",
    );
  }
  const rows = await marketRepository.listStocks();
  const details = (
    await Promise.all(rows.map((r) => marketRepository.getStock(r.ticker)))
  ).filter((s) => s !== null);
  const brokers = ["D1", "D2", "D3", "D4"].map((code) => ({
    code,
    net: details.reduce(
      (sum, s) =>
        sum + s.inventory.find((b) => b.brokerCode === code)!.cumulativeNetLot,
      0,
    ),
    remaining: null,
  }));
  const buyers = brokers.filter((b) => b.net > 0).sort((a, b) => b.net - a.net);
  const sellers = brokers
    .filter((b) => b.net < 0)
    .sort((a, b) => a.net - b.net);
  const gross = brokers.reduce((s, b) => s + Math.abs(b.net), 0);
  const concentration =
    brokers
      .slice()
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      .slice(0, 2)
      .reduce((s, b) => s + Math.abs(b.net), 0) / gross;
  return (
    <>
      <PageHeading
        title="Follow the transaction flow."
        eyebrow="RESEARCH / BROKER FLOW"
        description="Compare fictional broker activity across the 12-stock demo universe."
      />
      <DemoNotice />
      <div className="detail-metrics">
        <div className="detail-metric">
          <span>Fictional brokers</span>
          <strong>04</strong>
          <small>D1–D4 · no real broker identities</small>
        </div>
        <div className="detail-metric">
          <span>Top-two flow concentration</span>
          <strong>{Math.round(concentration * 100)}%</strong>
          <small>Share of absolute broker net lots</small>
        </div>
        <div className="detail-metric">
          <span>All-broker signed net flow</span>
          <strong>{signed(brokers.reduce((s, b) => s + b.net, 0))}</strong>
          <small>Matched demo counterparties</small>
        </div>
        <div className="detail-metric">
          <span>Measurement window</span>
          <strong>20 sessions</strong>
          <small>03–28 Aug 2026 · demo weekdays</small>
        </div>
      </div>
      <div className="two-column">
        {[
          { title: "Top net-buy brokers", data: buyers },
          { title: "Top net-sell brokers", data: sellers },
        ].map((group) => (
          <Panel
            key={group.title}
            title={group.title}
            note="Net transaction flow across current demo periods"
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Demo broker</th>
                    <th>Net flow</th>
                    <th>Sum of stock estimates</th>
                  </tr>
                </thead>
                <tbody>
                  {group.data.map((b) => (
                    <tr key={b.code}>
                      <td>{b.code}</td>
                      <td className={b.net >= 0 ? "positive" : "negative"}>
                        {signed(b.net)} lots
                      </td>
                      <td>{number(b.remaining)} lots</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ))}
      </div>
      <Panel
        title="Estimated inventory changes by stock"
        note="D1 + D2 cohort · current period starts at a zero flow baseline"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Stock</th>
                <th>Cohort net change</th>
                <th>Remaining estimate</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {details.map((s) => (
                <tr key={s.scanner.ticker}>
                  <td>
                    <Link
                      className="text-link"
                      href={`/stocks/${s.scanner.ticker}`}
                    >
                      {s.scanner.ticker} ↗
                    </Link>
                  </td>
                  <td
                    className={
                      s.scanner.cumulativeNetFlow >= 0 ? "positive" : "negative"
                    }
                  >
                    {signed(s.scanner.cumulativeNetFlow)} lots
                  </td>
                  <td>
                    Opening inventory unknown
                  </td>
                  <td>
                    {s.scanner.cumulativeNetFlow >= 0
                      ? "Accumulation evidence"
                      : "Distribution risk"}{" "}
                    · demo
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-footnote">
          Inventory is estimated separately per broker and stock, then summed.
          It is not verified beneficial ownership. Net-negative flow is not
          literal short inventory.
        </div>
      </Panel>
    </>
  );
}
