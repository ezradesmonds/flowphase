"use client";

import { useEffect, useMemo, useState } from "react";
import type { normalizeOwnership } from "@/lib/intelligence/extended/ownership";
import { display, Evidence, exportCSV, Value } from "./research-primitives";

type Ownership = ReturnType<typeof normalizeOwnership>;

export function HolderWorkspace({
  symbol,
  minimumPercentage,
}: {
  symbol: string;
  minimumPercentage: 1 | 5;
}) {
  const [data, setData] = useState<Ownership | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/stocks/${symbol}/ownership`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Ownership Request Failed");
        return response.json();
      })
      .then((response) => {
        if (active) {
          setData(response.data);
          setError(false);
        }
      })
      .catch(() => active && setError(true));
    return () => { active = false; };
  }, [symbol, retry]);

  const holders = useMemo(
    () =>
      (data?.shareholders ?? [])
        .filter(
          (holder) =>
            !holder.aggregate &&
            holder.percentage.value !== null &&
            holder.percentage.value >= minimumPercentage &&
            holder.name.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .sort((a, b) => (b.percentage.value ?? 0) - (a.percentage.value ?? 0)),
    [data, minimumPercentage, query],
  );

  if (error)
    return (
      <section className="panel research-module">
        <h2>Holder Above {minimumPercentage}%</h2>
        <p>Ownership Data Is Unavailable From The Current Provider.</p>
        <button className="button" onClick={() => { setError(false); setRetry((value) => value + 1); }}>
          Retry
        </button>
      </section>
    );
  if (!data)
    return <section className="panel research-module" aria-busy="true"><h2>Holder Above {minimumPercentage}%</h2><p className="skeleton">Loading Provider Records…</p></section>;

  return (
    <section className="panel research-module holder-module">
      <div className="research-module-heading">
        <div>
          <p className="module-kicker">[ Holder &gt; {minimumPercentage}% ]</p>
          <h2>Reported Major Shareholders</h2>
          <p className="muted">{symbol} · Sectors Company Report · Fetched {data.meta.as_of}</p>
        </div>
        <span className="panel-tag text-cyan">{holders.length} Holders</span>
      </div>
      <div className="research-cards">
        <div><small>Minimum Ownership</small><strong>{minimumPercentage}%</strong></div>
        <div><small>Reported Holders</small><strong>{holders.length}</strong></div>
        <div><small>Latest Composition Period</small><strong>{data.history.at(-1)?.date ?? "Unavailable"}</strong></div>
        <div><small>Shareholder Count</small><strong>{display(data.history.at(-1)?.shareholders.value)}</strong></div>
      </div>
      <div className="research-filters">
        <label>Search Investor<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Investor Name…" /></label>
        <button className="button" onClick={() => exportCSV(holders.map((holder) => ({ investor: holder.name, shares: holder.shares.value, lots: holder.lots.value, percentage: holder.percentage.value, source: data.meta.source.join(";"), as_of: data.meta.as_of })), `${symbol}-holders-above-${minimumPercentage}.csv`)}>Export CSV</button>
      </div>
      {holders.length ? (
        <div className="table-scroll">
          <table>
            <thead><tr><th>#</th><th>Investor</th><th>Reported Shares</th><th>Lots</th><th>Ownership</th><th>Status</th></tr></thead>
            <tbody>{holders.map((holder, index) => <tr key={holder.id}><td>{index + 1}</td><td><strong>{holder.name}</strong></td><td><Value metric={holder.shares} /></td><td><Value metric={holder.lots} /></td><td className="positive"><Value metric={holder.percentage} />%</td><td>Provider Reported</td></tr>)}</tbody>
          </table>
        </div>
      ) : <p className="empty-state">No Reported Holder Meets This Threshold. Missing Data Is Not Zero.</p>}
      <p className="muted broker-disclaimer">These Records Are Disclosure-Scoped. They Do Not Establish Ultimate Beneficial Ownership Or Current Tradable Float.</p>
      <Evidence value={data.meta} />
    </section>
  );
}
