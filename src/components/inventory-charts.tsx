"use client";
import type { PhaseInventoryRow } from "@/lib/intelligence/extended/inventory";
import { display } from "./research-primitives";
const colors = ["#60a5fa", "#c084fc", "#fb923c", "#f87171", "#34d399"];
export function InventoryPhaseCharts({
  rows,
  brokers,
}: {
  rows: PhaseInventoryRow[];
  brokers: string[];
}) {
  const phases = [
    ...new Map(
      rows
        .filter(
          (r) =>
            r.phase !== "CUSTOM" &&
            r.phase !== "CYCLE" &&
            r.metrics.netLot.value !== null,
        )
        .map((r) => [
          r.segmentId,
          { id: r.segmentId, label: r.phase, start: r.periodStart },
        ]),
    ).values(),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const max = Math.max(
      1,
      ...phases.map((p) =>
        rows
          .filter(
            (r) => r.segmentId === p.id && brokers.includes(r.broker.code),
          )
          .reduce((s, r) => s + Math.abs(r.metrics.netLot.value ?? 0), 0),
      ),
    ),
    width = 700 / Math.max(1, phases.length);
  const first = brokers[0],
    waterfall = phases
      .map((p) =>
        rows.find((r) => r.segmentId === p.id && r.broker.code === first),
      )
      .filter((r): r is PhaseInventoryRow => !!r),
    peak = Math.max(
      1,
      ...waterfall.flatMap((r) => [
        Math.abs(r.metrics.observedOpening.value ?? 0),
        Math.abs(r.metrics.observedClosing.value ?? 0),
      ]),
    );
  return (
    <div className="research-chart-grid">
      <div>
        <h3>Stacked phase net changes · selected brokers</h3>
        <svg
          viewBox="0 0 740 300"
          role="img"
          aria-label="Stacked signed broker net lot changes by phase"
        >
          <line x1="20" y1="140" x2="720" y2="140" stroke="currentColor" />
          {phases.map((p, i) => {
            let pos = 0,
              neg = 0;
            return (
              <g key={p.id}>
                {brokers.map((code, j) => {
                  const value = rows.find(
                    (r) => r.segmentId === p.id && r.broker.code === code,
                  )?.metrics.netLot.value;
                  if (value == null) return null;
                  const h = (Math.abs(value) / max) * 110,
                    y = value >= 0 ? 140 - pos - h : 140 + neg;
                  if (value >= 0) pos += h;
                  else neg += h;
                  return (
                    <rect
                      key={code}
                      x={20 + i * width}
                      y={y}
                      width={Math.max(1, width - 4)}
                      height={h}
                      fill={colors[j]}
                    >
                      <title>
                        {p.label +
                          " " +
                          p.start +
                          " · " +
                          code +
                          ": " +
                          display(value) +
                          " lots"}
                      </title>
                    </rect>
                  );
                })}
                <text
                  x={20 + i * width}
                  y="280"
                  fill="currentColor"
                  fontSize="8"
                  transform={"rotate(-35 " + (20 + i * width) + " 280)"}
                >
                  {p.start}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div>
        <h3>Inventory waterfall · {first ?? "select broker"}</h3>
        <svg
          viewBox="0 0 740 300"
          role="img"
          aria-label="Observed opening to closing net inventory waterfall"
        >
          <line x1="20" y1="140" x2="720" y2="140" stroke="currentColor" />
          {waterfall.map((r, i) => {
            const a =
                140 - ((r.metrics.observedOpening.value ?? 0) / peak) * 110,
              b = 140 - ((r.metrics.observedClosing.value ?? 0) / peak) * 110,
              w = 700 / Math.max(1, waterfall.length);
            return (
              <g key={r.segmentId}>
                <rect
                  x={20 + i * w}
                  y={Math.min(a, b)}
                  width={Math.max(1, w - 4)}
                  height={Math.max(1, Math.abs(a - b))}
                  fill={
                    (r.metrics.netLot.value ?? 0) >= 0 ? "#60a5fa" : "#f87171"
                  }
                />
                <line
                  x1={20 + i * w}
                  y1={b}
                  x2={20 + (i + 1) * w}
                  y2={b}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                />
                <title>
                  {r.phase +
                    " " +
                    r.periodStart +
                    ": " +
                    display(r.metrics.observedOpening.value) +
                    " → " +
                    display(r.metrics.observedClosing.value) +
                    "; not holdings"}
                </title>
              </g>
            );
          })}
        </svg>
        <p>
          Floating bars join observed opening and closing net balances.
          Pre-period holdings remain Unknown.
        </p>
      </div>
    </div>
  );
}
