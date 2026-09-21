"use client";
import { SourceStatus } from "./source-status";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Moon,
  Search,
  Sun,
  Zap,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", shortcut: "F1" },
  { href: "/scanner", label: "Market Scanner", shortcut: "F2" },
  { href: "/stocks", label: "Stock Intelligence", shortcut: "F3" },
  { href: "/alerts", label: "Alerts", shortcut: "F4" },
  { href: "/methodology", label: "Methodology", shortcut: "F5" },
];

export function Shell({
  children,
  demo = false,
}: {
  children: React.ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("flowphase-theme");
    const preferred =
      saved === "dark" || saved === "light"
        ? saved
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    document.documentElement.dataset.theme = preferred;
    const frame = window.requestAnimationFrame(() => {
      setTheme(preferred);
      window.dispatchEvent(
        new CustomEvent("flowphase-theme", { detail: preferred }),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("flowphase-theme", next);
    window.dispatchEvent(
      new CustomEvent("flowphase-theme", { detail: next }),
    );
    setTheme(next);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="workspace">
        <nav className="terminal-rail" aria-label="Function navigation">
          <Link href="/" className="terminal-brand">
            <Zap size={11} /> FLOWPHASE
          </Link>
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
              >
                <b>{item.shortcut}</b> {item.label}
              </Link>
            );
          })}
          <span className="terminal-rail-right">IDX · WYCKOFF RESEARCH</span>
        </nav>
        <header className="topbar">
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/scanner?q=${encodeURIComponent(query)}`);
            }}
          >
            <Search size={15} strokeWidth={2} />
            <input
              aria-label="Search stocks"
              placeholder="Search ticker or company…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-status">
            {!demo && <SourceStatus />}
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <span className="demo-badge">
              {demo ? "DEMO" : "LIVE"}
            </span>
            <Link
              href="/settings"
              className="avatar"
              title="Workspace settings"
              aria-label="Workspace settings"
            >
              FP
            </Link>
          </div>
        </header>
        <main id="main">
          {children}
          <footer className="footer">
            <span>
              FlowPhase{" "}
              <span className="muted">/ Explainable market intelligence</span>
            </span>
            <Link href="/methodology">
              {demo ? "Demo research only" : "Market research"} · Not investment
              advice <ArrowUpRight size={11} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
