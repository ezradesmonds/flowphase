import Link from "next/link";
import {
  ArrowUpRight,
  FlaskConical,
  SearchX,
  CircleAlert,
  Terminal,
} from "lucide-react";
import type { MarketPhase } from "@/domain/market";
import { phaseLabel } from "@/lib/format";

export function PhaseBadge({ phase }: { phase: MarketPhase }) {
  return (
    <span className={`phase-badge phase-${phase.toLowerCase()}`}>
      <span className="phase-dot" />
      {phaseLabel(phase)}
    </span>
  );
}

export function DemoNotice() {
  return (
    <div className="demo-notice" role="status">
      <FlaskConical size={13} strokeWidth={2} />
      <strong>[DEMO ENVIRONMENT]</strong>
      <span>SYNTHETIC DETERMINISTIC FIXTURES · MARKET CANDLES LABELED SEPARATELY</span>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {eyebrow ?? "FLOWPHASE // MARKET INTELLIGENCE"}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  note,
  children,
  className = "",
  action,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div className="flex items-center gap-2">
          <h2>{title}</h2>
          {note && <span className="panel-note text-slate-500">// {note}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Confidence({ value }: { value: number }) {
  const isHigh = value >= 75;
  const isMed = value >= 45;
  return (
    <div className="confidence font-mono">
      <span className={isHigh ? "text-green" : isMed ? "text-cyan" : "text-amber"}>
        {value}
        <small className="text-slate-500 font-normal">/100</small>
      </span>
      <div className={`meter ${value < 40 ? "danger" : ""}`}>
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  title = "NO MATCHING SECURITIES",
  description = "Adjust filters or query parameters to expand scan universe.",
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state p-8 text-center flex flex-col items-center justify-center font-mono">
      <SearchX size={24} className="text-slate-600 mb-2" />
      <h2 className="text-xs font-bold text-slate-300 uppercase">{title}</h2>
      <p className="text-[11px] text-slate-500 mt-1 max-w-md">{description}</p>
      {children}
    </div>
  );
}

export function ErrorState({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state p-8 text-center flex flex-col items-center justify-center font-mono" role="alert">
      <CircleAlert size={24} className="text-rose-500 mb-2" />
      <h2 className="text-xs font-bold text-white uppercase">DATA PROVIDER DISCONNECTED</h2>
      <p className="text-[11px] text-slate-400 mt-1 max-w-md">
        Remote data provider response failed. Local watchlist cache is retained.
      </p>
      <button className="button primary mt-3" onClick={reset}>
        RETRY CONNECTION [↵]
      </button>
    </div>
  );
}

export function Skeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading research view"
      className="panel skeleton-panel p-4 space-y-2"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton h-6 bg-slate-900 border border-slate-800 rounded-xs" />
      ))}
    </div>
  );
}

export function DetailLink({ ticker }: { ticker: string }) {
  return (
    <Link
      className="button py-0.5 px-1.5 text-[10px] text-cyan hover:text-white"
      href={`/stocks/${ticker}`}
      aria-label={`Analyze ${ticker}`}
    >
      ANALYZE <ArrowUpRight size={11} />
    </Link>
  );
}
