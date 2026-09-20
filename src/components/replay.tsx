"use client";
import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { StockDetail } from "@/domain/market";
import { number, signed } from "@/lib/format";
import { CandleChart } from "./charts/candles";
import { DemoNotice, PageHeading, Panel, PhaseBadge } from "./ui";
export function Replay({ stocks }: { stocks: StockDetail[] }) {
  const [ticker, setTicker] = useState(stocks[0].scanner.ticker);
  const [cycleId, setCycleId] = useState("base");
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stock = stocks.find((s) => s.scanner.ticker === ticker)!;
  const cycle = stock.cycles.find((c) => c.id === cycleId)!;
  const candles = useMemo(
    () =>
      stock.candles.filter((c) => c.date >= cycle.start && c.date <= cycle.end),
    [stock, cycle],
  );
  const visible = useMemo(
    () => candles.slice(0, position + 1),
    [candles, position],
  );
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setPosition((p) => Math.min(p + 1, candles.length - 1)),
      750,
    );
    return () => clearInterval(timer);
  }, [playing, candles.length]);
  // Stop the timer at the end without setting state in an effect.
  const atEnd = position === candles.length - 1;
  useEffect(() => {
    if (!playing || !atEnd) return;
    const timer = setTimeout(() => setPlaying(false), 0);
    return () => clearTimeout(timer);
  }, [playing, atEnd]);
  const candle = candles[position];
  const change = (candle.close / candles[0].close - 1) * 100;
  const flow = stock.flows
    .filter(
      (f) =>
        ["D1", "D2"].includes(f.brokerCode) &&
        f.date >= cycle.start &&
        f.date <= candle.date,
    )
    .reduce((s, f) => s + f.buyLot - f.sellLot, 0);
  function reset() {
    setPlaying(false);
    setPosition(0);
  }
  return (
    <>
      <PageHeading
        eyebrow="RESEARCH / CYCLE REPLAY"
        title="Rewind the cycle."
        description="Step through an authored price and broker-flow scenario, one demo session at a time."
      />
      <DemoNotice />
      <div className="panel content-gap">
        <div className="replay-controls">
          <label className="field">
            <span>Demo ticker</span>
            <select
              value={ticker}
              onChange={(e) => {
                reset();
                setTicker(e.target.value);
              }}
            >
              {stocks.map((s) => (
                <option key={s.scanner.ticker}>{s.scanner.ticker}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Authored cycle</span>
            <select
              value={cycleId}
              onChange={(e) => {
                reset();
                setCycleId(e.target.value);
              }}
            >
              {stock.cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button primary"
            onClick={() => {
              if (atEnd) setPosition(0);
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
            {playing ? "Pause" : "Play"}
          </button>
          <button className="button" onClick={reset}>
            <RotateCcw size={15} /> Restart
          </button>
          <span
            className="muted"
            style={{ marginLeft: "auto", paddingBottom: 10, fontSize: 12 }}
            aria-live="polite"
          >
            Session {position + 1} / {candles.length}
          </span>
        </div>
        <div className="replay-progress">
          <input
            aria-label="Replay timeline"
            type="range"
            min="0"
            max={candles.length - 1}
            value={position}
            onChange={(e) => {
              setPlaying(false);
              setPosition(Number(e.target.value));
            }}
          />
          <div className="replay-date">
            <span>{cycle.start}</span>
            <strong>{candle.date}</strong>
            <span>{cycle.end}</span>
          </div>
        </div>
      </div>
      <div className="detail-metrics">
        <div className="detail-metric">
          <span>Scenario phase</span>
          <strong>
            <PhaseBadge phase={cycle.phase} />
          </strong>
          <small>Authored label, not an inferred signal</small>
        </div>
        <div className="detail-metric">
          <span>Demo price · IDR</span>
          <strong>{number(candle.close)}</strong>
          <small>{candle.date}</small>
        </div>
        <div className="detail-metric">
          <span>Progress since period start</span>
          <strong className={change >= 0 ? "positive" : "negative"}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </strong>
          <small>Based on visible demo sessions</small>
        </div>
        <div className="detail-metric">
          <span>Cohort broker-flow progress</span>
          <strong className={flow >= 0 ? "positive" : "negative"}>
            {signed(flow)}
          </strong>
          <small>D1 + D2 cumulative net lots</small>
        </div>
      </div>
      <Panel
        title={`${ticker} · Price replay`}
        note="Only candles up to the selected session are displayed"
      >
        <CandleChart candles={visible} />
        <div className="replay-event">
          <h3>{candle.date} · Scenario explanation</h3>
          <p>{cycle.explanation}</p>
          <p>
            {position === 0
              ? "Start of the selected period. All flow totals reset here."
              : `${position + 1} sessions revealed. The fixed demo cohort has ${flow >= 0 ? "net bought" : "net sold"} ${number(Math.abs(flow))} lots so far.`}
          </p>
        </div>
      </Panel>
    </>
  );
}
