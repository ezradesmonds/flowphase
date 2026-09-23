"use client";
import { useState } from "react";
import type { Metric } from "@/lib/intelligence/extended/model";
export const display = (n: number | null | undefined) =>
  n == null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
export function Value({ metric }: { metric: Metric }) {
  return (
    <span title={JSON.stringify(metric, null, 2)} className="research-value">
      {display(metric.value)}
    </span>
  );
}
export function Evidence({ value }: { value: unknown }) {
  return (
    <details>
      <summary>Source & calculation</summary>
      <pre className="research-json">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
export function exportCSV(rows: Record<string, unknown>[], filename: string) {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))],
    quote = (v: unknown) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
  const blob = new Blob(
    [
      keys.map(quote).join(",") +
        "\r\n" +
        rows.map((r) => keys.map((k) => quote(r[k])).join(",")).join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export function SaveResearch({
  type,
  id,
  label,
}: {
  type: string;
  id: string;
  label: string;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      className="button"
      onClick={() => {
        try {
          const key = "flowphase.research.watchlist.v1",
            items = JSON.parse(localStorage.getItem(key) ?? "[]") as {
              type: string;
              id: string;
              label: string;
            }[];
          if (!items.some((i) => i.id === id && i.type === type))
            items.push({ type, id, label });
          localStorage.setItem(key, JSON.stringify(items));
          setSaved(true);
        } catch {
          setSaved(false);
        }
      }}
    >
      {saved ? "Saved" : "☆ Save " + label}
    </button>
  );
}
