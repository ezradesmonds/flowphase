import { compact } from "@/lib/format";
export function FlowChart({ values }: { values: number[] }) {
  const min = Math.min(0, ...values),
    max = Math.max(1, ...values),
    span = max - min;
  const y = (v: number) => 125 - ((v - min) / span) * 105;
  const points = values
    .map((v, i) => `${45 + (i / Math.max(1, values.length - 1)) * 550},${y(v)}`)
    .join(" ");
  return (
    <div className="flow-chart">
      <svg
        viewBox="0 0 620 150"
        role="img"
        aria-label={`Demo cohort cumulative flow from ${compact(values[0] ?? 0)} to ${compact(values.at(-1) ?? 0)} lots`}
      >
        <line
          x1="45"
          x2="600"
          y1={y(0)}
          y2={y(0)}
          stroke="#334057"
          strokeDasharray="4 4"
        />
        <text x="0" y="25">
          {compact(max)}
        </text>
        <text x="0" y="125">
          {compact(min)}
        </text>
        <polyline
          points={points}
          fill="none"
          stroke="#83a9ff"
          strokeWidth="2"
        />
        <text x="45" y="148">
          Period start
        </text>
        <text x="537" y="148">
          Period end
        </text>
      </svg>
    </div>
  );
}
