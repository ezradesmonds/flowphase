"use client";
import { SourceStatus } from "./source-status";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChartCandlestick,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  ListFilter,
  Menu,
  Bell,
  Search,
  X,
  Zap,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", shortcut: "F1", icon: LayoutDashboard },
  { href: "/scanner", label: "Market Scanner", shortcut: "F2", icon: ListFilter },
  { href: "/stocks", label: "Stock Intelligence", shortcut: "F3", icon: ChartCandlestick },
  { href: "/alerts", label: "Alerts", shortcut: "F4", icon: Bell },
  { href: "/methodology", label: "Methodology", shortcut: "F5", icon: BookOpen },
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Activity size={18} strokeWidth={2.5} />
          </span>
          <span className="brand-word">
            Flow<span>Phase</span>
          </span>
          <span className="brand-caption">Market cycle intelligence</span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X size={18} />
        </button>
        <div className="sidebar-label">Navigation</div>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <Link
              key={item.href}
              title={item.label}
              href={item.href}
              aria-current={
                (
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                )
                  ? "page"
                  : undefined
              }
              onClick={() => setMobile(false)}
            >
              <item.icon size={17} strokeWidth={1.8} />
              <code>{item.shortcut}</code>
              <span>{item.label}</span>
              {item.href === "/scanner" && demo && <small>12</small>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <FlaskConical size={16} strokeWidth={1.8} />
            <strong>
              {demo ? "Demo workspace" : "IDX research workspace"}
            </strong>
            <p>
              Explore the method.
              <br />
              Understand the evidence.
            </p>
            <Link href="/methodology">
              Read methodology <ArrowUpRight size={13} />
            </Link>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
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
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
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
