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
        background: { type: ColorType.Solid, color: "#121822" },
        textColor: "#929eaf",
        fontFamily: "Arial",
        fontSize: 11,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "#202735" },
        horzLines: { color: "#202735" },
      },
      rightPriceScale: { borderColor: "#303b4e" },
      timeScale: { borderColor: "#303b4e", timeVisible: false },
      crosshair: {
        vertLine: { color: "#6883b2" },
        horzLine: { color: "#6883b2" },
      },
    });
    const price = chart.addSeries(CandlestickSeries, {
      upColor: "#65d3a7",
      downColor: "#f08a91",
      borderVisible: false,
      wickUpColor: "#65d3a7",
      wickDownColor: "#f08a91",
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
        color: c.close >= c.open ? "#284d46" : "#54313e",
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
