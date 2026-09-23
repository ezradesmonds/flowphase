"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { extendedAlerts } from "@/lib/intelligence/extended/alerts";
import { GATED_ALERTS } from "@/lib/intelligence/extended/alerts";
import { Value, Evidence } from "./research-primitives";
export function ExtendedAlerts({
  alerts,
}: {
  alerts: ReturnType<typeof extendedAlerts>;
}) {
  const [filter, setFilter] = useState("");
  useEffect(() => {
    const saved =
      localStorage.getItem("flowphase.research.alert-filter.v1") ?? "";
    const frame = requestAnimationFrame(() => setFilter(saved));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <section className="panel research-module">
      <h2>Broker, Ownership & Sector Alerts</h2>
      <label>
        Alert filter
        <input
          aria-label="Alert keyword"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          {[...new Set(alerts.map((a) => a.type))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      {alerts
        .filter((a) => !filter || a.type.includes(filter.toUpperCase()))
        .slice(0, 100)
        .map((a) => (
          <details key={a.id}>
            <summary>
              {a.date} · {a.symbol} / {a.broker} · {a.type}
            </summary>
            <p>
              {a.explanation} · phase {a.phase}
            </p>
            <p>
              Actual <Value metric={a.actual} /> · baseline{" "}
              <Value metric={a.baseline} />
            </p>
            {a.type.startsWith("SECTOR_") ? (
              <Link href="/sectors">Sector Rotation</Link>
            ) : (
              <Link href={"/stocks/" + a.symbol}>Stock analysis</Link>
            )}
            {a.broker !== "—" && (
              <>
                {" "}
                · <Link href={"/brokers?code=" + a.broker}>Broker Stalker</Link>
              </>
            )}
            <Evidence value={a} />
          </details>
        ))}
      {!alerts.length && (
        <p>No supported anomalies in acquired broker baselines.</p>
      )}
      <details>
        <summary>Capability-gated alerts</summary>
        <p>{GATED_ALERTS.join(" · ")}</p>
        <p>
          Ownership/sector changes require comparable dated snapshots; no
          unverified historical release time is assumed.
        </p>
      </details>
    </section>
  );
}
