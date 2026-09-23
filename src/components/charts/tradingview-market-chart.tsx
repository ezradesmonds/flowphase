"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  createSeriesMarkers,
  ColorType,
  createChart,
  HistogramSeries,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  TIMEFRAMES,
  type CandleSnapshot,
  type MarketCandle,
  type Timeframe,
} from "@/domain/chart-market";
import type { Intelligence } from "@/domain/intelligence";
import { analyze } from "@/lib/intelligence/analyze";
import { PhaseBrokerEvidence } from "../phase-broker-evidence";
import { IntelligencePanels } from "../intelligence-panels";
import { Panel } from "../ui";
import type { PhaseRegion } from "@/domain/market";
import { detectPhaseRegions } from "@/lib/phases/detect";
import { PHASE_REGION_STYLES } from "@/lib/phases/styles";
import { PhaseRegionsPrimitive } from "./phase-regions-primitive";

type ChartTheme = "dark" | "light";

function setup(element: HTMLDivElement, theme: ChartTheme) {
  const light = theme === "light";
  const chart = createChart(element, {
    autoSize: true,
    layout: {
      background: {
        type: ColorType.Solid,
        color: light ? "#ffffff" : "#0c1922",
      },
      textColor: light ? "#5d6877" : "#91a9bc",
      fontFamily: '"IBM Plex Sans", Arial, sans-serif',
      attributionLogo: true,
    },
    grid: {
      vertLines: { color: light ? "#e6e9ee" : "#172c38" },
      horzLines: { color: light ? "#e6e9ee" : "#172c38" },
    },
    timeScale: { timeVisible: true },
    localization: { locale: "en-GB" },
  });
  const price = chart.addSeries(CandlestickSeries, {
    upColor: "#65d3a7",
    downColor: "#f08a91",
    borderVisible: false,
    wickUpColor: "#65d3a7",
    wickDownColor: "#f08a91",
  });
  price.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.3 } });
  const volume = chart.addSeries(HistogramSeries, {
    priceFormat: { type: "volume" },
    priceScaleId: "volume",
    lastValueVisible: false,
    priceLineVisible: false,
  });
  volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
  const markers = createSeriesMarkers(price, []);
  const phaseOverlay = new PhaseRegionsPrimitive();
  price.attachPrimitive(phaseOverlay);
  return { chart, price, volume, phaseOverlay, markers };
}
function MarketCanvas({
  candles,
  timeframe,
  regions,
  autoFit = false,
  alerts = [],
  theme,
  onSelectRegion,
}: {
  candles: MarketCandle[];
  timeframe: Timeframe;
  regions: readonly PhaseRegion[];
  autoFit?: boolean;
  alerts?: Intelligence["alerts"];
  theme: ChartTheme;
  onSelectRegion?: (region: PhaseRegion) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const series = useRef<ReturnType<typeof setup> | null>(null);
  const fitted = useRef(false);
  useEffect(() => {
    if (!container.current) return;
    const instance = setup(container.current, theme);
    series.current = instance;
    fitted.current = false;
    return () => {
      series.current = null;
      instance.price.detachPrimitive(instance.phaseOverlay);
      instance.chart.remove();
    };
  }, [theme]);
  useEffect(() => {
    const current = series.current;
    if (!current) return;
    current.chart.timeScale().applyOptions({
      timeVisible: !timeframe.includes("D") && !timeframe.includes("W"),
    });
    current.price.setData(
      candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })),
    );
    current.volume.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "#284d46" : "#54313e",
      })),
    );
    if ((!fitted.current || autoFit) && candles.length) {
      current.chart.timeScale().fitContent();
      fitted.current = true;
    }
  }, [candles, timeframe, autoFit]);
  useEffect(() => {
    series.current?.phaseOverlay.setRegions(regions);
  }, [regions]);
  useEffect(() => {
    const current = series.current;
    if (!current) return;
    const markerTimes = new Map<number, string>();
    for (const alert of alerts) {
      const bar = alert.dataSource.includes("Sectors daily broker summary")
        ? timeframe === "1D"
          ? candles.find(
              (c) =>
                new Date(c.time * 1000 + 7 * 3600000)
                  .toISOString()
                  .slice(0, 10) ===
                new Date(alert.timestamp * 1000 + 7 * 3600000)
                  .toISOString()
                  .slice(0, 10),
            )
          : undefined
        : candles.find((c) => c.time === alert.timestamp);
      if (bar) markerTimes.set(bar.time, "!");
    }
    for (const region of regions)
      if (region.phase === "MENGGORENG")
        markerTimes.set(region.endTimestamp, "Menggoreng candidate");
    current.markers.setMarkers(
      [...markerTimes]
        .sort(([a], [b]) => a - b)
        .map(([time, text]) => ({
          time: time as UTCTimestamp,
          position: "aboveBar",
          color: "#F59E0B",
          shape: "circle",
          text,
        })),
    );
    const click = (event: { time?: unknown }) => {
      if (typeof event.time !== "number") return;
      const region = regions.find(
        (r) =>
          (event.time as number) >= r.startTimestamp &&
          (event.time as number) <= r.endTimestamp,
      );
      if (region) onSelectRegion?.(region);
    };
    current.chart.subscribeClick(click);
    current.chart.subscribeCrosshairMove(click);
    return () => {
      current.chart.unsubscribeClick(click);
      current.chart.unsubscribeCrosshairMove(click);
    };
  }, [alerts, candles, regions, onSelectRegion, timeframe]);
  return (
    <div
      ref={container}
      className="chart-container"
      role="img"
      aria-label="TradingView market candlestick and volume chart"
    />
  );
}
export function TradingViewMarketChart({
  ticker,
  production = false,
  replay: initialReplay = false,
  analysis: initialAnalysis,
}: {
  ticker: string;
  production?: boolean;
  replay?: boolean;
  analysis?: Intelligence;
}) {
  const [replay, setReplay] = useState(initialReplay);
  const [selectedRegion, setSelectedRegion] = useState<PhaseRegion>();
  const [brokerConfirmation, setBrokerConfirmation] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [attempt, setAttempt] = useState(0);
  const [updates, setUpdates] = useState(false);
  const [showPhases, setShowPhases] = useState(true);
  const [replayIndex, setReplayIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [chartTheme, setChartTheme] = useState<ChartTheme>("dark");
  const [result, setResult] = useState<{
    key: string;
    data?: CandleSnapshot;
    error?: string;
  }>({
    key: initialAnalysis?.candles ? `${ticker}:1D:0` : "",
    data: initialAnalysis?.candles ?? undefined,
  });
  const [streamStatus, setStreamStatus] = useState("Updates paused");
  useEffect(() => {
    const onTheme = (event: Event) => {
      const next = (event as CustomEvent<ChartTheme>).detail;
      if (next === "dark" || next === "light") setChartTheme(next);
    };
    window.addEventListener("flowphase-theme", onTheme);
    const frame = window.requestAnimationFrame(() => {
      const current =
        document.documentElement.dataset.theme === "light" ? "light" : "dark";
      setChartTheme(current);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("flowphase-theme", onTheme);
    };
  }, []);
  const key = `${ticker}:${timeframe}:${attempt}`;
  const current =
    result.key === key
      ? result
      : timeframe === "1D" && attempt === 0 && initialAnalysis?.candles
        ? { key, data: initialAnalysis.candles }
        : undefined;
  const data = current?.data;
  const visibleCandles = useMemo(
    () =>
      data
        ? replay
          ? data.candles.slice(0, replayIndex + 1)
          : data.candles
        : [],
    [data, replay, replayIndex],
  );
  const lastIndex = Math.max(0, (data?.candles.length ?? 0) - 1);
  const running = replay && playing && replayIndex < lastIndex;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () => setReplayIndex((i) => Math.min(lastIndex, i + 1)),
      550,
    );
    return () => clearInterval(timer);
  }, [running, lastIndex]);
  const intelligence = useMemo(
    () =>
      initialAnalysis && data
        ? analyze(
            ticker,
            { ...data, candles: visibleCandles },
            initialAnalysis.broker,
            replay && visibleCandles.length
              ? new Date(visibleCandles.at(-1)!.time * 1000).toISOString()
              : Date.parse(initialAnalysis.calculatedAt) >
                  Date.parse(data.fetchedAt)
                ? initialAnalysis.calculatedAt
                : data.fetchedAt,
          )
        : undefined,
    [initialAnalysis, data, visibleCandles, ticker, replay],
  );
  const regions = useMemo(
    () =>
      intelligence?.regions ??
      detectPhaseRegions(ticker, timeframe, visibleCandles),
    [intelligence, visibleCandles, ticker, timeframe],
  );
  const selected = regions.find((r) => r.id === selectedRegion?.id);
  const displayedRegions = brokerConfirmation
    ? regions.filter((r) => r.brokerEvidence === "BROKER_SUPPORTED")
    : regions;
  useEffect(() => {
    if (initialAnalysis?.candles && timeframe === "1D" && attempt === 0) return;
    const abort = new AbortController();
    const query = new URLSearchParams({ ticker, timeframe, limit: "200" });
    void fetch(`/api/market/candles?${query}`, { signal: abort.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.message ?? "Market data unavailable.");
        if (!abort.signal.aborted) setResult({ key, data: body });
      })
      .catch((error) => {
        if (!abort.signal.aborted)
          setResult({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Market data unavailable.",
          });
      });
    return () => abort.abort();
  }, [ticker, timeframe, key, initialAnalysis, attempt]);
  useEffect(() => {
    if (!updates) return;
    const source = new EventSource(
      `/api/market/candles/stream?${new URLSearchParams({ ticker, timeframe, limit: "200" })}`,
    );
    source.addEventListener("candles", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as CandleSnapshot;
      setResult({ key, data: next });
      setStreamStatus("Receiving provider updates · exchange delay unknown");
    });
    source.addEventListener("provider-error", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as {
        message: string;
      };
      setStreamStatus(`${next.message} Toggle updates to retry.`);
      source.close();
    });
    source.onerror = () => {
      setStreamStatus("Connection interrupted. Toggle updates to retry.");
      source.close();
    };
    return () => source.close();
  }, [updates, ticker, timeframe, key]);
  const latest = visibleCandles.at(-1);
  return (
    <Panel
      title="TradingView · Market price & volume"
      note={
        production
          ? "TradingView OHLCV · calculated price/volume phases"
          : "Provider OHLCV · separate from the demo analysis below"
      }
    >
      <div
        style={{
          padding: "0 22px 16px",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {production && (
          <button
            className="button"
            aria-pressed={replay}
            onClick={() => {
              setReplay(!replay);
              setUpdates(false);
              setReplayIndex(0);
              setPlaying(false);
            }}
          >
            Replay {replay ? "on" : "off"}
          </button>
        )}
        {production && (
          <button
            className="button"
            aria-pressed={brokerConfirmation}
            onClick={() => setBrokerConfirmation(!brokerConfirmation)}
          >
            Broker-supported boxes {brokerConfirmation ? "only" : "off"}
          </button>
        )}
        <label>
          Market timeframe{" "}
          <select
            aria-label="Market timeframe"
            value={timeframe}
            onChange={(e) => {
              setTimeframe(e.target.value as Timeframe);
              setUpdates(false);
              setReplayIndex(0);
              setPlaying(false);
            }}
          >
            {TIMEFRAMES.map((t) => (
              <option key={t} value={t}>
                {t === "1D" ? "Daily" : t === "1W" ? "Weekly" : `${t} min`}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button"
          onClick={() => {
            setUpdates(false);
            setReplayIndex(0);
            setPlaying(false);
            setAttempt((n) => n + 1);
          }}
        >
          Refresh market data
        </button>
        <button
          className="button"
          disabled={!data || replay}
          aria-pressed={updates}
          onClick={() => {
            setUpdates(!updates);
            setStreamStatus("Connecting to provider updates…");
          }}
        >
          {updates ? "Pause updates" : "Enable updates"}
        </button>
        <button
          className="button"
          aria-pressed={showPhases}
          onClick={() => setShowPhases(!showPhases)}
        >
          {showPhases ? "Hide phase regions" : "Show phase regions"}
        </button>
      </div>
      {replay && data && (
        <div className="chart-caption">
          <button
            className="button"
            disabled={!data.candles.length}
            onClick={() => {
              if (replayIndex >= lastIndex) setReplayIndex(0);
              setPlaying(!running);
            }}
          >
            {running ? "Pause" : "Play"}
          </button>{" "}
          <button
            className="button"
            onClick={() => {
              setReplayIndex(0);
              setPlaying(false);
            }}
          >
            Restart
          </button>
          <label style={{ display: "block", marginTop: 12 }}>
            Replay timeline{" "}
            <input
              aria-label="Replay timeline"
              type="range"
              min={0}
              max={lastIndex}
              value={Math.min(replayIndex, lastIndex)}
              onChange={(e) => {
                setPlaying(false);
                setReplayIndex(Number(e.target.value));
              }}
              style={{ width: "100%" }}
            />
          </label>
          <span>
            Session {Math.min(replayIndex, lastIndex) + 1} /{" "}
            {data.candles.length}. Regions use only the revealed candle prefix;
            regions start at confirmation and are not backdated.
          </span>
        </div>
      )}
      {!current && (
        <p className="chart-caption" role="status">
          Loading TradingView candles…
        </p>
      )}
      {current?.error && (
        <div className="chart-caption" role="alert">
          {current.error} Use Refresh to retry. No demo fallback is substituted.
        </div>
      )}
      {data && !data.candles.length && (
        <p className="chart-caption">
          No candles available for this symbol and timeframe.
        </p>
      )}
      {latest && (
        <p className="chart-caption">
          <strong>
            {data?.symbol} · Last candle close{" "}
            {latest.close.toLocaleString("en-US")} IDR
          </strong>{" "}
          · Candle timestamp {new Date(latest.time * 1000).toISOString()} ·
          Volume {latest.volume.toLocaleString("en-US")}
        </p>
      )}
      {latest &&
        data &&
        Date.parse(data.fetchedAt) - latest.time * 1000 > 7 * 86400000 && (
          <p className="chart-caption" role="status">
            Stale candle history: the latest available bar is more than seven
            days older than this fetch. This analysis describes the last
            available period, not current market conditions.
          </p>
        )}
      {data && data.candles.length > 0 && (
        <MarketCanvas
          key={`${key}:${chartTheme}`}
          candles={visibleCandles}
          autoFit={replay}
          timeframe={timeframe}
          regions={showPhases ? displayedRegions : []}
          alerts={intelligence?.alerts}
          theme={chartTheme}
          onSelectRegion={setSelectedRegion}
        />
      )}
      <div
        className="chart-caption"
        style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
        aria-label="Market phase legend"
      >
        {Object.entries(PHASE_REGION_STYLES)
          .filter(([phase]) => phase !== "INSUFFICIENT_DATA")
          .map(([, style]) => (
            <span
              key={style.label}
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  border: `1px solid ${style.border}`,
                  background: style.fill,
                }}
              />
              {style.label}
            </span>
          ))}
      </div>
      {brokerConfirmation && (
        <p className="chart-caption">
          Only regions with sufficient broker coverage are shown. Broker
          evidence enters the phase scores; coverage does not identify
          beneficial owners.
        </p>
      )}
      {data && !intelligence && (
        <div className="chart-caption">
          <p role="status">
            {regions.length
              ? `${regions.length} calculated phase regions · ${ticker} / ${timeframe}`
              : "No confirmed phase regions. At least 23 candles and three matching classified bars are required."}
          </p>
          <p>
            OHLCV heuristics only. Confidence measures rule strength, not
            probability. Latest region may change. Transition and uncertain
            regions use gray. Insufficient data has no fill. Zoom in to read
            narrow labels.
          </p>
          {regions.length > 0 && (
            <details>
              <summary>Phase evidence &amp; confidence</summary>
              <ul
                aria-label="Calculated phase regions"
                style={{ paddingLeft: 18 }}
              >
                {regions.map((region) => (
                  <li key={region.id} style={{ margin: "12px 0" }}>
                    <strong>
                      {region.phase !== "UNCERTAIN" &&
                        PHASE_REGION_STYLES[region.phase].label}{" "}
                      · {region.confidence}%
                    </strong>{" "}
                    · {new Date(region.startTimestamp * 1000).toISOString()} —{" "}
                    {new Date(region.endTimestamp * 1000).toISOString()} ·{" "}
                    {region.status} · Coverage{" "}
                    {(region.coverage * 100).toFixed(1)}% ·{" "}
                    {region.algorithmVersion}
                    <p>{region.evidence.join(" ")}</p>
                    <p>
                      {region.againstEvidence
                        .map((e) => e.status + ": " + e.description)
                        .join(" ")}
                    </p>
                    <p>{region.warnings.join(" ")}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {intelligence && selected && (
        <PhaseBrokerEvidence analysis={intelligence} region={selected} />
      )}
      {intelligence && (
        <IntelligencePanels
          analysis={intelligence}
          selectedRegion={selected}
          onSelectRegion={setSelectedRegion}
        />
      )}
      <p className="chart-caption" role="status">
        {updates ? streamStatus : "Updates paused"}. TradingView source;
        realtime entitlement and exchange delay are not verified.{" "}
        {data && `Fetched ${data.fetchedAt}.`} Chart times are UTC. Regular
        session, split-adjusted.
      </p>
      <p className="chart-caption">
        {production
          ? "Phase regions combine TradingView OHLCV with broker evidence available at decision time. Missing evidence lowers coverage and confidence."
          : "Demo broker flows and phase labels are not overlays on these market candles."}{" "}
        <a
          className="text-link"
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noreferrer"
        >
          Charts by TradingView
        </a>
      </p>
    </Panel>
  );
}
