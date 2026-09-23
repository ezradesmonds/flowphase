"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, CornerDownLeft, ArrowRight } from "lucide-react";
import type { IdxStock, StockUniverse } from "@/domain/securities";

export function StockSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stocks, setStocks] = useState<IdxStock[]>([]);
  const [status, setStatus] = useState("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stocks", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data: StockUniverse = await r.json();
        setStocks(data.stocks);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const term = query.trim().toLowerCase();
  const matches = term
    ? stocks
        .filter((s) =>
          `${s.ticker} ${s.companyName} ${s.sector ?? ""}`
            .toLowerCase()
            .includes(term),
        )
        .sort(
          (a, b) =>
            Number(b.ticker.toLowerCase().startsWith(term)) -
              Number(a.ticker.toLowerCase().startsWith(term)) ||
            a.ticker.localeCompare(b.ticker),
        )
    : [];
  const visible = matches.slice(0, 10);

  return (
    <div
      className="relative w-full"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!term) return;
          setOpen(false);
          router.push(
            active >= 0 && visible[active]
              ? `/stocks/${visible[active].ticker}`
              : `/scanner?q=${encodeURIComponent(query.trim())}`,
          );
        }}
        className="stock-search-prompt"
      >
        <span className="cmd-prefix">&gt; CMD:</span>
        <input
          className="stock-search-input"
          role="combobox"
          aria-label="Search ticker, company, or sector"
          aria-autocomplete="list"
          aria-expanded={open && !!term}
          aria-controls="stock-search-results"
          aria-activedescendant={
            active >= 0 ? `stock-result-${active}` : undefined
          }
          placeholder="SEARCH TICKER, SECTOR OR BROKER..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, visible.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(-1, i - 1));
            }
          }}
        />
        <kbd className="kbd-badge" title="Press Enter to execute query">
          ↵
        </kbd>
      </form>

      {open && term && (
        <div className="stock-search-popover">
          <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>
              {status === "error"
                ? "DIRECTORY UNAVAILABLE"
                : status !== "ready"
                  ? "FETCHING DIRECTORY..."
                  : `MATCHES: ${matches.length} TICKERS`}
            </span>
            <span className="text-amber">[↑↓ TO NAVIGATE · ↵ TO SELECT]</span>
          </div>

          <div
            role="listbox"
            id="stock-search-results"
            aria-label="Stock search matches"
          >
            {visible.map((s, i) => (
              <Link
                key={s.ticker}
                id={`stock-result-${i}`}
                role="option"
                aria-selected={i === active}
                href={`/stocks/${s.ticker}`}
                onClick={() => setOpen(false)}
                className="hover:bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-900 transition-colors font-mono"
              >
                <div className="flex items-center gap-3">
                  <strong className="text-cyan text-xs font-bold w-14">
                    {s.ticker}
                  </strong>
                  <span className="text-slate-300 text-xs truncate max-w-[280px]">
                    {s.companyName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>{s.sector ?? "General"}</span>
                  <ArrowRight size={11} className="text-slate-600" />
                </div>
              </Link>
            ))}
          </div>

          {status === "ready" && !matches.length && (
            <div className="p-3 text-center text-xs text-slate-400 font-mono">
              NO MATCHING SECURITIES FOUND.
            </div>
          )}

          {!!matches.length && (
            <Link
              className="block p-2 text-center text-xs font-mono font-bold text-amber hover:bg-slate-900 border-t border-slate-800 transition-colors"
              href={`/scanner?q=${encodeURIComponent(query.trim())}`}
              onClick={() => setOpen(false)}
            >
              EXECUTE FULL UNIVERSE SCAN ({matches.length} RESULTS) →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
