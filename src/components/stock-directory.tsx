"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AnalysisSummary } from "@/lib/intelligence/summary";
import { useRouter } from "next/navigation";
import { CORE_PHASES } from "@/domain/intelligence";
import { num } from "@/lib/intelligence/format";
import type { StockUniverse } from "@/domain/securities";
import { parseWatchlist } from "@/lib/watchlist";
import { PageHeading, EmptyState, Panel } from "./ui";

const STORAGE_KEY = "flowphase.idx.watchlist.v1";

export function StockDirectory({
  universe,
  initialQuery = "",
  view = "scanner",
  analyses = [],
  initialPhase = "",
}: {
  universe: StockUniverse;
  initialQuery?: string;
  analyses?: AnalysisSummary[];
  initialPhase?: string;
  view?: "scanner" | "overview" | "stocks" | "watchlist" | "brokers" | "replay";
}) {
  const router = useRouter();
  const [renderTime] = useState(() => Date.now());
  const [transition, setTransition] = useState("");
  const [phase, setPhase] = useState(initialPhase);
  const [minimum, setMinimum] = useState("");
  const [flow, setFlow] = useState("");
  const [alert, setAlert] = useState("");
  const [sufficient, setSufficient] = useState(false);
  const [batch, setBatch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState<AnalysisSummary[]>([]);
  const [loadingTicker, setLoadingTicker] = useState("");

  const analysisMap = useMemo(
    () => new Map([...analyses, ...loaded].map((a) => [a.ticker, a])),
    [analyses, loaded],
  );

  async function analyseStock(ticker: string) {
    setBusy(true);
    setLoadingTicker(ticker);
    setBatch(`ACQUIRING TELEMETRY FOR ${ticker}...`);
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!response.ok) throw new Error();
      const result: AnalysisSummary = await response.json();
      setLoaded((old) => [...old.filter((a) => a.ticker !== ticker), result]);
      setBatch(
        `${ticker} CYCLE MODEL EVALUATED. SAVED IN LOCAL CACHE.`,
      );
      router.refresh();
    } catch {
      setBatch(
        `TELEMETRY FOR ${ticker} COULD NOT BE ACQUIRED.`,
      );
    } finally {
      setBusy(false);
      setLoadingTicker("");
    }
  }

  const [query, setQuery] = useState(initialQuery);
  const [sector, setSector] = useState("");
  const [subsector, setSubsector] = useState("");
  const [sort, setSort] = useState("ticker");
  const [page, setPage] = useState(0);
  const [maxFloat, setMaxFloat] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [onlySaved, setOnlySaved] = useState(view === "watchlist");

  useEffect(() => {
    const valid = universe.stocks.map((s) => s.ticker);
    const timer = setTimeout(() => {
      try {
        setSaved(parseWatchlist(localStorage.getItem(STORAGE_KEY), valid));
      } catch {
        setStorageMessage(
          "Watchlist storage unavailable. Changes remain in this tab.",
        );
      }
      setReady(true);
    }, 0);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY)
        try {
          setSaved(parseWatchlist(event.newValue, valid));
        } catch {
          setStorageMessage("Saved watchlist could not be read.");
        }
    };
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", sync);
    };
  }, [universe.stocks]);

  function toggle(ticker: string) {
    const next = saved.includes(ticker)
      ? saved.filter((t) => t !== ticker)
      : [...saved, ticker];
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setStorageMessage(
        "Watchlist storage unavailable. Changes remain in this tab.",
      );
    }
  }

  const sectors = [
    ...new Set(universe.stocks.flatMap((s) => (s.sector ? [s.sector] : []))),
  ].sort();
  const subsectors = [
    ...new Set(
      universe.stocks
        .filter((s) => !sector || s.sector === sector)
        .flatMap((s) => (s.subsector ? [s.subsector] : [])),
    ),
  ].sort();

  const filtered = useMemo(
    () =>
      universe.stocks
        .filter(
          (s) =>
            (!phase || analysisMap.get(s.ticker)?.state === phase) &&
            (!transition ||
              analysisMap
                .get(s.ticker)
                ?.regions.map((r) => r.phase)
                .join("→") === transition) &&
            (!minimum ||
              (analysisMap.get(s.ticker)?.confidence ?? -1) >=
                Number(minimum)) &&
            (!sufficient ||
              !!analysisMap.get(s.ticker)?.priceVolume?.sufficient) &&
            (!alert ||
              !!analysisMap
                .get(s.ticker)
                ?.alerts.some((a) => a.type === alert && a.status === "NEW")) &&
            (!flow ||
              (analysisMap
                .get(s.ticker)
                ?.groups.some(
                  (g) =>
                    g.classification ===
                      (flow.startsWith("institutional")
                        ? "INSTITUTIONAL_ASSOCIATED"
                        : "RETAIL_ACCESSIBLE") &&
                    (flow.endsWith("buy") ? g.netLot > 0 : g.netLot < 0),
                ) ??
                false)) &&
            (!onlySaved || saved.includes(s.ticker)) &&
            (!sector || s.sector === sector) &&
            (!subsector || s.subsector === subsector) &&
            (maxFloat === "" ||
              (s.freeFloat !== null &&
                s.freeFloat * 100 <= Number(maxFloat))) &&
            `${s.ticker} ${s.companyName} ${s.sector ?? ""}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        )
        .sort((a, b) =>
          sort === "alert"
            ? (analysisMap.get(b.ticker)?.alerts[0]?.timestamp ?? 0) -
              (analysisMap.get(a.ticker)?.alerts[0]?.timestamp ?? 0)
            : sort === "confidence"
              ? (analysisMap.get(b.ticker)?.confidence ?? -1) -
                (analysisMap.get(a.ticker)?.confidence ?? -1)
              : sort === "volume"
                ? (analysisMap.get(b.ticker)?.priceVolume?.relativeVolume ??
                    -1) -
                  (analysisMap.get(a.ticker)?.priceVolume?.relativeVolume ?? -1)
                : sort === "newest"
                  ? (analysisMap.get(b.ticker)?.regions.at(-1)
                      ?.startTimestamp ?? 0) -
                    (analysisMap.get(a.ticker)?.regions.at(-1)
                      ?.startTimestamp ?? 0)
                  : sort.startsWith("institutional")
                    ? (sort.endsWith("sell") ? 1 : -1) *
                      ((analysisMap
                        .get(a.ticker)
                        ?.groups.find(
                          (g) =>
                            g.classification === "INSTITUTIONAL_ASSOCIATED",
                        )?.netLot ?? 0) -
                        (analysisMap
                          .get(b.ticker)
                          ?.groups.find(
                            (g) =>
                              g.classification === "INSTITUTIONAL_ASSOCIATED",
                          )?.netLot ?? 0))
                    : sort === "company"
                      ? a.companyName.localeCompare(b.companyName)
                      : sort === "float"
                        ? (b.freeFloat ?? -1) - (a.freeFloat ?? -1)
                        : a.ticker.localeCompare(b.ticker),
        ),
    [
      universe.stocks,
      onlySaved,
      saved,
      sector,
      subsector,
      query,
      sort,
      maxFloat,
      phase,
      transition,
      minimum,
      flow,
      alert,
      sufficient,
      analysisMap,
    ],
  );

  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 50) - 1),
  );
  const pageStocks = useMemo(
    () => filtered.slice(currentPage * 50, currentPage * 50 + 50),
    [filtered, currentPage],
  );
  const unanalyzedOnPage = useMemo(
    () =>
      pageStocks.filter((stock) => {
        const old = analysisMap.get(stock.ticker);
        return !old || Date.now() - Date.parse(old.calculatedAt) >= 900000;
      }),
    [pageStocks, analysisMap],
  );

  async function runBatch(count?: number) {
    setBusy(true);
    const targets = count ? unanalyzedOnPage.slice(0, count) : unanalyzedOnPage;
    let completed = 0;
    for (const stock of targets) {
      setBatch(
        `EVALUATING ${stock.ticker} · ${completed + 1}/${targets.length}…`,
      );
      try {
        const r = await fetch("/api/intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: stock.ticker }),
        });
        if (!r.ok) {
          setBatch(
            `HALTED AT ${stock.ticker}: RATE LIMIT OR BUSY FEED.`,
          );
          break;
        }
        const result: AnalysisSummary = await r.json();
        setLoaded((old) => [
          ...old.filter((a) => a.ticker !== result.ticker),
          result,
        ]);
        completed++;
      } catch {
        setBatch("CONNECTION INTERRUPTED. BATCH HALTED.");
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    if (completed === targets.length) {
      setBatch(
        `${completed} SECURITIES ACQUIRED AND CACHED LOCALLY.`,
      );
    }
    setBusy(false);
    router.refresh();
  }

  const title = {
    scanner: "IDX MARKET SCANNER",
    overview: "IDX RESEARCH UNIVERSE",
    stocks: "STOCK INTELLIGENCE COCKPIT",
    watchlist: "SAVED SECURITIES WATCHLIST",
    brokers: "BROKER TRANSACTION FLOW BY STOCK",
    replay: "MARKET CYCLE REPLAY",
  }[view];

  return (
    <div className="space-y-2 font-mono">
      <PageHeading
        eyebrow="FLOWPHASE // MARKET UNIVERSE"
        title={title}
        description="Verified Sectors API company universe · TradingView market candles and calculated phase regions."
      />

      <div className="demo-notice">
        <strong>SECTORS · IDX UNIVERSE</strong>
        <span>
          {universe.total.toLocaleString()} SECURITIES · FETCHED{" "}
          {universe.fetchedAt} · 24H DIRECTORY CACHE
        </span>
      </div>

      {universe.warnings.map((w) => (
        <p className="chart-caption text-amber font-semibold" role="status" key={w}>
          [WARNING] {w}
        </p>
      ))}

      {view === "overview" && (
        <div className="detail-metrics">
          {[
            ["IDX COMPANIES", universe.total],
            ["SECTORS REGISTERED", sectors.length],
            [
              "FREE-FLOAT COVERAGE",
              universe.stocks.filter((s) => s.freeFloat !== null).length,
            ],
            ["CHART ENGINE", "TradingView"],
          ].map(([label, value]) => (
            <div className="detail-metric" key={label}>
              <span>{label}</span>
              <strong className="text-white">{value}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Batch Actions Toolbar */}
      <div className="filter-toolbar justify-between">
        <div className="flex items-center gap-2">
          <button
            className="terminal-btn primary"
            disabled={busy || !unanalyzedOnPage.length}
            onClick={() => runBatch()}
          >
            {busy
              ? "ACQUIRING BATCH..."
              : `BATCH ANALYZE PAGE (${unanalyzedOnPage.length} STOCKS)`}
          </button>
          {unanalyzedOnPage.length > 5 && (
            <button
              className="terminal-btn"
              disabled={busy}
              onClick={() => runBatch(5)}
            >
              ANALYZE 5 STOCKS
            </button>
          )}
          <span className="text-[10px] text-amber font-semibold ml-2" role="status">
            {batch || `${analysisMap.size}/${universe.total} SECURITIES ACQUIRED IN CACHE`}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>PAGE {currentPage + 1} OF {Math.max(1, Math.ceil(filtered.length / 50))}</span>
        </div>
      </div>

      {/* Modular Filter Panel */}
      <Panel title="[SEC.01 // UNIVERSE_CRITERIA_FILTERS]">
        <div className="filter-toolbar" style={{ margin: 0, border: "none" }}>
          <div className="filter-group">
            <span className="filter-label">PHASE:</span>
            <select
              value={phase}
              onChange={(e) => {
                setPhase(e.target.value);
                setPage(0);
              }}
            >
              <option value="">ALL PHASES</option>
              {[
                ...CORE_PHASES,
                "TRANSITION",
                "UNCERTAIN",
                "INSUFFICIENT_DATA",
                "POST_DISTRIBUTION_MARKDOWN",
              ].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">TRANSITION:</span>
            <select
              value={transition}
              onChange={(e) => {
                setTransition(e.target.value);
                setPage(0);
              }}
            >
              <option value="">ALL TRANSITIONS</option>
              {[
                "AKUMULASI→POMPOM",
                "POMPOM→MENGGORENG",
                "MENGGORENG→DISTRIBUSI",
                "DISTRIBUSI→POST_DISTRIBUTION_MARKDOWN",
                "POST_DISTRIBUTION_MARKDOWN→AKUMULASI",
              ].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">MIN SCORE:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={minimum}
              placeholder="0-100"
              className="w-16"
              onChange={(e) => setMinimum(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <span className="filter-label">FLOW:</span>
            <select value={flow} onChange={(e) => setFlow(e.target.value)}>
              <option value="">ANY FLOW</option>
              {[
                "institutional-associated buy",
                "institutional-associated sell",
                "retail buy",
                "retail sell",
              ].map((p) => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">SECTOR:</span>
            <select
              value={sector}
              onChange={(e) => {
                setSector(e.target.value);
                setSubsector("");
                setPage(0);
              }}
            >
              <option value="">ALL SECTORS</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">SORT BY:</span>
            <select
              value={sort}
              onChange={(e) => {
                const value = e.target.value;
                if (
                  value === "akumulasi" ||
                  value === "pompom" ||
                  value === "menggoreng" ||
                  value === "distribusi"
                ) {
                  setPhase(value.toUpperCase());
                  setSort("confidence");
                } else if (value === "newaccumulation") {
                  setPhase("AKUMULASI");
                  setSort("newest");
                } else setSort(value);
                setPage(0);
              }}
            >
              <option value="akumulasi">STRONGEST AKUMULASI</option>
              <option value="newaccumulation">NEWEST AKUMULASI</option>
              <option value="pompom">POMPOM ATTENTION</option>
              <option value="menggoreng">MENGGORENG SIGNALS</option>
              <option value="distribusi">DISTRIBUSI CONFIDENCE</option>
              <option value="alert">NEWEST ACTIVE ALERT</option>
              <option value="confidence">HIGHEST EVIDENCE SCORE</option>
              <option value="volume">HIGHEST RVOL</option>
              <option value="ticker">TICKER (A-Z)</option>
              <option value="float">FREE FLOAT (DESC)</option>
            </select>
          </div>

          <button
            className="terminal-btn"
            onClick={() => {
              setQuery("");
              setSector("");
              setSubsector("");
              setPage(0);
              setSort("ticker");
              setMaxFloat("");
              setPhase("");
              setTransition("");
              setMinimum("");
              setFlow("");
              setAlert("");
              setSufficient(false);
            }}
          >
            RESET
          </button>

          <button
            className={`terminal-btn ${onlySaved ? "active" : ""}`}
            disabled={!ready}
            onClick={() => {
              setOnlySaved(!onlySaved);
              setPage(0);
            }}
          >
            {onlySaved ? "SHOW ALL STOCKS" : "WATCHLIST ONLY"}
          </button>
        </div>
      </Panel>

      {storageMessage && <p className="chart-caption text-amber" role="status">{storageMessage}</p>}

      {/* Main Dense Table */}
      <div className="panel table-scroll" style={{ marginBottom: 4 }}>
        {filtered.length ? (
          <table>
            <thead>
              <tr>
                {[
                  "TICKER",
                  "COMPANY",
                  "PHASE / EVIDENCE SCORE",
                  "EVIDENCE BASIS",
                  "COVERAGE",
                  "PHASE START",
                  "DURATION",
                  "PRICE RETURN",
                  "TOP BUYER",
                  "TOP SELLER",
                  "CROSSING RISK",
                  "INST-ASSOC. PROXY LOTS",
                  "RETAIL LOTS",
                  "RVOL",
                  "LATEST ALERT",
                  "SAVED",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice(currentPage * 50, currentPage * 50 + 50)
                .map((stock) => {
                  const a = analysisMap.get(stock.ticker);
                  const isAnalyzed = Boolean(a);

                  return (
                    <tr key={stock.ticker}>
                      <td className="ticker-cell">
                        <Link
                          prefetch={false}
                          className="text-cyan hover:text-amber font-bold"
                          href={`/stocks/${stock.ticker}`}
                        >
                          {stock.ticker}
                        </Link>
                      </td>
                      <td className="text-slate-300 truncate max-w-[170px]">
                        {stock.companyName}
                      </td>
                      <td>
                        {isAnalyzed ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{a!.label}</span>
                            <span className="text-[10px] text-amber font-semibold">{a!.confidence}%</span>
                          </div>
                        ) : (
                          <button
                            className="terminal-btn text-[9px] py-0.2 px-1 text-cyan"
                            disabled={busy}
                            onClick={() => analyseStock(stock.ticker)}
                          >
                            {loadingTicker === stock.ticker ? "ACQUIRING..." : "ANALYZE"}
                          </button>
                        )}
                      </td>
                      <td>
                        {isAnalyzed ? (
                          <span
                            className={`evidence-basis-pill ${
                              a!.evidenceBasis === "BROKER_SUPPORTED"
                                ? "sectors-backed"
                                : "price-only"
                            }`}
                          >
                            {a!.evidenceBasis === "BROKER_SUPPORTED"
                              ? "SECTORS-BACKED"
                              : a!.evidenceBasis === "PRICE_VOLUME_ONLY"
                                ? "PRICE-VOLUME ONLY"
                                : "INSUFFICIENT"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="tabular-nums text-slate-400">
                        {isAnalyzed ? `${(a!.coverage * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="tabular-nums text-slate-300">
                        {isAnalyzed && a!.phaseStart
                          ? new Date(a!.phaseStart * 1000).toISOString().slice(0, 10)
                          : "—"}
                      </td>
                      <td className="tabular-nums text-slate-300">
                        {isAnalyzed ? `${a!.phaseDuration ?? 0} BARS` : "—"}
                      </td>
                      <td className="tabular-nums">
                        {isAnalyzed && a!.priceReturn != null ? (
                          <span className={a!.priceReturn >= 0 ? "positive font-bold" : "negative font-bold"}>
                            {a!.priceReturn >= 0 ? "+" : ""}
                            {(a!.priceReturn * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="font-bold text-cyan font-mono">
                        {isAnalyzed ? a!.topNetBuyer ?? "—" : "—"}
                      </td>
                      <td className="font-bold text-red font-mono">
                        {isAnalyzed ? a!.topNetSeller ?? "—" : "—"}
                      </td>
                      <td className="tabular-nums text-slate-300">
                        {isAnalyzed && a!.crossingRisk != null
                          ? `${(a!.crossingRisk * 100).toFixed(0)}%`
                          : "—"}
                      </td>
                      <td className="tabular-nums font-semibold text-green">
                        {isAnalyzed && a!.brokerAvailable
                          ? num(a!.groups.find((g) => g.classification === "INSTITUTIONAL_ASSOCIATED")?.netLot)
                          : "—"}
                      </td>
                      <td className="tabular-nums font-semibold text-orange">
                        {isAnalyzed && a!.brokerAvailable
                          ? num(a!.groups.find((g) => g.classification === "RETAIL_ACCESSIBLE")?.netLot)
                          : "—"}
                      </td>
                      <td className="tabular-nums font-bold text-slate-200">
                        {isAnalyzed ? num(a!.priceVolume?.relativeVolume, 2) : "—"}x
                      </td>
                      <td className="text-slate-300 text-[10px]">
                        {isAnalyzed
                          ? a!.alerts.find((al) => al.status === "NEW")?.type ?? "None"
                          : "—"}
                      </td>
                      <td>
                        <button
                          className={`terminal-btn text-[9px] py-0.2 px-1 ${saved.includes(stock.ticker) ? "active" : ""}`}
                          disabled={!ready}
                          onClick={() => toggle(stock.ticker)}
                        >
                          {saved.includes(stock.ticker) ? "SAVED ✓" : "SAVE"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title={onlySaved ? "NO SAVED STOCKS MATCH" : "NO MATCHING SECURITIES"}
            description="Adjust filters or search parameters to view universe."
          />
        )}
      </div>

      {/* Pagination Bar */}
      <div className="filter-toolbar justify-between">
        <button
          className="terminal-btn"
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
        >
          ← PREVIOUS
        </button>
        <span className="text-[10px] text-slate-400 font-semibold">
          SHOWING PAGE {currentPage + 1} OF {Math.max(1, Math.ceil(filtered.length / 50))} ({filtered.length} TOTAL TICKERS)
        </span>
        <button
          className="terminal-btn"
          disabled={(currentPage + 1) * 50 >= filtered.length}
          onClick={() => setPage(currentPage + 1)}
        >
          NEXT →
        </button>
      </div>
    </div>
  );
}
