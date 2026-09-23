"use client";
import { useEffect, useState } from "react";
import { metric, type Meta } from "@/lib/intelligence/extended/model";
import { Value, Evidence } from "./research-primitives";
interface Data {
  rows: {
    date: string;
    foreign_buy_idr?: number | null;
    foreign_sell_idr?: number | null;
    net_foreign_inflow?: number | null;
  }[];
  source: string;
  fetchedAt: string;
  qualityFlags: string[];
}
export function ForeignFlowPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    fetch("/api/stocks/" + symbol + "/foreign-flow")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((r) => {
        if (active) {
          setData(r.data);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [symbol, retry]);
  return (
    <section className="panel research-module">
      <h2>Foreign Investor Flow</h2>
      <p>
        Investor-origin series from Sectors, independent of broker affiliation.
        No foreign flow is inferred from a broker code.
      </p>
      {error ? (
        <>
          <p>Foreign flow unavailable.</p>
          <button
            onClick={() => {
              setError(false);
              setRetry(retry + 1);
            }}
          >
            Retry
          </button>
        </>
      ) : !data ? (
        <p aria-busy="true">Loading foreign flow…</p>
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Foreign buy Rp</th>
                  <th>Foreign sell Rp</th>
                  <th>Net foreign Rp</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const meta: Meta = {
                    source: [data.source],
                    as_of: data.fetchedAt,
                    period_start: r.date,
                    period_end: r.date,
                    calculation_method: "reported investor-origin daily flow",
                    data_status: "OBSERVED",
                    confidence: 70,
                    quality_flags: data.qualityFlags,
                  };
                  return (
                    <tr key={r.date}>
                      <td>{r.date}</td>
                      {(
                        [
                          "foreign_buy_idr",
                          "foreign_sell_idr",
                          "net_foreign_inflow",
                        ] as const
                      ).map((k) => (
                        <td key={k}>
                          <Value metric={metric(r[k], meta, k, "OBSERVED")} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Evidence
            value={{
              source: data.source,
              as_of: data.fetchedAt,
              quality_flags: data.qualityFlags,
            }}
          />
        </>
      )}
    </section>
  );
}
