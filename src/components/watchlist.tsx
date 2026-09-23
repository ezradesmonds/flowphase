"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Star, ArrowUpRight } from "lucide-react";
import type { ScannerResult } from "@/domain/market";
import { parseWatchlist, WATCHLIST_KEY } from "@/lib/watchlist";
import {
  DemoNotice,
  EmptyState,
  PageHeading,
  PhaseBadge,
  Skeleton,
  Panel,
} from "./ui";

export function Watchlist({ rows }: { rows: ScannerResult[] }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [ticker, setTicker] = useState(rows[0]?.ticker ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setSaved(
          parseWatchlist(
            localStorage.getItem(WATCHLIST_KEY),
            rows.map((r) => r.ticker),
          ),
        );
      } catch {
        setMessage(
          "LOCAL WATCHLIST STORAGE INITIALIZED.",
        );
      }
      setReady(true);
    }, 0);

    function sync(event: StorageEvent) {
      if (event.key === WATCHLIST_KEY) {
        try {
          setSaved(
            parseWatchlist(
              event.newValue,
              rows.map((r) => r.ticker),
            ),
          );
        } catch {
          setMessage("WATCHLIST STORAGE SYNC ERROR.");
        }
      }
    }
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", sync);
    };
  }, [rows]);

  function save(next: string[]) {
    setSaved(next);
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      setMessage("WATCHLIST COMMITTED TO LOCAL STORAGE.");
    } catch {
      setMessage(
        "BROWSER STORAGE UNAVAILABLE. PERSISTED IN TAB SESSION.",
      );
    }
  }

  return (
    <div className="space-y-2 font-mono">
      <PageHeading
        eyebrow="FLOWPHASE // PORTFOLIO MONITOR"
        title="SAVED SECURITIES WATCHLIST"
        description="Persisted local watchlist for high-priority cycle tracking and institutional flow alerts."
      />
      <DemoNotice />

      {!ready ? (
        <Skeleton />
      ) : (
        <>
          <Panel title="[SEC.01 // ADD_SECURITY_TO_WATCHLIST]">
            <div className="filter-toolbar" style={{ margin: 0, border: "none" }}>
              <div className="filter-group">
                <span className="filter-label">SELECT SECURITY:</span>
                <select
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="text-xs"
                >
                  {rows.map((r) => (
                    <option key={r.ticker} value={r.ticker}>
                      {r.ticker} · {r.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="terminal-btn primary"
                disabled={saved.includes(ticker)}
                onClick={() => save([...saved, ticker])}
              >
                <Plus size={12} />
                {saved.includes(ticker) ? "ALREADY PINNED" : "PIN TO WATCHLIST [↵]"}
              </button>

              <span className="text-[10px] text-amber ml-auto" role="status">
                {message || `${saved.length} SECURITIES MONITORED`}
              </span>
            </div>
          </Panel>

          <div className="panel table-scroll">
            <div className="panel-heading">
              <div className="panel-title">
                <Star size={12} className="text-amber" />
                <span>[SEC.02 // ACTIVE_WATCHLIST_GRID]</span>
              </div>
              <span className="panel-tag">{saved.length} PINNED</span>
            </div>

            {saved.length ? (
              <table>
                <thead>
                  <tr>
                    <th>TICKER</th>
                    <th>COMPANY</th>
                    <th>CYCLE PHASE</th>
                    <th>CONFIDENCE</th>
                    <th className="text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map((t) => {
                    const r = rows.find((r) => r.ticker === t);
                    if (!r) return null;
                    return (
                      <tr key={t}>
                        <td className="ticker-cell">
                          <Link className="text-cyan hover:text-amber font-bold" href={`/stocks/${t}`}>
                            {t}
                          </Link>
                        </td>
                        <td className="text-slate-300">{r.companyName}</td>
                        <td>
                          <PhaseBadge phase={r.currentPhase} />
                        </td>
                        <td className="font-bold text-amber tabular-nums">{r.confidence}/100</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/stocks/${t}`}
                              className="terminal-btn text-[9px] py-0.2 px-1 text-cyan"
                            >
                              ANALYSIS <ArrowUpRight size={10} />
                            </Link>
                            <button
                              className="terminal-btn text-[9px] py-0.2 px-1 text-red hover:bg-red-950"
                              aria-label={`Remove ${t} from watchlist`}
                              onClick={() => save(saved.filter((s) => s !== t))}
                              title="Unpin security"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="WATCHLIST IS CURRENTLY EMPTY"
                description="Use the selector above or browse the scanner to pin target securities."
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
