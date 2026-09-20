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
export function SourceStatus() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/intelligence?status=1", { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
    return () => abort.abort();
  }, [pathname]);
  return (
    <span
      className="market-status"
      title={`Latest stored analysis: ${status?.calculatedAt ?? "unavailable"}. Snapshot availability, not a realtime connection check.`}
    >
      TV: {status?.price ? "snapshot" : "unavailable"} · Sectors:{" "}
      {status?.broker ? "reported" : "unavailable"} ·{" "}
      <Link href="/alerts">{status?.alerts ?? "—"} alerts</Link>
    </span>
  );
}
