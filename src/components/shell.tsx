"use client";

import { SourceStatus } from "./source-status";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ArrowUpRight,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard, shortcut: "F1" },
  { href: "/scanner", label: "Market Scanner", icon: ScanLine, shortcut: "F2" },
  {
    href: "/stocks",
    label: "Stock Analysis",
    icon: TrendingUp,
    shortcut: "F3",
  },
  { href: "/brokers", label: "Broker Stalker", icon: Users, shortcut: "F4" },
  {
    href: "/ownership",
    label: "Ownership Graph",
    icon: Network,
    shortcut: "F5",
  },
  {
    href: "/sectors",
    label: "Sector Rotation",
    icon: PieChart,
    shortcut: "F6",
  },
  { href: "/alerts", label: "Alerts", icon: Bell, shortcut: "F7" },
  { href: "/watchlist", label: "Watchlist", icon: Star, shortcut: "F8" },
  {
    href: "/data-status",
    label: "Data Status",
    icon: ShieldCheck,
    shortcut: "F9",
  },
];

function getIdxMarketStatus() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  const day = wib.getDay();
  if (day === 0 || day === 6) return { isOpen: false, label: "IDX Closed" };
  const hour = wib.getHours();
  const minute = wib.getMinutes();
  const timeNum = hour * 100 + minute;
  const isFriday = day === 5;
  const session1End = isFriday ? 1130 : 1200;
  const inSession1 = timeNum >= 900 && timeNum < session1End;
  const inSession2 = timeNum >= 1330 && timeNum < 1600;
  return inSession1 || inSession2
    ? { isOpen: true, label: "IDX Open" }
    : { isOpen: false, label: "IDX Closed" };
}

export function Shell({
  children,
  demo = false,
}: {
  children: React.ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [marketStatus, setMarketStatus] = useState({
    isOpen: false,
    label: "IDX Closed",
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      setMarketStatus(getIdxMarketStatus());
    });
    const interval = setInterval(() => {
      setMarketStatus(getIdxMarketStatus());
    }, 60000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("flowphase-theme");
    const preferred = saved === "dark" || saved === "light" ? saved : "dark";
    document.documentElement.dataset.theme = preferred;
    const frame = window.requestAnimationFrame(() => {
      setTheme(preferred);
      window.dispatchEvent(
        new CustomEvent("flowphase-theme", { detail: preferred }),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMobileOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("flowphase-theme", next);
    window.dispatchEvent(new CustomEvent("flowphase-theme", { detail: next }));
    setTheme(next);
  };

  return (
    <div
      className={`app-shell visual-workspace ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Modern Slim Sticky Top Bar */}
      <header className="sticky top-0 z-40 w-full h-13 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between gap-3">
        {/* Left: Hamburger (mobile), Logo & Slogan */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 36 36"
                width="20"
                height="20"
                aria-hidden="true"
                className="text-white"
              >
                <path
                  d="M3 3h13L9 10 3 8zm17 0h13v5l-6 2zM3 12l6 2 5 5-8 9H3zm30 0v16h-3l-8-9 5-5zM12 11l6-7 6 7-6 6zm-2 19 8-9 8 9-8-3z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-blue-400 transition-colors">
                FlowPhase
              </span>
              <span className="text-[10px] text-slate-400 -mt-0.5 tracking-tight">
                Market Intelligence
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Global Search */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-6">
          <StockSearch />
        </div>

        {/* Right: IDX Status, Last Update, Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* IDX Market Status Badge */}
          {mounted && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                marketStatus.isOpen
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-400"
              }`}
              title={
                marketStatus.isOpen
                  ? "Bursa IDX sedang buka (WIB)"
                  : "Bursa IDX sedang tutup (WIB)"
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  marketStatus.isOpen
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-slate-500"
                }`}
              />
              <span>{marketStatus.label}</span>
            </div>
          )}

          {/* Data Providers Badge */}
          <div className="hidden lg:flex items-center text-[11px] text-slate-400 px-2.5 py-0.5 rounded border border-slate-800 bg-slate-900/40">
            <span>Sectors API · TradingView</span>
          </div>

          {/* Alerts Notification */}
          <Link
            href="/alerts"
            className="relative p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            aria-label="Notifikasi & Alerts"
            title="Buka Live Alerts"
          >
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
          </Link>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            aria-label={`Ganti tema (${theme === "dark" ? "Light" : "Dark"})`}
            title={`Ganti tema (${theme === "dark" ? "Light" : "Dark"})`}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Settings */}
          <Link
            href="/settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors hidden sm:inline-flex"
            aria-label="Pengaturan"
            title="Pengaturan"
          >
            <Settings size={15} />
          </Link>

          {/* User Profile Avatar */}
          <Link
            href="/settings"
            className="flex items-center gap-1.5 pl-1.5 py-0.5 pr-2 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            title="Profil Pengguna"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              FP
            </div>
            <ChevronDown size={11} className="text-slate-400 hidden sm:block" />
          </Link>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="shell-body">
        {/* Modern Sidebar (Desktop) */}
        <aside
          className={`hidden md:flex flex-col justify-between border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-sm transition-all duration-200 z-30 shrink-0 sticky top-13 h-[calc(100vh-3.25rem)] ${
            collapsed ? "w-16" : "w-56"
          }`}
        >
          {/* Top navigation links */}
          <div className="p-2 space-y-1 overflow-y-auto">
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
                  title={
                    collapsed ? `${item.label} (${item.shortcut})` : undefined
                  }
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    active
                      ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent"
                  } ${collapsed ? "justify-center px-2" : ""}`}
                >
                  <Icon
                    size={16}
                    className={`shrink-0 transition-colors ${
                      active
                        ? "text-blue-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!collapsed && (
                    <span className="text-[10px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.shortcut}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Bottom collapse button & status */}
          <div className="p-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
              title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            >
              {collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <>
                  <ChevronLeft size={16} />
                  <span>Ciutkan menu</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-64 bg-slate-950 border-r border-slate-800 h-full p-4 flex flex-col justify-between z-10">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                      FP
                    </div>
                    <span className="font-bold text-sm text-white">
                      FlowPhase
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-white"
                  >
                    <X size={18} />
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
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                          active
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                <p>IDX Market Intelligence</p>
                <p className="text-slate-500 mt-1">Sectors & TradingView</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main id="main" className="shell-main">
          <div className="visual-page-content w-full max-w-[1800px] mx-auto flex-1">
            {children}
          </div>

          <footer className="footer mt-12 pt-5 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
            <div className="flex items-center gap-2">
              <strong className="text-slate-300">FLOWPHASE INTELLIGENCE</strong>
              <span className="hidden sm:inline text-slate-400">·</span>
              <span className="text-slate-400">
                Deep connections. Deeper insights.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/methodology"
                className="hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                {demo ? "Demo research" : "Metodologi Riset"}{" "}
                <ArrowUpRight size={12} />
              </Link>
              {!demo && <SourceStatus />}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
