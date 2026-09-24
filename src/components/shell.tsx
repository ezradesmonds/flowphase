"use client";

import { SourceStatus } from "./source-status";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { StockSearch } from "./stock-search";
import {
  LayoutDashboard,
  ScanLine,
  TrendingUp,
  Users,
  Network,
  PieChart,
  Bell,
  Star,
  ShieldCheck,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ArrowUpRight,
  Terminal,
  Activity,
  Clock,
  Radio,
  Settings,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "OVERVIEW", icon: LayoutDashboard, shortcut: "F1" },
  { href: "/scanner", label: "SCANNER", icon: ScanLine, shortcut: "F2" },
  { href: "/stocks", label: "STOCKS", icon: TrendingUp, shortcut: "F3" },
  { href: "/brokers", label: "BROKER FLOW", icon: Users, shortcut: "F4" },
  { href: "/ownership", label: "OWNERSHIP", icon: Network, shortcut: "F5" },
  { href: "/sectors", label: "SECTORS", icon: PieChart, shortcut: "F6" },
  { href: "/alerts", label: "ALERTS", icon: Bell, shortcut: "F7" },
  { href: "/watchlist", label: "WATCHLIST", icon: Star, shortcut: "F8" },
  { href: "/data-status", label: "DATA STATUS", icon: ShieldCheck, shortcut: "F9" },
];

function getIdxMarketStatus() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  const day = wib.getDay();
  if (day === 0 || day === 6)
    return { isOpen: false, label: "IDX SESSION OFF", session: "WEEKEND" };
  const hour = wib.getHours();
  const minute = wib.getMinutes();
  const timeNum = hour * 100 + minute;
  const isFriday = day === 5;
  const session1End = isFriday ? 1130 : 1200;
  const inSession1 = timeNum >= 900 && timeNum < session1End;
  const inSession2 = timeNum >= 1330 && timeNum < 1600;
  if (inSession1)
    return { isOpen: true, label: "IDX SESSION WINDOW", session: "S1 CLOCK" };
  if (inSession2)
    return { isOpen: true, label: "IDX SESSION WINDOW", session: "S2 CLOCK" };
  if (timeNum >= session1End && timeNum < 1330)
    return { isOpen: false, label: "IDX BREAK WINDOW", session: "INTERMISSION" };
  return { isOpen: false, label: "IDX SESSION OFF", session: "AFTER HOURS" };
}

export function Shell({
  children,
  demo = false,
}: {
  children: React.ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [marketStatus, setMarketStatus] = useState(getIdxMarketStatus());
  const [wibTime, setWibTime] = useState("");

  // Jakarta clock and nominal IDX session windows. This is not an exchange-status feed.
  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wib = new Date(utc + 7 * 3600000);
      setWibTime(
        wib.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
      setMarketStatus(getIdxMarketStatus());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener for institutional Bloomberg Function Keys [F1] - [F9]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid overriding inside form inputs or textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const fKeyMap: Record<string, string> = {
        F1: "/",
        F2: "/scanner",
        F3: "/stocks",
        F4: "/brokers",
        F5: "/ownership",
        F6: "/sectors",
        F7: "/alerts",
        F8: "/watchlist",
        F9: "/data-status",
      };

      if (fKeyMap[e.key]) {
        e.preventDefault();
        router.push(fKeyMap[e.key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Load Saved Theme
  useEffect(() => {
    const saved = window.localStorage.getItem("flowphase-theme");
    const preferred = saved === "dark" || saved === "light" ? saved : "dark";
    document.documentElement.dataset.theme = preferred;
    setTheme(preferred);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("flowphase-theme", next);
    setTheme(next);
  };

  return (
    <div className="app-shell visual-workspace">
      <a className="skip-link" href="#main">
        SKIP TO DATA WORKSPACE [ENTER]
      </a>

      {/* ── 1. DATA-PROVENANCE & IDX SESSION RIBBON ── */}
      <div
        className="terminal-ticker-tape"
        role="region"
        aria-label="Data provenance and IDX session status"
      >
        <div className="terminal-ticker-prefix">
          <Terminal size={12} className="text-amber" />
          <span>FLOWPHASE // IDX RESEARCH</span>
        </div>

        <div className="terminal-ticker-scroll" aria-label="Research data sources">
          <span className="terminal-source-pill">
            <strong>SECTORS</strong> COMPANY · BROKER · OWNERSHIP
          </span>
          <span className="terminal-source-divider">|</span>
          <span className="terminal-source-pill">
            <strong>TRADINGVIEW</strong> PRICE · VOLUME
          </span>
          <span className="terminal-source-divider">|</span>
          <span className="terminal-source-pill">
            <strong>SIGNALS</strong> ON-DEMAND · CACHED · EXPLAINABLE
          </span>
        </div>

        <div className="terminal-ticker-status">
          {mounted && (
            <div className="flex items-center gap-1.5 font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  marketStatus.isOpen ? "bg-emerald-400" : "bg-slate-500"
                }`}
              />
              <span className={marketStatus.isOpen ? "text-emerald-400 font-bold" : "text-slate-400 font-medium"}>
                {marketStatus.label}
              </span>
              <span className="text-slate-500 text-[9px]">({marketStatus.session})</span>
            </div>
          )}
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-300 font-mono text-[10px]" title="Jakarta Time (WIB UTC+7)">
            <Clock size={11} className="text-amber" />
            <span>{wibTime || "09:00:00"} WIB</span>
          </div>
        </div>
      </div>

      {/* ── 2. INSTITUTIONAL COMMAND HEADER ── */}
      <header className="shell-header">
        {/* Left: Mobile Toggle & Brand Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            className="md:hidden p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 bg-amber-500 text-black font-black text-xs flex items-center justify-center rounded-sm font-mono shadow-xs">
              FP
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-xs tracking-wider text-white uppercase font-mono group-hover:text-amber-400 transition-colors">
                FLOWPHASE <span className="text-cyan text-[10px] font-normal">// INTELLIGENCE</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Command Search Bar */}
        <div className="flex-1 max-w-xl mx-2">
          <StockSearch />
        </div>

        {/* Right: Telemetry & Actions */}
        <div className="flex items-center gap-2 shrink-0 font-mono">
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
            <span className="text-emerald-400">●</span>
            <span>SECTORS API</span>
            <span className="text-slate-600">·</span>
            <span className="text-cyan">TV DATA</span>
          </div>

          <Link
            href="/alerts"
            className="p-1.5 rounded-xs border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-white transition-colors relative"
            title="Active Intelligence Alerts [F7]"
          >
            <Bell size={13} />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-xs border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            title={`Toggle Workstation Mode (${theme === "dark" ? "High-Contrast Light" : "Dark Terminal"})`}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          <Link
            href="/settings"
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xs border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-300 text-[10px] transition-colors"
            title="Terminal Settings"
          >
            <Settings size={12} className="text-slate-400" />
            <span className="font-semibold text-amber">USR // IDX</span>
          </Link>
        </div>
      </header>

      {/* ── 3. WORKSTATION MAIN CONTAINER ── */}
      <div className="shell-body">
        {/* Desktop Technical Function Rail / Sidebar */}
        <aside
          className={`hidden md:flex flex-col justify-between border-r border-slate-800 bg-slate-950 transition-all duration-150 z-30 shrink-0 ${
            collapsed ? "w-13" : "w-52"
          }`}
        >
          <div className="p-1.5 space-y-0.5">
            <div className="px-2 py-1 mb-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center justify-between">
              {!collapsed && <span>FUNCTION MODULES</span>}
              <span className="text-slate-600">[F1-F9]</span>
            </div>

            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? `${item.label} [${item.shortcut}]` : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xs text-[11px] font-mono transition-all ${
                    active
                      ? "bg-slate-900 text-amber border-l-2 border-amber border-y border-r border-slate-800 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                  } ${collapsed ? "justify-center px-1" : ""}`}
                >
                  <Icon
                    size={14}
                    className={`shrink-0 ${
                      active ? "text-amber" : "text-slate-400 group-hover:text-slate-300"
                    }`}
                  />
                  {!collapsed && <span className="truncate flex-1 font-semibold">{item.label}</span>}
                  {!collapsed && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded-xs border ${
                        active
                          ? "bg-amber-950/40 text-amber border-amber-800/60"
                          : "bg-slate-900 text-slate-500 border-slate-800"
                      }`}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Bottom rail toggle */}
          <div className="p-1.5 border-t border-slate-800 bg-slate-950">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-xs text-[10px] font-mono text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight size={13} />
              ) : (
                <>
                  <ChevronLeft size={13} />
                  <span>COLLAPSE RAIL</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/80"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-64 bg-slate-950 border-r border-slate-800 h-full p-3 flex flex-col justify-between z-10 font-mono">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-amber-500 text-black font-bold text-xs flex items-center justify-center">
                      FP
                    </div>
                    <span className="font-bold text-xs text-white">
                      FLOWPHASE TERMINAL
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xs text-xs transition-colors ${
                          active
                            ? "bg-amber-500 text-black font-bold"
                            : "text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={14} />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[10px] opacity-75">{item.shortcut}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400">
                <p>IDX Market Intelligence v2.6</p>
                <p className="text-slate-500">Sectors & TradingView Engine</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Workstation Screen */}
        <main id="main" className="shell-main flex-1 overflow-x-hidden">
          <div className="visual-page-content w-full max-w-[1920px] mx-auto flex-1">
            {children}
          </div>

          <footer className="terminal-footer mt-8">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-amber font-bold">FLOWPHASE INTELLIGENCE</span>
              <span className="text-slate-600">//</span>
              <span className="text-slate-400">INSTITUTIONAL MARKET RESEARCH WORKSTATION</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <Link
                href="/methodology"
                className="hover:text-amber transition-colors flex items-center gap-1"
              >
                {demo ? "METHODOLOGY & AUDIT" : "METODOLOGI RISET"}{" "}
                <ArrowUpRight size={10} />
              </Link>
              <span className="text-slate-600">|</span>
              {!demo && <SourceStatus />}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
