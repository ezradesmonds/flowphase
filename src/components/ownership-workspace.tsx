"use client";
import { useEffect, useState } from "react";
import { activeRelation } from "@/lib/intelligence/extended/model";
import type { normalizeOwnership } from "@/lib/intelligence/extended/ownership";
import { Value, Evidence, SaveResearch } from "./research-primitives";
type Ownership = ReturnType<typeof normalizeOwnership>;
export function OwnershipWorkspace({
  symbol,
  initialThreshold = 0,
}: {
  symbol: string;
  initialThreshold?: number;
}) {
  const [data, setData] = useState<Ownership | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0),
    [selected, setSelected] = useState(""),
    [verified, setVerified] = useState(false),
    [threshold, setThreshold] = useState(initialThreshold),
    [period, setPeriod] = useState("ALL"),
    [view, setView] = useState("Company View"),
    [includeInferred, setIncludeInferred] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/stocks/" + symbol + "/ownership")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((r) => {
        if (alive) {
          setData(r.data);
          setError(false);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [symbol, retry]);
  if (error)
    return (
      <section className="panel research-module">
        <h2>Ownership & Relations</h2>
        <p>Ownership unavailable. Provider request or validation failed.</p>
        <button
          onClick={() => {
            setError(false);
            setRetry(retry + 1);
          }}
        >
          Retry
        </button>
      </section>
    );
  if (!data)
    return (
      <section className="panel research-module" aria-busy="true">
        <h2>Ownership & Relations</h2>
        <p className="skeleton">Loading verified provider records…</p>
      </section>
    );
  const latest = data.history.at(-1),
    relations = data.relations.filter(
      (r) =>
        (!verified || r.verification_status === "VERIFIED") &&
        (includeInferred || r.verification_status !== "INFERRED") &&
        (threshold === 0 ||
          (r.ownership_percentage !== null &&
            r.ownership_percentage >= threshold)) &&
        (period === "ALL" ||
          (period === "CURRENT" &&
            activeRelation(r, data.meta.as_of?.slice(0, 10) ?? "")) ||
          (period === "HISTORICAL" &&
            r.effective_to !== null &&
            r.effective_to < (data.meta.as_of?.slice(0, 10) ?? ""))),
    );
  const nodes = data.nodes.filter(
    (n) =>
      n.id === "stock:" + symbol ||
      relations.some((r) => r.from === n.id || r.to === n.id),
  );
  const entity = data.nodes.find((n) => n.id === selected);
  const position = (id: string) => {
    const i = nodes.findIndex((n) => n.id === id);
    if (i === 0) return { x: 350, y: 220 };
    const angle =
      ((i - 1) / Math.max(1, nodes.length - 1)) * Math.PI * 2 - Math.PI / 2;
    return { x: 350 + Math.cos(angle) * 235, y: 220 + Math.sin(angle) * 165 };
  };
  return (
    <section className="panel research-module">
      <h2>Ownership & Relations</h2>
      <p>
        Source: Sectors company report and monthly shareholder composition ·
        fetched {data.meta.as_of}
      </p>
      <p className="muted">
        Broker flow is not shareholder ownership. Name similarity never merges
        entities. Disclosure-scoped nodes do not establish ultimate beneficial
        ownership.
      </p>
      <div className="research-cards">
        <div>
          <small>Reported shares · basis unverified</small>
          <strong>
            {latest ? <Value metric={latest.shares} /> : "Unavailable"}
          </strong>
        </div>
        <div>
          <small>Shareholder count</small>
          <strong>
            {latest ? <Value metric={latest.shareholders} /> : "Unavailable"}
          </strong>
        </div>
        <div>
          <small>Effective composition period</small>
          <strong>{latest?.date ?? "Unavailable"}</strong>
        </div>
        {data.shareholders
          .filter((h) => h.aggregate)
          .map((h) => (
            <div key={h.id}>
              <small>{h.name} · reported shares</small>
              <strong>
                <Value metric={h.shares} />
              </strong>
            </div>
          ))}
        <div>
          <small>Publication date / UBO</small>
          <strong>Unavailable</strong>
        </div>
      </div>
      {((data.ownershipIntelligence?.whaleInvestors?.length ?? 0) > 0 ||
        (data.ownershipIntelligence?.conglomerateGroups?.length ?? 0) > 0 ||
        data.ownershipIntelligence?.topTransactions) && (
        <div className="ownership-intelligence-strip">
          <div>
            <small>Named Whale Investors</small>
            <strong>{data.ownershipIntelligence?.whaleInvestors?.join(" · ") || "Unavailable"}</strong>
          </div>
          <div>
            <small>Conglomerate Groups</small>
            <strong>{data.ownershipIntelligence?.conglomerateGroups?.join(" · ") || "Unavailable"}</strong>
          </div>
          <div>
            <small>Latest Institutional Changes</small>
            <strong>{data.ownershipIntelligence?.topTransactions?.date ?? "Unavailable"}</strong>
            <span>
              Buyers: {data.ownershipIntelligence?.topTransactions?.top_buyers?.map((row) => row.name).join(", ") || "Unavailable"}
              {" · "}Sellers: {data.ownershipIntelligence?.topTransactions?.top_sellers?.map((row) => row.name).join(", ") || "Unavailable"}
            </span>
          </div>
        </div>
      )}
      <div className="research-filters">
        <label>
          View
          <select value={view} onChange={(e) => setView(e.target.value)}>
            {[
              "Company View",
              "Owner View",
              "Group View",
              "Broker Affiliation View",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="ALL">All including unknown dates</option>
            <option value="CURRENT">Dated current relationships</option>
            <option value="HISTORICAL">Historical relationships</option>
          </select>
        </label>
        <label>
          Minimum ownership %
          <input
            type="number"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
          />
          Officially verified only
        </label>
        <label>
          <input
            type="checkbox"
            checked={includeInferred}
            onChange={(e) => setIncludeInferred(e.target.checked)}
          />
          Include inferred
        </label>
      </div>
      {view === "Group View" || view === "Broker Affiliation View" ? (
        <p className="empty-state">
          Verified group/parent identities and broker affiliations are not
          configured. No relationships are inferred from traded stocks.
        </p>
      ) : (
        <div className="ownership-layout">
          <aside>
            <h3>Major shareholders</h3>
            {data.shareholders.length ? (
              data.shareholders
                .filter((h) => !h.aggregate)
                .map((h) => (
                  <button
                    key={h.id}
                    className="research-entity"
                    onClick={() => setSelected(h.id)}
                  >
                    {h.name}
                    <br />
                    <Value metric={h.percentage} />% ·{" "}
                    <Value metric={h.shares} /> shares
                  </button>
                ))
            ) : (
              <p>Unavailable</p>
            )}
          </aside>
          <div>
            <h3>Ownership & Relationship Map</h3>
            <svg
              viewBox="0 0 700 450"
              role="img"
              aria-label="Reported legal ownership graph"
            >
              {relations.map((r) => {
                const a = position(r.from),
                  b = position(r.to);
                return (
                  <line
                    key={r.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={
                      r.category === "LEGAL OWNERSHIP" ? "#60a5fa" : "#c084fc"
                    }
                    strokeDasharray={
                      r.verification_status === "VERIFIED" ? undefined : "5 4"
                    }
                  >
                    <title>
                      {r.type +
                        " · " +
                        r.source +
                        " · " +
                        (r.ownership_percentage ?? "Unknown") +
                        "% · effective date " +
                        (r.effective_from ?? "Unknown")}
                    </title>
                  </line>
                );
              })}
              {nodes.map((n) => {
                const p = position(n.id);
                return (
                  <g
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    aria-label={"Select " + n.name}
                    onClick={() => setSelected(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelected(n.id);
                    }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={n.id === "stock:" + symbol ? 36 : 23}
                      fill={n.id === selected ? "#17445c" : "#102b3c"}
                      stroke={n.id === selected ? "#8eeaff" : "#27b7ea"}
                      strokeWidth={n.id === "stock:" + symbol ? 3 : 1.5}
                    />
                    <path
                      d={`M${p.x - 8} ${p.y + 9}v-18h16v18m-20 0h24m-15-13h2m4 0h2m-8 5h2m4 0h2m-8 5h2m4 0h2`}
                      fill="none"
                      stroke="#73d9f7"
                      strokeWidth="2"
                    />
                    <text
                      x={p.x}
                      y={p.y + (n.id === "stock:" + symbol ? 54 : 41)}
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="12"
                    >
                      {n.name.slice(0, 30)}
                    </text>
                    <title>{n.name}</title>
                  </g>
                );
              })}
            </svg>
            <p>
              Blue: legal ownership · dashed: provider reported, not official
              verification · solid: officially verified.
            </p>
            {!relations.length && <p>No relationships match the filter.</p>}
          </div>
          <aside>
            <h3>Entity Inspector</h3>
            {entity ? (
              <>
                <strong>{entity.name}</strong>
                <p>{entity.type}</p>
                <SaveResearch type="OWNER" id={entity.id} label={entity.name} />
                <Evidence
                  value={data.relations.filter(
                    (r) => r.from === entity.id || r.to === entity.id,
                  )}
                />
                <p>
                  Other listed holdings: unavailable without resolved legal
                  entity IDs.
                </p>
              </>
            ) : (
              <p>Select a node or shareholder.</p>
            )}
          </aside>
        </div>
      )}
      <h3>Ownership history</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Reported shares</th>
              <th>Shareholders</th>
              <th>Local categories</th>
              <th>Foreign categories</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map((h) => (
              <tr key={h.date}>
                <td>{h.date}</td>
                <td>
                  <Value metric={h.shares} />
                </td>
                <td>
                  <Value metric={h.shareholders} />
                </td>
                <td>
                  {h.categories.total_l ? (
                    <Value metric={h.categories.total_l} />
                  ) : (
                    "Unavailable"
                  )}
                </td>
                <td>
                  {h.categories.total_f ? (
                    <Value metric={h.categories.total_f} />
                  ) : (
                    "Unavailable"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Categories may not sum to reported shares; no inferred free-float or
        outstanding denominator.
      </p>
      <details>
        <summary>Unavailable fields</summary>
        {data.unavailable.join(" · ")}
      </details>
      <Evidence value={data.meta} />
    </section>
  );
}
