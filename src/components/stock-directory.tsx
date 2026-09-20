"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AnalysisSummary } from "@/lib/intelligence/summary";
import { useRouter } from "next/navigation";
import { CORE_PHASES } from "@/domain/intelligence";
import { num, readable } from "@/lib/intelligence/format";
import type { StockUniverse } from "@/domain/securities";
import { parseWatchlist } from "@/lib/watchlist";
import { PageHeading, EmptyState } from "./ui";
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
  const analysisMap = useMemo(
    () => new Map(analyses.map((a) => [a.ticker, a])),
    [analyses],
  );
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
            (!phase || analysisMap.get(s.ticker)?.phase === phase) &&
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
            `${s.ticker} ${s.companyName}`
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
  const title = {
    scanner: "IDX market scanner",
    overview: "The IDX research universe.",
    stocks: "Stock intelligence",
    watchlist: "Your research shortlist.",
    brokers: "Broker flow by stock",
    replay: "Market cycle replay",
  }[view];
  return (
    <>
      <PageHeading
        title={title}
        description="Verified Sectors company universe · TradingView market candles and calculated phase regions."
      />
      <div className="demo-notice">
        <strong>SECTORS · IDX COMPANIES</strong>
        <span>
          {universe.total.toLocaleString()} stocks · Fetched{" "}
          {universe.fetchedAt} · 24-hour directory cache
        </span>
      </div>
      {universe.warnings.map((w) => (
        <p className="chart-caption" role="status" key={w}>
          {w}
        </p>
      ))}
      {view === "overview" && (
        <div className="detail-metrics">
          {[
            ["IDX companies", universe.total],
            ["Sectors available", sectors.length],
            [
              "Free-float coverage",
              universe.stocks.filter((s) => s.freeFloat !== null).length,
            ],
            ["Chart source", "TradingView"],
          ].map(([label, value]) => (
            <div className="detail-metric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
      <p className="chart-caption">
        Analysed {analyses.length} of {universe.total} supported stocks.
        Unanalysed fields are unavailable. Rankings use the stored daily
        snapshot; open a stock for timeframe-specific analysis.
      </p>
      <div className="analysis-toolbar">
        <button
          className="button"
          disabled={busy || !filtered.length}
          onClick={async () => {
            setBusy(true);
            const targets = filtered
              .slice(currentPage * 50, currentPage * 50 + 50)
              .filter((stock) => {
                const old = analysisMap.get(stock.ticker);
                return (
                  !old || Date.now() - Date.parse(old.calculatedAt) >= 900000
                );
              })
              .slice(0, 5);
            let completed = 0;
            for (const stock of targets) {
              setBatch(
                `Analysing ${stock.ticker} · ${completed}/${targets.length}`,
              );
              try {
                const r = await fetch("/api/intelligence", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ticker: stock.ticker }),
                });
                if (!r.ok) {
                  setBatch(
                    `Stopped at ${stock.ticker}: source unavailable or busy. Retry later.`,
                  );
                  break;
                }
                completed++;
              } catch {
                setBatch("Connection unavailable. Batch stopped.");
                break;
              }
            }
            if (completed === targets.length)
              setBatch(
                `${completed} stocks analysed. Cached results reused within 15 minutes.`,
              );
            setBusy(false);
            router.refresh();
          }}
        >
          {busy ? "Analysing…" : "Analyse 5 pending visible stocks"}
        </button>
        <span role="status">
          {batch ||
            "On demand · up to 3 broker API calls per uncached stock · no background polling"}
        </span>
      </div>
      <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <label className="field">
            <span>Phase</span>
            <select
              value={phase}
              onChange={(e) => {
                setPhase(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All phases</option>
              {[...CORE_PHASES, "TRANSITION", "UNCLASSIFIED"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Phase transition</span>
            <select
              value={transition}
              onChange={(e) => {
                setTransition(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All transitions</option>
              {[
                "ACCUMULATION→MARKUP",
                "MARKUP→DISTRIBUTION",
                "DISTRIBUTION→MARKDOWN",
                "MARKDOWN→ACCUMULATION",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Minimum confidence</span>
            <input
              type="number"
              min="0"
              max="100"
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Broker flow</span>
            <select value={flow} onChange={(e) => setFlow(e.target.value)}>
              <option value="">Any flow</option>
              {[
                "institutional buy",
                "institutional sell",
                "retail buy",
                "retail sell",
              ].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Alert</span>
            <select value={alert} onChange={(e) => setAlert(e.target.value)}>
              <option value="">Any alert</option>
              {[
                "INSTITUTIONAL_BLOCK_FLOW",
                "UNUSUAL_NET_SELL",
                "ABNORMAL_TOTAL_VOLUME",
                "HIGH_VOLUME_BREAKOUT",
                "HIGH_VOLUME_BREAKDOWN",
                "VOLUME_WITHOUT_PRICE_PROGRESS",
              ].map((p) => (
                <option key={p}>{p}</option>
              ))}
              <option disabled>Stealth · granular data unavailable</option>
              <option disabled>Foreign flow · unavailable</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={sufficient}
              onChange={(e) => setSufficient(e.target.checked)}
            />{" "}
            Sufficient history only
          </label>
          <label className="field">
            <span>Ticker or company</span>
            <input
              aria-label="Ticker or company"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="field">
            <span>Sector</span>
            <select
              value={sector}
              onChange={(e) => {
                setSector(e.target.value);
                setSubsector("");
                setPage(0);
              }}
            >
              <option value="">All sectors</option>
              {sectors.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Subsector</span>
            <select
              value={subsector}
              onChange={(e) => {
                setSubsector(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All subsectors</option>
              {subsectors.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(e) => {
                const value = e.target.value;
                if (
                  value === "accumulation" ||
                  value === "markup" ||
                  value === "distribution"
                ) {
                  setPhase(value.toUpperCase());
                  setSort("confidence");
                } else if (value === "newaccumulation") {
                  setPhase("ACCUMULATION");
                  setSort("newest");
                } else setSort(value);
                setPage(0);
              }}
            >
              <option value="accumulation">Strongest accumulation</option>
              <option value="newaccumulation">Newest accumulation</option>
              <option value="markup">Strongest markup</option>
              <option value="distribution">Distribution confidence</option>
              <option value="alert">Newest active alert</option>
              <option value="confidence">Strongest phase confidence</option>
              <option value="newest">Newest phase transition</option>
              <option value="volume">Highest relative volume</option>
              <option value="institutional buy">
                Largest institutional net buy
              </option>
              <option value="institutional sell">
                Largest institutional net sell
              </option>
              <option value="ticker">Ticker A–Z</option>
              <option value="company">Company A–Z</option>
              <option value="float">Free float descending</option>
            </select>
          </label>
          <button
            className="button"
            onClick={() => {
              setQuery("");
              setSector("");
              setSubsector("");
              setPage(0);
              setSort("ticker");
              setMaxFloat("");
              setPhase("");
              setMinimum("");
              setFlow("");
              setAlert("");
              setSufficient(false);
            }}
          >
            Reset
          </button>
          <label className="field">
            <span>Maximum free float (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={maxFloat}
              placeholder="Any"
              onChange={(e) => {
                setMaxFloat(
                  e.target.value === ""
                    ? ""
                    : String(
                        Math.max(0, Math.min(100, Number(e.target.value))),
                      ),
                );
                setPage(0);
              }}
            />
          </label>
          <button
            className="button"
            aria-pressed={onlySaved}
            disabled={!ready}
            onClick={() => {
              setOnlySaved(!onlySaved);
              setPage(0);
            }}
          >
            {onlySaved ? "Show all stocks" : "Watchlist only"}
          </button>
        </div>
      </div>
      {storageMessage && <p role="status">{storageMessage}</p>}
      <p className="chart-caption" role="status">
        {filtered.length} of {universe.total} stocks ·{" "}
        {onlySaved ? "Saved in this browser" : "Sectors directory"}
      </p>
      <div className="panel table-scroll">
        {filtered.length ? (
          <table>
            <thead>
              <tr>
                {[
                  "Ticker",
                  "Company",
                  "Phase / confidence",
                  "Institutional proxy · lots",
                  "Retail · lots",
                  "Remaining · lots",
                  "RVOL",
                  "Latest alert",
                  "Updated",
                  "Watchlist",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice(currentPage * 50, currentPage * 50 + 50)
                .map((stock) => (
                  <tr key={stock.ticker}>
                    <td>
                      <Link
                        prefetch={false}
                        className="stock-name"
                        href={`/stocks/${stock.ticker}`}
                      >
                        {stock.ticker}
                      </Link>
                    </td>
                    <td>{stock.companyName}</td>
                    <td>
                      {analysisMap.has(stock.ticker) ? (
                        <>
                          {readable(analysisMap.get(stock.ticker)!.phase)}
                          <small className="cell-note">
                            {analysisMap.get(stock.ticker)!.confidence}% ·{" "}
                            <Link
                              prefetch={false}
                              href={`/stocks/${stock.ticker}`}
                            >
                              Why?
                            </Link>
                          </small>
                        </>
                      ) : (
                        "Not analysed"
                      )}
                    </td>
                    <td>
                      {analysisMap.get(stock.ticker)?.brokerAvailable
                        ? num(
                            analysisMap
                              .get(stock.ticker)
                              ?.groups.find(
                                (g) =>
                                  g.classification ===
                                  "INSTITUTIONAL_ASSOCIATED",
                              )?.netLot,
                          )
                        : "Unavailable"}
                    </td>
                    <td>
                      {analysisMap.get(stock.ticker)?.brokerAvailable
                        ? num(
                            analysisMap
                              .get(stock.ticker)
                              ?.groups.find(
                                (g) => g.classification === "RETAIL_ACCESSIBLE",
                              )?.netLot,
                          )
                        : "Unavailable"}
                    </td>
                    <td>
                      {analysisMap.get(stock.ticker)?.brokerAvailable
                        ? num(analysisMap.get(stock.ticker)?.remaining)
                        : "Unavailable"}
                    </td>
                    <td>
                      {num(
                        analysisMap.get(stock.ticker)?.priceVolume
                          ?.relativeVolume,
                        2,
                      )}
                    </td>
                    <td>
                      {analysisMap
                        .get(stock.ticker)
                        ?.alerts.find((a) => a.status === "NEW")?.severity ??
                        (analysisMap.has(stock.ticker)
                          ? "None detected"
                          : "Unavailable")}
                    </td>
                    <td>
                      {analysisMap.has(stock.ticker) ? (
                        <>
                          {analysisMap
                            .get(stock.ticker)!
                            .calculatedAt.slice(0, 16)
                            .replace("T", " ")}{" "}
                          UTC
                          <small className="cell-note">
                            {renderTime -
                              Date.parse(
                                analysisMap.get(stock.ticker)!.calculatedAt,
                              ) >
                            900000
                              ? "Stale · open to refresh"
                              : "Cached"}
                          </small>
                        </>
                      ) : (
                        "Unavailable"
                      )}
                    </td>
                    <td>
                      <button
                        className="button"
                        disabled={!ready}
                        aria-label={`${saved.includes(stock.ticker) ? "Remove" : "Save"} ${stock.ticker}`}
                        onClick={() => toggle(stock.ticker)}
                      >
                        {saved.includes(stock.ticker) ? "Saved ✓" : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title={
              onlySaved ? "No saved matching stocks" : "No matching stocks"
            }
            description="Adjust the filters or show all stocks to add to your watchlist."
          />
        )}
      </div>
      <div
        className="chart-caption"
        style={{ display: "flex", gap: 16, alignItems: "center" }}
      >
        <button
          className="button"
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
        >
          Previous
        </button>
        <span>
          Page {currentPage + 1} /{" "}
          {Math.max(1, Math.ceil(filtered.length / 50))}
        </span>
        <button
          className="button"
          disabled={(currentPage + 1) * 50 >= filtered.length}
          onClick={() => setPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}
