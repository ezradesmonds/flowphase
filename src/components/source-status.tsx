"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
type Status = {
  calculatedAt: string | null;
  price: boolean;
  broker: boolean;
  alerts: number;
};
type TradingViewStatus = {
  state: "checking" | "online" | "unavailable";
  fetchedAt: string | null;
};
export function SourceStatus() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [tradingView, setTradingView] = useState<TradingViewStatus>({
    state: "checking",
    fetchedAt: null,
  });
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/intelligence?status=1", { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
    return () => abort.abort();
  }, [pathname]);
  useEffect(() => {
    const abort = new AbortController();
    const query = new URLSearchParams({
      ticker: "BBCA",
      timeframe: "1D",
      limit: "2",
    });
    fetch(`/api/market/candles?${query}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("TradingView probe failed");
        const body = (await response.json()) as {
          fetchedAt?: string;
          candles?: unknown[];
        };
        if (!body.candles?.length) throw new Error("No TradingView candles");
        setTradingView({
          state: "online",
          fetchedAt: body.fetchedAt ?? null,
        });
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setTradingView({ state: "unavailable", fetchedAt: null });
      });
    return () => abort.abort();
  }, []);
  return (
    <span
      className="market-status"
      title={`TradingView probe: ${tradingView.fetchedAt ?? tradingView.state}. Latest stored analysis: ${status?.calculatedAt ?? "none"}. Realtime entitlement and exchange delay remain unknown.`}
    >
      TV: {tradingView.state}
      {status?.price ? " + snapshot" : ""} · Sectors:{" "}
      {status?.broker ? "reported" : "unavailable"} ·{" "}
      <Link href="/alerts">{status?.alerts ?? "—"} alerts</Link>
    </span>
  );
}
