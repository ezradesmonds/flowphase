"use client";
import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
} from "lightweight-charts";
import type { DailyCandle } from "@/domain/market";
export function CandleChart({ candles }: { candles: DailyCandle[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#04070b" },
        textColor: "#7c8ba1",
        fontFamily: '"IBM Plex Mono", monospace, sans-serif',
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#121a24" },
        horzLines: { color: "#121a24" },
      },
      rightPriceScale: { borderColor: "#1a2636" },
      timeScale: { borderColor: "#1a2636", timeVisible: false },
      crosshair: {
        vertLine: { color: "rgba(0, 229, 255, 0.4)" },
        horzLine: { color: "rgba(0, 229, 255, 0.4)" },
      },
    });
    const price = chart.addSeries(CandlestickSeries, {
      upColor: "#00e676",
      downColor: "#ff3355",
      borderVisible: false,
      wickUpColor: "#00e676",
      wickDownColor: "#ff3355",
    });
    price.setData(
      candles.map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    price
      .priceScale()
      .applyOptions({ scaleMargins: { top: 0.08, bottom: 0.3 } });
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.setData(
      candles.map((c) => ({
        time: c.date,
        value: c.volume,
        color: c.close >= c.open ? "rgba(0, 230, 118, 0.35)" : "rgba(255, 51, 85, 0.35)",
      })),
    );
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles]);
  return (
    <div
      ref={ref}
      className="chart-container"
      role="img"
      aria-label={`Synthetic candlestick and volume chart, ${candles.length} sessions. Drag to pan and scroll to zoom.`}
    />
  );
}
