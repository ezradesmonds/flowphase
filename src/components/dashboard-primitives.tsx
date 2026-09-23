"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const PHASE_COLORS: Record<string, string> = {
  AKUMULASI: "#00E676",
  POMPOM: "#C084FC",
  MENGGORENG: "#FB923C",
  DISTRIBUSI: "#FF3355",
  TRANSITION: "#94A3B8",
  UNCERTAIN: "#64748B",
  INSUFFICIENT_DATA: "#475569",
  POST_DISTRIBUTION_MARKDOWN: "#991B1B",
};

export function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color,
  positive,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  positive?: boolean;
}) {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className="sparkline-svg opacity-30 font-mono">
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 1.5;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const isPos = positive ?? (data.at(-1)! >= data[0]);
  const strokeColor = color ?? (isPos ? "#00E676" : "#FF3355");
  const gradientId = `sg-${Math.random().toString(36).substring(2, 8)}`;
  const firstPoint = points[0].split(",");
  const lastPoint = points[points.length - 1].split(",");
  const areaPath = `M ${points.join(" L ")} L ${lastPoint[0]},${height} L ${firstPoint[0]},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className="sparkline-svg overflow-visible font-mono"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="square"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  );
}

export function ConfidenceRing({
  value,
  size = 32,
  strokeWidth = 3,
  color,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  const ringColor =
    color ??
    (clamped >= 75
      ? "#00E676"
      : clamped >= 50
        ? "#00E5FF"
        : clamped >= 30
          ? "#FF9F0A"
          : "#FF3355");

  return (
    <div
      className="relative inline-flex items-center justify-center font-mono"
      style={{ width: size, height: size }}
      title={`Phase Confidence: ${clamped}%`}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#172332"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="square"
        />
      </svg>
      <span
        className="absolute font-bold text-white tabular-nums text-[10px]"
      >
        {clamped}
      </span>
    </div>
  );
}

export interface PhaseSlice {
  phase: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export function PhaseDonutChart({
  slices,
  total,
  onSelectPhase,
  selectedPhase,
}: {
  slices: PhaseSlice[];
  total: number;
  onSelectPhase?: (phase: string) => void;
  selectedPhase?: string | null;
}) {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const size = 170;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const validTotal = total > 0 ? total : 1;

  const activeSlice =
    slices.find((s) => s.phase === (hoveredPhase ?? selectedPhase)) ?? null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-5 p-1 font-mono">
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-label="Market Phase Distribution"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#101824"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice) => {
            const fraction = slice.count / validTotal;
            const strokeDasharray = `${(fraction * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
            const strokeDashoffset = (-currentOffset * circumference).toFixed(2);
            currentOffset += fraction;

            const isHovered = hoveredPhase === slice.phase;
            const isSelected = selectedPhase === slice.phase;

            return (
              <circle
                key={slice.phase}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered || isSelected ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="cursor-pointer transition-all duration-150"
                style={{
                  opacity:
                    hoveredPhase && !isHovered && !isSelected ? 0.35 : 1,
                }}
                onMouseEnter={() => setHoveredPhase(slice.phase)}
                onMouseLeave={() => setHoveredPhase(null)}
                onClick={() => onSelectPhase?.(slice.phase)}
              />
            );
          })}
        </svg>

        {/* Center telemetry readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          {activeSlice ? (
            <>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                {activeSlice.label}
              </span>
              <span className="text-xl font-bold text-white tabular-nums">
                {activeSlice.count}
              </span>
              <span className="text-[10px] font-bold" style={{ color: activeSlice.color }}>
                {activeSlice.percentage.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                UNIVERSE
              </span>
              <span className="text-2xl font-bold text-white tabular-nums">
                {total}
              </span>
              <span className="text-[9px] text-amber uppercase font-semibold">TICKERS</span>
            </>
          )}
        </div>
      </div>

      {/* Terminal data rows */}
      <div className="flex flex-col gap-1 w-full max-w-[210px]">
        {slices.map((slice) => {
          const isSelected = selectedPhase === slice.phase;
          const isHovered = hoveredPhase === slice.phase;
          return (
            <button
              key={slice.phase}
              type="button"
              onClick={() => onSelectPhase?.(slice.phase)}
              onMouseEnter={() => setHoveredPhase(slice.phase)}
              onMouseLeave={() => setHoveredPhase(null)}
              className={`flex items-center justify-between text-left text-[11px] px-2 py-1 rounded-xs border transition-all ${
                isSelected
                  ? "bg-slate-900 border-amber text-white"
                  : isHovered
                    ? "bg-slate-900 border-slate-700 text-slate-200"
                    : "border-slate-900 bg-slate-950/60 hover:bg-slate-900/60 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="font-semibold text-slate-300 truncate">{slice.label}</span>
              </div>
              <div className="flex items-center gap-1 ml-2 tabular-nums">
                <span className="font-bold text-white">{slice.count}</span>
                <span className="text-slate-500 text-[9.5px]">
                  ({slice.percentage.toFixed(0)}%)
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BreadthBar({
  advancers = 0,
  unchanged = 0,
  decliners = 0,
}: {
  advancers: number;
  unchanged: number;
  decliners: number;
}) {
  const total = advancers + unchanged + decliners || 1;
  const advPct = ((advancers / total) * 100).toFixed(0);
  const uncPct = ((unchanged / total) * 100).toFixed(0);
  const decPct = ((decliners / total) * 100).toFixed(0);

  return (
    <div className="w-full font-mono">
      <div className="flex items-center justify-between text-[10px] mb-1 font-semibold tabular-nums uppercase">
        <span className="text-green flex items-center gap-1">
          <TrendingUp size={11} /> ADV: {advancers} ({advPct}%)
        </span>
        <span className="text-slate-400 flex items-center gap-1">
          <Minus size={11} /> UNCH: {unchanged} ({uncPct}%)
        </span>
        <span className="text-red flex items-center gap-1">
          <TrendingDown size={11} /> DEC: {decliners} ({decPct}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-xs overflow-hidden flex bg-slate-950 p-0.5 gap-0.5 border border-slate-800">
        {advancers > 0 && (
          <div
            className="h-full bg-emerald-500 rounded-xs transition-all duration-200"
            style={{ width: `${(advancers / total) * 100}%` }}
            title={`Advancing: ${advancers} tickers`}
          />
        )}
        {unchanged > 0 && (
          <div
            className="h-full bg-slate-600 rounded-xs transition-all duration-200"
            style={{ width: `${(unchanged / total) * 100}%` }}
            title={`Unchanged: ${unchanged} tickers`}
          />
        )}
        {decliners > 0 && (
          <div
            className="h-full bg-rose-500 rounded-xs transition-all duration-200"
            style={{ width: `${(decliners / total) * 100}%` }}
            title={`Declining: ${decliners} tickers`}
          />
        )}
      </div>
    </div>
  );
}

export interface SectorItem {
  name: string;
  count: number;
  dominantPhase?: string;
  change?: number | null;
  activity: "high" | "medium" | "low";
}

export function SectorHeatmap({
  sectors,
  onSelectSector,
}: {
  sectors: SectorItem[];
  onSelectSector?: (sector: string) => void;
  }) {
  if (!sectors.length) {
    return (
      <div className="py-6 text-center text-xs text-slate-500 font-mono">
        NO SECTOR HEATMAP DATA AVAILABLE.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono">
      {sectors.map((s) => {
        const phaseColor = s.dominantPhase ? PHASE_COLORS[s.dominantPhase] : "#64748B";
        const hasChange = s.change !== null && s.change !== undefined;
        const isPos = hasChange && s.change! > 0;
        const isNeg = hasChange && s.change! < 0;

        return (
          <button
            key={s.name}
            type="button"
            onClick={() => onSelectSector?.(s.name)}
            className="group flex flex-col p-2 rounded-xs border border-slate-800 bg-slate-950/70 hover:bg-slate-900 hover:border-slate-700 transition-all text-left relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 bottom-0 w-1"
              style={{ backgroundColor: phaseColor }}
            />
            <div className="flex items-start justify-between w-full mb-1 pl-1.5">
              <span className="font-bold text-[11px] text-slate-200 truncate group-hover:text-amber transition-colors">
                {s.name}
              </span>
              {hasChange && (
                <span
                  className={`text-[10.5px] font-bold tabular-nums ${
                    isPos ? "text-green" : isNeg ? "text-red" : "text-slate-400"
                  }`}
                >
                  {isPos ? "+" : ""}
                  {(s.change! * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[9.5px] text-slate-400 pl-1.5 mt-0.5">
              <span>{s.count} TICKERS</span>
              {s.dominantPhase && (
                <span
                  className="px-1 py-0.2 rounded-xs font-semibold"
                  style={{
                    backgroundColor: `${phaseColor}20`,
                    color: phaseColor,
                  }}
                >
                  {s.dominantPhase}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function SectorQuadrantChart({
  sectors,
  onSelectSector,
}: {
  sectors: { name: string; x: number; y: number; phase?: string }[];
  onSelectSector?: (sector: string) => void;
}) {
  return (
    <div className="relative w-full aspect-[16/9] min-h-[200px] max-h-[260px] bg-slate-950 rounded-xs border border-slate-800 p-3 flex flex-col justify-between overflow-hidden font-mono">
      {/* Background quadrant lines & labels */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
        <div className="border-r border-b border-slate-800/60 p-2 flex items-start justify-start">
          <span className="text-[9px] uppercase font-bold tracking-wider text-purple-400/80 bg-purple-950/40 border border-purple-900/50 px-1.5 py-0.5 rounded-xs">
            [IMPROVING]
          </span>
        </div>
        <div className="border-b border-slate-800/60 p-2 flex items-start justify-end">
          <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400/80 bg-emerald-950/40 border border-emerald-900/50 px-1.5 py-0.5 rounded-xs">
            [LEADING]
          </span>
        </div>
        <div className="border-r border-slate-800/60 p-2 flex items-end justify-start">
          <span className="text-[9px] uppercase font-bold tracking-wider text-rose-400/80 bg-rose-950/40 border border-rose-900/50 px-1.5 py-0.5 rounded-xs">
            [LAGGING]
          </span>
        </div>
        <div className="p-2 flex items-end justify-end">
          <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400/80 bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5 rounded-xs">
            [WEAKENING]
          </span>
        </div>
      </div>

      {/* Axis crosshair */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800 pointer-events-none" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800 pointer-events-none" />

      {/* Sector Nodes */}
      <div className="relative z-10 w-full h-full">
        {!sectors.length ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            NO SECTOR ROTATION DATA.
          </div>
        ) : (
          sectors.map((s) => {
            const left = 50 + s.x * 38;
            const top = 50 - s.y * 38;
            const color = s.phase ? PHASE_COLORS[s.phase] ?? "#00E5FF" : "#00E5FF";

            return (
              <button
                key={s.name}
                type="button"
                onClick={() => onSelectSector?.(s.name)}
                className="group absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 focus:outline-none"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs border border-slate-950 shadow-xs"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] font-bold text-slate-300 bg-slate-900/90 border border-slate-800 px-1.5 py-0.2 rounded-xs group-hover:text-amber group-hover:border-slate-600 transition-colors whitespace-nowrap">
                  {s.name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function DetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-mono">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-lg bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900">
          <div>
            <h2 id="drawer-title" className="text-xs font-bold text-white uppercase tracking-wide">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close panel"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function MetricTooltip({
  label,
  value,
  explanation,
  icon = true,
}: {
  label: string;
  value?: React.ReactNode;
  explanation: string;
  icon?: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex items-center gap-1 cursor-help font-mono"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-slate-400 text-[10px] font-medium">{label}</span>
      {value && <span className="text-white text-[10px] font-bold">{value}</span>}
      {icon && <Info size={11} className="text-slate-500 hover:text-amber transition-colors" />}

      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 p-2 rounded-xs bg-slate-950 border border-slate-700 shadow-2xl text-[10px] text-slate-300 z-40 pointer-events-none leading-relaxed text-center">
          {explanation}
        </div>
      )}
    </div>
  );
}
