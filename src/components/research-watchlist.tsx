"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
interface Item {
  type: string;
  id: string;
  label: string;
}
export function ResearchWatchlist() {
  const [items, setItems] = useState<Item[]>([]),
    [filter, setFilter] = useState("");
  useEffect(() => {
    let frame = 0;
    try {
      const raw = JSON.parse(
        localStorage.getItem("flowphase.research.watchlist.v1") ?? "[]",
      );
      if (Array.isArray(raw))
        frame = requestAnimationFrame(() =>
          setItems(
            raw.filter(
              (i) =>
                i &&
                typeof i.type === "string" &&
                typeof i.id === "string" &&
                typeof i.label === "string",
            ),
          ),
        );
    } catch {}
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <section className="panel research-module">
      <h2>Research Watchlist · brokers, owners & sectors</h2>
      <p>
        Stored in this browser. Owner entries preserve disclosure IDs; they are
        not cross-company identity matches.
      </p>
      <label>
        Alert rule contains
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="INVENTORY, OWNERSHIP, SECTOR…"
        />
      </label>
      <button
        onClick={() =>
          localStorage.setItem("flowphase.research.alert-filter.v1", filter)
        }
      >
        Save alert filter
      </button>
      {items.map((i) => (
        <p key={i.type + i.id}>
          {i.type} · {i.label} ·{" "}
          {i.type === "BROKER" ? (
            <Link href={"/brokers?code=" + encodeURIComponent(i.id)}>
              Open broker
            </Link>
          ) : i.type === "SECTOR" ? (
            <Link href="/sectors">Open sectors</Link>
          ) : (
            <Link
              href={
                "/ownership?symbol=" +
                encodeURIComponent(i.id.split(":")[1] ?? "")
              }
            >
              Open disclosure
            </Link>
          )}{" "}
          <button
            onClick={() => {
              const next = items.filter(
                (x) => x.type !== i.type || x.id !== i.id,
              );
              setItems(next);
              localStorage.setItem(
                "flowphase.research.watchlist.v1",
                JSON.stringify(next),
              );
            }}
          >
            Remove
          </button>
        </p>
      ))}
      {!items.length && (
        <p>
          No saved research entities. Use Save in Broker Stalker, Ownership
          Graph or Sector Rotation.
        </p>
      )}
    </section>
  );
}
