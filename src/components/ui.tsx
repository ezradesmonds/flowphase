import Link from "next/link";
import {
  ArrowUpRight,
  FlaskConical,
  SearchX,
  CircleAlert,
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
    <div className="demo-notice">
      <FlaskConical size={15} strokeWidth={1.8} />
      <strong>DEMO DATA — NOT LIVE MARKET DATA</strong>
      <span>Synthetic analysis. Market candles are labeled separately.</span>
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
          {eyebrow ?? "FLOWPHASE / RESEARCH WORKSPACE"}
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
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Confidence({ value }: { value: number }) {
  return (
    <div className="confidence">
      <span>
        {value}
        <small>/100</small>
      </span>
      <div className="meter">
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  title = "No matching stocks",
  description = "Try another ticker or loosen your filters.",
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <SearchX size={30} strokeWidth={1.5} />
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}

export function ErrorState({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <CircleAlert size={30} strokeWidth={1.5} />
      <h2>This view could not be loaded</h2>
      <p>
        Provider data is unavailable. Your local watchlist is unaffected. Try
        loading the view again.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

export function Skeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading research view"
      className="panel skeleton-panel"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

export function DetailLink({ ticker }: { ticker: string }) {
  return (
    <Link
      className="icon-link"
      href={`/stocks/${ticker}`}
      aria-label={`Analyze ${ticker}`}
    >
      <ArrowUpRight size={16} strokeWidth={2} />
    </Link>
  );
}
