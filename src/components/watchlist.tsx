"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { ScannerResult } from "@/domain/market";
import { parseWatchlist, WATCHLIST_KEY } from "@/lib/watchlist";
import {
  DemoNotice,
  EmptyState,
  PageHeading,
  PhaseBadge,
  Skeleton,
} from "./ui";
export function Watchlist({ rows }: { rows: ScannerResult[] }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [ticker, setTicker] = useState(rows[0].ticker);
  useEffect(() => {
    // Deferred initialization keeps server and first client render identical.
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
          "Saved watchlist could not be read. You can start a new list in this tab.",
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
          setMessage("A saved watchlist change could not be read.");
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
      setMessage("Watchlist saved on this device.");
    } catch {
      setMessage(
        "Browser storage is unavailable. Changes are kept in this tab only.",
      );
    }
  }
  return (
    <>
      <PageHeading
        title="Your research shortlist."
        eyebrow="WORKSPACE / WATCHLIST"
        description="Save demo stocks locally and return to their evidence. No account required."
      />
      <DemoNotice />
      {!ready ? (
        <Skeleton />
      ) : (
        <>
          <div className="watchlist-add">
            <label className="field">
              <span>Add a demo stock</span>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
              >
                {rows.map((r) => (
                  <option key={r.ticker} value={r.ticker}>
                    {r.ticker} · {r.companyName}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button primary"
              disabled={saved.includes(ticker)}
              onClick={() => save([...saved, ticker])}
            >
              <Plus size={15} />
              {saved.includes(ticker) ? "Already added" : "Add to watchlist"}
            </button>
          </div>
          <p className="storage-status" role="status">
            {message ||
              "Stored in this browser only. Clearing browser data removes your watchlist."}
          </p>
          <div className="panel">
            {saved.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Stock</th>
                      <th>Company</th>
                      <th>Demo phase</th>
                      <th>Confidence</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saved.map((t) => {
                      const r = rows.find((r) => r.ticker === t)!;
                      return (
                        <tr key={t}>
                          <td>
                            <Link className="stock-name" href={`/stocks/${t}`}>
                              {t}
                            </Link>
                          </td>
                          <td>{r.companyName}</td>
                          <td>
                            <PhaseBadge phase={r.currentPhase} />
                          </td>
                          <td>{r.confidence}/100</td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`Remove ${t} from watchlist`}
                              onClick={() => save(saved.filter((s) => s !== t))}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Make room for a closer look"
                description="Add your first demo ticker using the selector above."
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
