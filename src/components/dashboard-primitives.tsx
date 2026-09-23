"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const PHASE_COLORS: Record<string, string> = {
  AKUMULASI: "#3B82F6",
  POMPOM: "#8B5CF6",
  MENGGORENG: "#F59E0B",
  DISTRIBUSI: "#EF4444",
  TRANSITION: "#94A3B8",
  UNCERTAIN: "#64748B",
  INSUFFICIENT_DATA: "#475569",
  POST_DISTRIBUTION_MARKDOWN: "#991B1B",
};

export function MiniSparkline({
  data,
  width = 90,
  height = 28,
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
      <svg width={width} height={height} className="sparkline-svg opacity-30">
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="2 2"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const strokeColor =
    color ??
    (positive === true
      ? "#10B981"
      : positive === false
        ? "#EF4444"
        : data.at(-1)! >= data[0]
          ? "#10B981"
          : "#EF4444");

  const gradientId = `sg-${Math.random().toString(36).substring(2, 8)}`;
  const firstPoint = points[0].split(",");
  const lastPoint = points[points.length - 1].split(",");
  const areaPath = `M ${points.join(" L ")} L ${lastPoint[0]},${height} L ${firstPoint[0]},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className="sparkline-svg overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  );
}

export function ConfidenceRing({
  value,
  size = 38,
  strokeWidth = 3.5,
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
      ? "#10B981"
      : clamped >= 50
        ? "#3B82F6"
        : clamped >= 30
          ? "#F59E0B"
          : "#EF4444");

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      title={`Confidence: ${clamped}%`}
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
          stroke="rgba(255,255,255,0.08)"
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
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span
        className="absolute font-semibold tracking-tight text-white tabular-nums"
        style={{ fontSize: size <= 40 ? 11 : 13 }}
      >
        {clamped}
        <span className="text-[9px] opacity-70">%</span>
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
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const validTotal = total > 0 ? total : 1;

  const activeSlice =
    slices.find((s) => s.phase === (hoveredPhase ?? selectedPhase)) ?? null;

  return (
    <div className="flex flex-col items-center justify-center sm:flex-row gap-6 p-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-label="Distribusi Fase Pasar"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
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
                strokeWidth={isHovered || isSelected ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="cursor-pointer transition-all duration-200"
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

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          {activeSlice ? (
            <>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                {activeSlice.label}
              </span>
              <span className="text-2xl font-bold text-white tabular-nums">
                {activeSlice.count}
              </span>
              <span className="text-[11px] font-medium" style={{ color: activeSlice.color }}>
                {activeSlice.percentage.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                Total Dianalisis
              </span>
              <span className="text-3xl font-bold text-white tabular-nums">
                {total}
              </span>
              <span className="text-[11px] text-slate-400">saham IDX</span>
            </>
          )}
        </div>
      </div>

      {/* Mini legend */}
      <div className="flex flex-col gap-2 min-w-[150px]">
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
              className={`flex items-center justify-between text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                isSelected
                  ? "bg-slate-800/90 border-blue-500/50 shadow-sm"
                  : isHovered
                    ? "bg-slate-800/50 border-slate-700"
                    : "border-transparent hover:bg-slate-800/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-slate-300 font-medium">{slice.label}</span>
              </div>
              <div className="flex items-center gap-1.5 ml-2 tabular-nums">
                <span className="font-semibold text-white">{slice.count}</span>
                <span className="text-slate-500 text-[10px]">
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
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1.5 font-medium tabular-nums">
        <span className="text-emerald-400 flex items-center gap-1">
          <TrendingUp size={13} /> Naik: {advancers} ({advPct}%)
        </span>
        <span className="text-slate-400 flex items-center gap-1">
          <Minus size={13} /> Tetap: {unchanged} ({uncPct}%)
        </span>
        <span className="text-rose-400 flex items-center gap-1">
          <TrendingDown size={13} /> Turun: {decliners} ({decPct}%)
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-800/80 p-0.5 gap-0.5">
        {advancers > 0 && (
          <div
            className="h-full bg-emerald-500 rounded-sm transition-all duration-300"
            style={{ width: `${(advancers / total) * 100}%` }}
            title={`Naik: ${advancers} saham`}
          />
        )}
        {unchanged > 0 && (
          <div
            className="h-full bg-slate-500 rounded-sm transition-all duration-300"
            style={{ width: `${(unchanged / total) * 100}%` }}
            title={`Tidak Berubah: ${unchanged} saham`}
          />
        )}
        {decliners > 0 && (
          <div
            className="h-full bg-rose-500 rounded-sm transition-all duration-300"
            style={{ width: `${(decliners / total) * 100}%` }}
            title={`Turun: ${decliners} saham`}
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
      <div className="py-8 text-center text-xs text-slate-500">
        Data sektor belum tersedia pada sampel analisa saat ini.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
            className="group flex flex-col p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 transition-all text-left relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 bottom-0 w-1 opacity-75 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: phaseColor }}
            />
            <div className="flex items-start justify-between w-full mb-1 pl-1">
              <span className="font-semibold text-xs text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                {s.name}
              </span>
              {hasChange && (
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    isPos ? "text-emerald-400" : isNeg ? "text-rose-400" : "text-slate-400"
                  }`}
                >
                  {isPos ? "+" : ""}
                  {(s.change! * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pl-1 mt-1">
              <span>{s.count} emiten</span>
              {s.dominantPhase && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
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
    <div className="relative w-full aspect-[16/10] min-h-[220px] max-h-[300px] bg-slate-950/60 rounded-xl border border-slate-800 p-4 flex flex-col justify-between overflow-hidden">
      {/* Background quadrant lines & labels */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
        <div className="border-r border-b border-slate-800/80 p-2.5 flex items-start justify-start">
          <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400/60 bg-purple-500/10 px-2 py-0.5 rounded">
            Improving (Membaik)
          </span>
        </div>
        <div className="border-b border-slate-800/80 p-2.5 flex items-start justify-end">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded">
            Leading (Memimpin)
          </span>
        </div>
        <div className="border-r border-slate-800/80 p-2.5 flex items-end justify-start">
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400/60 bg-rose-500/10 px-2 py-0.5 rounded">
            Lagging (Tertinggal)
          </span>
        </div>
        <div className="p-2.5 flex items-end justify-end">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/60 bg-amber-500/10 px-2 py-0.5 rounded">
            Weakening (Melemah)
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
            Data rotasi sektor belum tersedia pada sampel analisa saat ini.
          </div>
        ) : (
          sectors.map((s) => {
            // Normalize x (-1 to 1) to percentage 10% to 90%
            const left = 50 + s.x * 38;
            // Normalize y (-1 to 1) to percentage: y=1 is top (15%), y=-1 is bottom (85%)
            const top = 50 - s.y * 38;
            const color = s.phase ? PHASE_COLORS[s.phase] ?? "#38BDF8" : "#38BDF8";

            return (
              <button
                key={s.name}
                type="button"
                onClick={() => onSelectSector?.(s.name)}
                className="group absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 focus:outline-none"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-md transition-transform group-hover:scale-125"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] font-semibold text-slate-300 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded shadow-sm group-hover:text-white group-hover:border-slate-600 transition-colors whitespace-nowrap">
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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="relative z-10 w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-250"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-800/80 bg-slate-950/40">
          <div>
            <h2 id="drawer-title" className="text-lg font-bold text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Tutup panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
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
      className="relative inline-flex items-center gap-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-slate-400 text-xs font-medium">{label}</span>
      {value && <span className="text-white text-xs font-semibold">{value}</span>}
      {icon && <Info size={12} className="text-slate-500 hover:text-slate-300 transition-colors" />}

      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 rounded-lg bg-slate-950 border border-slate-700 shadow-xl text-[11px] text-slate-200 z-30 pointer-events-none leading-relaxed text-center">
          {explanation}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  );
}
