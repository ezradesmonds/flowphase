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
} from "lucide-react";
const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scanner", label: "Market Scanner", icon: ListFilter },
  { href: "/stocks", label: "Stock Intelligence", icon: ChartCandlestick },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/methodology", label: "Methodology", icon: BookOpen },
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
            <Activity size={23} />
          </span>
          <span className="brand-word">
            Flow<span>Phase</span>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <div className="sidebar-label">INTELLIGENCE</div>
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
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.href === "/scanner" && demo && <small>12</small>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <FlaskConical size={19} />
            <strong>
              {demo ? "Demo workspace" : "IDX research workspace"}
            </strong>
            <p>
              Explore the method.
              <br />
              Understand the evidence.
            </p>
            <Link href="/methodology">
              Read methodology <ArrowUpRight size={14} />
            </Link>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <>
                <ChevronLeft size={17} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </button>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/scanner?q=${encodeURIComponent(query)}`);
            }}
          >
            <Search size={18} />
            <input
              aria-label="Search stocks"
              placeholder="Search a ticker or company…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-status">
            {!demo && <SourceStatus />}
            <span className="demo-badge">
              {demo ? "DEMO MODE" : "SECTORS + TRADINGVIEW"}
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
              advice <ArrowUpRight size={12} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
