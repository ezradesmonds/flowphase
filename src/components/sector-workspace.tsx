"use client";
import { useState } from "react";
import Link from "next/link";
import type { marketActivity } from "@/lib/intelligence/extended/market";
import { display, Value, Evidence, SaveResearch } from "./research-primitives";
export function SectorWorkspace({
  data,
}: {
  data: ReturnType<typeof marketActivity>;
}) {
  const [axis, setAxis] = useState("STRENGTH_VOLUME"),
    [selected, setSelected] = useState("");
  const points = data.sectors
    .map((s) => ({
      s,
      x:
        axis === "STRENGTH_VOLUME"
          ? s.metrics.relativeStrength.value
          : s.metrics.institutionalFlow.value,
      y:
        axis === "STRENGTH_VOLUME"
          ? s.metrics.relativeVolume.value === null
            ? null
            : s.metrics.relativeVolume.value - 1
          : s.metrics.return.value,
    }))
    .filter((p) => p.x !== null && p.y !== null);
  const maxX = Math.max(1, ...points.map((p) => Math.abs(p.x!))),
    maxY = Math.max(0.01, ...points.map((p) => Math.abs(p.y!)));
  const sector = data.sectors.find((s) => s.sector === selected);
  return (
    <section className="panel research-module">
      <h2>Market Summary & Sector Rotation</h2>
      <p>
        Common session: {data.meta.period_end ?? "Unavailable"} · analysed
        subset coverage {display(data.coverage * 100)}% · as of{" "}
        {data.meta.as_of ?? "Unavailable"}
      </p>
      <div className="research-cards">
        {Object.entries(data.summary).map(([name, m]) => (
          <div key={name}>
            <small>{name}</small>
            <strong>
              <Value metric={m} />
            </strong>
          </div>
        ))}
      </div>
      <p>
        Sector metrics are equal-weight estimates over the acquired subset, not
        official sector indices. The current Jakarta session is excluded.
        Foreign-flow totals use aligned investor-origin observations; missing
        member data remains unavailable.
      </p>
      <label>
        Rotation axes
        <select value={axis} onChange={(e) => setAxis(e.target.value)}>
          <option value="STRENGTH_VOLUME">
            Relative strength / relative volume
          </option>
          <option value="FLOW_MOMENTUM">
            Institutional-proxy net value / price momentum
          </option>
        </select>
      </label>
      <svg
        viewBox="0 0 800 420"
        role="img"
        aria-label="Interactive sector rotation quadrant"
      >
        <line
          x1="400"
          y1="30"
          x2="400"
          y2="390"
          stroke="currentColor"
          opacity=".3"
        />
        <line
          x1="30"
          y1="210"
          x2="770"
          y2="210"
          stroke="currentColor"
          opacity=".3"
        />
        {[
          ["Improving", 40, 45],
          ["Leading", 650, 45],
          ["Lagging", 40, 390],
          ["Weakening", 650, 390],
        ].map(([label, x, y]) => (
          <text key={label} x={x} y={y} fill="currentColor" opacity=".5">
            {label}
          </text>
        ))}
        {points.map(({ s, x, y }) => (
          <g
            key={s.sector}
            tabIndex={0}
            role="button"
            aria-label={"Open " + s.sector}
            onClick={() => setSelected(s.sector)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSelected(s.sector);
            }}
          >
            <circle
              cx={400 + (x! / maxX) * 300}
              cy={210 - (y! / maxY) * 140}
              r="9"
              fill={selected === s.sector ? "#fb923c" : "#60a5fa"}
            />
            <text
              x={410 + (x! / maxX) * 300}
              y={205 - (y! / maxY) * 140}
              fill="currentColor"
              fontSize="11"
            >
              {s.sector}
            </text>
            <title>
              {s.sector + ": X " + display(x) + ", Y " + display(y)}
            </title>
          </g>
        ))}
      </svg>
      {!points.length && (
        <p className="empty-state">
          No aligned sector observations are available for these axes.
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Sector</th>
              <th>Return</th>
              <th>Relative volume</th>
              <th>Breadth</th>
              <th>Institutional proxy Rp</th>
              <th>Foreign Rp</th>
              <th>Phase distribution</th>
              <th>Transitions</th>
            </tr>
          </thead>
          <tbody>
            {data.sectors.map((s) => (
              <tr key={s.sector}>
                <td>
                  <button onClick={() => setSelected(s.sector)}>
                    {s.sector}
                  </button>
                </td>
                {(
                  [
                    "return",
                    "relativeVolume",
                    "breadth",
                    "institutionalFlow",
                    "foreignFlow",
                  ] as const
                ).map((k) => (
                  <td key={k}>
                    <Value metric={s.metrics[k]} />
                  </td>
                ))}
                <td>
                  {Object.entries(s.phaseCounts)
                    .map(([p, n]) => p + ": " + n)
                    .join(" · ")}
                </td>
                <td>
                  <Value metric={s.metrics.transitions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sector && (
        <section>
          <h3>{sector.sector}</h3>
          <SaveResearch
            type="SECTOR"
            id={sector.sector}
            label={sector.sector}
          />
          {[...sector.members]
            .sort((a, b) => b.return - a.return)
            .map((m) => (
              <p key={m.symbol}>
                <Link href={"/stocks/" + m.symbol}>{m.symbol}</Link> · {m.phase}{" "}
                · {display(m.return * 100)}% · relative volume{" "}
                {display(m.relativeVolume)}
              </p>
            ))}
        </section>
      )}
      <Evidence value={data.meta} />
    </section>
  );
}
