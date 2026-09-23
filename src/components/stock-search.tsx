"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
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
  const visible = matches.slice(0, 12);
  return (
    <div
      className="stock-search"
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
      >
        <Search size={16} aria-hidden="true" />
        <input
          role="combobox"
          aria-label="Cari saham atau sektor"
          aria-autocomplete="list"
          aria-expanded={open && !!term}
          aria-controls="stock-search-results"
          aria-activedescendant={
            active >= 0 ? `stock-result-${active}` : undefined
          }
          placeholder="Cari kode, nama saham, atau sektor…"
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
        <kbd>↵</kbd>
      </form>
      {open && term && (
        <div className="stock-search-popover">
          <p role="status">
            {status === "error"
              ? "Direktori belum dapat dimuat. Tekan Enter untuk membuka scanner."
              : status !== "ready"
                ? "Memuat daftar saham…"
                : `${matches.length} saham cocok`}
          </p>
          <div
            role="listbox"
            id="stock-search-results"
            aria-label="Hasil pencarian saham"
          >
            {visible.map((s, i) => (
              <Link
                key={s.ticker}
                id={`stock-result-${i}`}
                role="option"
                aria-selected={i === active}
                href={`/stocks/${s.ticker}`}
                onClick={() => setOpen(false)}
              >
                <strong>{s.ticker}</strong>
                <span>
                  {s.companyName}
                  <small>{s.sector ?? "Sektor belum tersedia"}</small>
                </span>
              </Link>
            ))}
          </div>
          {status === "ready" && !matches.length && (
            <p>Tidak ada saham yang cocok. Coba kode atau nama lain.</p>
          )}
          {!!matches.length && (
            <Link
              className="search-all"
              href={`/scanner?q=${encodeURIComponent(query.trim())}`}
              onClick={() => setOpen(false)}
            >
              Lihat semua {matches.length} hasil di scanner →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
