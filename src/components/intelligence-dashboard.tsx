"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Filter,
  Eye,
  SlidersHorizontal,
  Flame,
  Radio,
  Zap,
  ArrowUpRight,
  ArrowRight,
  Building2,
  PieChart,
} from "lucide-react";
import type { Intelligence, MarketAlert } from "@/domain/intelligence";
import { CORE_PHASES } from "@/domain/intelligence";
import type { StockUniverse, IdxStock } from "@/domain/securities";
import { num, readable, groupLabel } from "@/lib/intelligence/format";
import {
  MiniSparkline,
  ConfidenceRing,
  PhaseDonutChart,
  BreadthBar,
  SectorHeatmap,
  SectorQuadrantChart,
  DetailDrawer,
  MetricTooltip,
  PHASE_COLORS,
} from "./dashboard-primitives";

const DISPLAY_PHASES = [
  "AKUMULASI",
  "POMPOM",
  "MENGGORENG",
  "DISTRIBUSI",
] as const;

export function IntelligenceDashboard({
  universe,
  analyses,
}: {
  universe: StockUniverse;
  analyses: Intelligence[];
}) {
  // Navigation & Drawer states
  const [selectedScannerTab, setSelectedScannerTab] = useState<string>("Semua");
  const [scannerSearch, setScannerSearch] = useState("");
  const [scannerSector, setScannerSector] = useState("ALL");
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [activeAlert, setActiveAlert] = useState<MarketAlert | null>(null);
  const [dataQualityDrawerOpen, setDataQualityDrawerOpen] = useState(false);

  // Lookup map for stock information from Sectors universe
  const stockMap = useMemo(
    () => new Map(universe.stocks.map((s) => [s.ticker, s])),
    [universe.stocks],
  );

  // Derived analyses metrics
  const sufficient = useMemo(
    () =>
      analyses.filter(
        (a) => a.priceVolume?.sufficient && !a.priceVolume.anomaly,
      ),
    [analyses],
  );

  const allAlerts = useMemo(
    () =>
      analyses
        .flatMap((a) => a.alerts)
        .filter((a) => a.status === "NEW")
        .sort((a, b) => b.timestamp - a.timestamp),
    [analyses],
  );

  const latestCalculation = useMemo(
    () =>
      analyses
        .map((a) => a.calculatedAt)
        .sort()
        .at(-1),
    [analyses],
  );

  // Stock price, return, and sparkline helpers
  const enrichedStocks = useMemo(() => {
    return analyses.map((a) => {
      const meta = stockMap.get(a.ticker);
      const candles = a.candles?.candles ?? [];
      const lastCandle = candles.at(-1);
      const prevCandle = candles.at(-2);

      const price = lastCandle ? lastCandle.close : null;
      let priceReturn = a.priceVolume?.priceReturn ?? null;
      if (priceReturn === null && lastCandle && prevCandle && prevCandle.close > 0) {
        priceReturn = (lastCandle.close - prevCandle.close) / prevCandle.close;
      }

      const sparklineData = candles.slice(-20).map((c) => c.close);

      // Top Net Buyer & Seller
      const buyers = a.inventory
        .filter((r) => r.cumulativeNetLot > 0)
        .sort((x, y) => y.cumulativeNetLot - x.cumulativeNetLot);
      const sellers = a.inventory
        .filter((r) => r.cumulativeNetLot < 0)
        .sort((x, y) => x.cumulativeNetLot - y.cumulativeNetLot);

      const topBuyer = buyers[0]?.brokerCode ?? null;
      const topSeller = sellers[0]?.brokerCode ?? null;

      // Top institutional group flow
      const instGroup = a.groups.find(
        (g) => g.classification === "INSTITUTIONAL_ASSOCIATED",
      );
      const retailGroup = a.groups.find(
        (g) => g.classification === "RETAIL_ACCESSIBLE",
      );

      const latestAlert = a.alerts
        .filter((al) => al.status === "NEW")
        .sort((x, y) => y.timestamp - x.timestamp)[0];

      return {
        ...a,
        companyName: meta?.companyName ?? a.ticker,
        sector: meta?.sector ?? "General",
        subsector: meta?.subsector ?? "",
        currentPrice: price,
        priceReturn,
        sparklineData,
        topBuyer,
        topSeller,
        instNetLot: instGroup?.netLot ?? null,
        instNetValue: instGroup?.netValue ?? null,
        retailNetLot: retailGroup?.netLot ?? null,
        latestAlert,
      };
    });
  }, [analyses, stockMap]);

  // Phase distribution counts
  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of CORE_PHASES) counts[p] = 0;
    counts["TRANSITION"] = 0;
    counts["OTHERS"] = 0;

    for (const a of analyses) {
      if (CORE_PHASES.includes(a.state as any)) {
        counts[a.state] = (counts[a.state] || 0) + 1;
      } else if (a.state === "TRANSITION") {
        counts["TRANSITION"] = (counts["TRANSITION"] || 0) + 1;
      } else {
        counts["OTHERS"] = (counts["OTHERS"] || 0) + 1;
      }
    }
    return counts;
  }, [analyses]);

  const donutSlices = useMemo(() => {
    const total = analyses.length || 1;
    return [
      {
        phase: "AKUMULASI",
        label: "Akumulasi",
        count: phaseCounts["AKUMULASI"] || 0,
        percentage: ((phaseCounts["AKUMULASI"] || 0) / total) * 100,
        color: PHASE_COLORS.AKUMULASI,
      },
      {
        phase: "POMPOM",
        label: "Pompom",
        count: phaseCounts["POMPOM"] || 0,
        percentage: ((phaseCounts["POMPOM"] || 0) / total) * 100,
        color: PHASE_COLORS.POMPOM,
      },
      {
        phase: "MENGGORENG",
        label: "Menggoreng",
        count: phaseCounts["MENGGORENG"] || 0,
        percentage: ((phaseCounts["MENGGORENG"] || 0) / total) * 100,
        color: PHASE_COLORS.MENGGORENG,
      },
      {
        phase: "DISTRIBUSI",
        label: "Distribusi",
        count: phaseCounts["DISTRIBUSI"] || 0,
        percentage: ((phaseCounts["DISTRIBUSI"] || 0) / total) * 100,
        color: PHASE_COLORS.DISTRIBUSI,
      },
      {
        phase: "TRANSITION",
        label: "Transition / Lainnya",
        count: (phaseCounts["TRANSITION"] || 0) + (phaseCounts["OTHERS"] || 0),
        percentage:
          (((phaseCounts["TRANSITION"] || 0) + (phaseCounts["OTHERS"] || 0)) /
            total) *
          100,
        color: PHASE_COLORS.TRANSITION,
      },
    ];
  }, [phaseCounts, analyses.length]);

  // Market Breadth
  const marketBreadth = useMemo(() => {
    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;

    for (const s of enrichedStocks) {
      if (s.priceReturn === null) {
        unchanged++;
      } else if (s.priceReturn > 0.001) {
        advancers++;
      } else if (s.priceReturn < -0.001) {
        decliners++;
      } else {
        unchanged++;
      }
    }

    return { advancers, decliners, unchanged };
  }, [enrichedStocks]);

  // Dominant Phase
  const dominantPhase = useMemo(() => {
    let maxPhase = "AKUMULASI";
    let maxCount = -1;
    for (const p of CORE_PHASES) {
      const c = phaseCounts[p] || 0;
      if (c > maxCount) {
        maxCount = c;
        maxPhase = p;
      }
    }
    return {
      phase: maxPhase,
      count: maxCount,
      percentage: analyses.length
        ? Math.round((maxCount / analyses.length) * 100)
        : 0,
    };
  }, [phaseCounts, analyses.length]);

  // Top Opportunities and Risks (Dynamically extracted from actual API stock metrics)
  const topOpportunities = useMemo(() => {
    const list: {
      title: string;
      item: (typeof enrichedStocks)[0];
      badge: string;
      metric: string;
    }[] = [];

    // 1. Highest Confidence Accumulation Candidate
    const accCandidates = enrichedStocks
      .filter((s) => s.phase === "AKUMULASI")
      .sort((a, b) => b.confidence - a.confidence);
    if (accCandidates[0]) {
      list.push({
        title: "Top Accumulation Candidate",
        item: accCandidates[0],
        badge: "AKUMULASI",
        metric: `Confidence ${accCandidates[0].confidence}%`,
      });
    }

    // 2. Highest Relative Volume (RVOL)
    const topRvol = [...enrichedStocks]
      .filter((s) => (s.priceVolume?.relativeVolume ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.priceVolume?.relativeVolume ?? 0) -
          (a.priceVolume?.relativeVolume ?? 0),
      )[0];
    if (topRvol && !list.some((c) => c.item.ticker === topRvol.ticker)) {
      list.push({
        title: "Highest Relative Volume",
        item: topRvol,
        badge: topRvol.phase,
        metric: `RVOL ${num(topRvol.priceVolume?.relativeVolume, 2)}x`,
      });
    }

    // 3. Any Pompom Attention Candidate if present in API
    const pompomCandidate = enrichedStocks
      .filter((s) => s.phase === "POMPOM")
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (pompomCandidate) {
      list.push({
        title: "Pompom Attention Candidate",
        item: pompomCandidate,
        badge: "POMPOM",
        metric: `Confidence ${pompomCandidate.confidence}%`,
      });
    }

    // 4. Any Menggoreng Candidate if present in API
    const gorengCandidate = enrichedStocks
      .filter((s) => s.phase === "MENGGORENG")
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (gorengCandidate) {
      list.push({
        title: "Menggoreng Candidate",
        item: gorengCandidate,
        badge: "MENGGORENG",
        metric: `RVOL ${num(gorengCandidate.priceVolume?.relativeVolume, 2)}x`,
      });
    }

    // 5. Any Distribution Warning if present in API
    const distWarning = enrichedStocks
      .filter((s) => s.phase === "DISTRIBUSI" || s.state === "DISTRIBUSI")
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (distWarning) {
      list.push({
        title: "Distribution Warning",
        item: distWarning,
        badge: "DISTRIBUSI",
        metric: `Confidence ${distWarning.confidence}%`,
      });
    }

    // 6. Largest Institutional Net Buy Flow
    const topNetBuy = [...enrichedStocks]
      .filter((s) => (s.instNetLot ?? 0) > 0)
      .sort((a, b) => (b.instNetLot ?? 0) - (a.instNetLot ?? 0))[0];
    if (topNetBuy && !list.some((c) => c.item.ticker === topNetBuy.ticker && c.badge === "FLOW")) {
      list.push({
        title: "Largest Institutional Net Buy",
        item: topNetBuy,
        badge: "FLOW",
        metric: `+${num(topNetBuy.instNetLot)} lot`,
      });
    }

    // 7. Institutional Net Outflow
    const topNetSell = [...enrichedStocks]
      .filter((s) => (s.instNetLot ?? 0) < 0)
      .sort((a, b) => (a.instNetLot ?? 0) - (b.instNetLot ?? 0))[0];
    if (topNetSell) {
      list.push({
        title: "Institutional Net Outflow",
        item: topNetSell,
        badge: "FLOW",
        metric: `${num(topNetSell.instNetLot)} lot`,
      });
    }

    // 8. Top Price Return Performer
    const topGainer = [...enrichedStocks]
      .filter((s) => s.priceReturn !== null && s.priceReturn > 0)
      .sort((a, b) => (b.priceReturn ?? 0) - (a.priceReturn ?? 0))[0];
    if (topGainer && !list.some((c) => c.item.ticker === topGainer.ticker)) {
      list.push({
        title: "Top Price Performer",
        item: topGainer,
        badge: topGainer.phase,
        metric: `+${((topGainer.priceReturn ?? 0) * 100).toFixed(2)}%`,
      });
    }

    // 9. Secondary High Confidence Accumulation Candidate
    if (accCandidates[1] && !list.some((c) => c.item.ticker === accCandidates[1].ticker)) {
      list.push({
        title: "Strong Accumulation Candidate",
        item: accCandidates[1],
        badge: "AKUMULASI",
        metric: `Confidence ${accCandidates[1].confidence}%`,
      });
    }

    // 10. Most Active Signal Alerts
    const topAlerted = [...enrichedStocks]
      .filter((s) => s.alerts.length > 0)
      .sort((a, b) => b.alerts.length - a.alerts.length)[0];
    if (topAlerted && !list.some((c) => c.item.ticker === topAlerted.ticker)) {
      list.push({
        title: "Most Active Signal Alerts",
        item: topAlerted,
        badge: "ALERT",
        metric: `${topAlerted.alerts.length} sinyal terdeteksi`,
      });
    }

    // Return at most 6 distinct opportunities that actually have API data
    return list.slice(0, 6);
  }, [enrichedStocks]);

  // Candidate stock cards (max 6 initially)
  const candidateStocks = useMemo(() => {
    const sorted = [...enrichedStocks].sort((a, b) => b.confidence - a.confidence);
    return showAllCandidates ? sorted : sorted.slice(0, 6);
  }, [enrichedStocks, showAllCandidates]);

  // Sector list for filter
  const sectorsList = useMemo(() => {
    return [
      "ALL",
      ...new Set(enrichedStocks.map((s) => s.sector).filter(Boolean)),
    ];
  }, [enrichedStocks]);

  // Filtered scanner rows
  const scannerRows = useMemo(() => {
    return enrichedStocks.filter((s) => {
      // Tab filter
      if (selectedScannerTab !== "Semua") {
        if (selectedScannerTab === "Akumulasi" && s.phase !== "AKUMULASI")
          return false;
        if (selectedScannerTab === "Pompom" && s.phase !== "POMPOM")
          return false;
        if (selectedScannerTab === "Menggoreng" && s.phase !== "MENGGORENG")
          return false;
        if (selectedScannerTab === "Distribusi" && s.phase !== "DISTRIBUSI")
          return false;
        if (
          selectedScannerTab === "Transition" &&
          s.phase !== "TRANSITION" &&
          s.state !== "TRANSITION"
        )
          return false;
      }

      // Search query
      if (scannerSearch.trim()) {
        const q = scannerSearch.toLowerCase();
        const matchTicker = s.ticker.toLowerCase().includes(q);
        const matchName = s.companyName.toLowerCase().includes(q);
        if (!matchTicker && !matchName) return false;
      }

      // Sector filter
      if (scannerSector !== "ALL" && s.sector !== scannerSector) {
        return false;
      }

      return true;
    });
  }, [enrichedStocks, selectedScannerTab, scannerSearch, scannerSector]);

  // Sector Heatmap Data (Derived dynamically from actual analysed stocks)
  const sectorHeatmapData = useMemo(() => {
    const map = new Map<
      string,
      {
        stocks: typeof enrichedStocks;
        phaseCounts: Record<string, number>;
        validReturns: number[];
      }
    >();

    for (const s of enrichedStocks) {
      const sec = s.sector || "General";
      const entry = map.get(sec) ?? {
        stocks: [],
        phaseCounts: {},
        validReturns: [],
      };
      entry.stocks.push(s);
      entry.phaseCounts[s.phase] = (entry.phaseCounts[s.phase] || 0) + 1;
      if (s.priceReturn !== null && !isNaN(s.priceReturn)) {
        entry.validReturns.push(s.priceReturn);
      }
      map.set(sec, entry);
    }

    return Array.from(map.entries())
      .map(([sectorName, data]) => {
        const count = data.stocks.length;
        let dominant = data.stocks[0]?.phase ?? "AKUMULASI";
        let maxP = 0;
        for (const [p, c] of Object.entries(data.phaseCounts)) {
          if (c > maxP) {
            maxP = c;
            dominant = p as any;
          }
        }

        const avgChange = data.validReturns.length
          ? data.validReturns.reduce((acc, val) => acc + val, 0) /
            data.validReturns.length
          : null;

        return {
          name: sectorName,
          count,
          dominantPhase: dominant,
          change: avgChange,
          activity: count >= 3 ? ("high" as const) : ("medium" as const),
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [enrichedStocks]);

  // Sector Rotation Quadrant (Calculated purely from real stock returns and relative volume)
  const sectorQuadrantData = useMemo(() => {
    const map = new Map<
      string,
      {
        returns: number[];
        rvols: number[];
        phases: Record<string, number>;
      }
    >();

    for (const s of enrichedStocks) {
      const sec = s.sector || "General";
      const entry = map.get(sec) ?? { returns: [], rvols: [], phases: {} };
      if (s.priceReturn !== null && !isNaN(s.priceReturn)) {
        entry.returns.push(s.priceReturn);
      }
      if (
        s.priceVolume?.relativeVolume !== null &&
        s.priceVolume?.relativeVolume !== undefined &&
        !isNaN(s.priceVolume.relativeVolume)
      ) {
        entry.rvols.push(s.priceVolume.relativeVolume);
      }
      entry.phases[s.phase] = (entry.phases[s.phase] || 0) + 1;
      map.set(sec, entry);
    }

    return Array.from(map.entries()).map(([name, data]) => {
      const avgReturn = data.returns.length
        ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length
        : 0;
      const avgRvol = data.rvols.length
        ? data.rvols.reduce((a, b) => a + b, 0) / data.rvols.length
        : 1;

      let dominantPhase = "AKUMULASI";
      let maxP = 0;
      for (const [p, c] of Object.entries(data.phases)) {
        if (c > maxP) {
          maxP = c;
          dominantPhase = p;
        }
      }

      // Mathematical mapping to [-0.85, 0.85] bounds
      const x = Math.max(-0.85, Math.min(0.85, Number((avgReturn * 10).toFixed(2))));
      const y = Math.max(-0.85, Math.min(0.85, Number(((avgRvol - 1) * 0.5).toFixed(2))));

      return {
        name,
        x,
        y,
        phase: dominantPhase,
      };
    });
  }, [enrichedStocks]);

  // Top broker flows preview
  const brokerFlowLeaders = useMemo(() => {
    const allBrokerMap = new Map<
      string,
      {
        brokerCode: string;
        grossBuy: number;
        grossSell: number;
        netLot: number;
        netValue: number;
        stocks: string[];
      }
    >();

    for (const a of analyses) {
      for (const row of a.inventory) {
        const code = row.brokerCode;
        const current = allBrokerMap.get(code) ?? {
          brokerCode: code,
          grossBuy: 0,
          grossSell: 0,
          netLot: 0,
          netValue: 0,
          stocks: [],
        };

        current.grossBuy += row.grossBuyLot;
        current.grossSell += row.grossSellLot;
        current.netLot += row.cumulativeNetLot;
        current.netValue += row.netValue ?? 0;
        if (!current.stocks.includes(a.ticker)) current.stocks.push(a.ticker);
        allBrokerMap.set(code, current);
      }
    }

    const list = Array.from(allBrokerMap.values());
    const topBuyers = [...list]
      .filter((b) => b.netLot > 0)
      .sort((a, b) => b.netLot - a.netLot)
      .slice(0, 5);

    const topSellers = [...list]
      .filter((b) => b.netLot < 0)
      .sort((a, b) => a.netLot - b.netLot)
      .slice(0, 5);

    return { topBuyers, topSellers };
  }, [analyses]);

  // Average coverage
  const avgCoverage = useMemo(() => {
    if (!analyses.length) return 0;
    const sum = analyses.reduce((acc, val) => acc + val.coverage, 0);
    return Math.round((sum / analyses.length) * 100);
  }, [analyses]);

  // Dynamic last updated time from API
  const lastUpdatedDisplay = useMemo(() => {
    const raw = latestCalculation || universe.fetchedAt;
    if (!raw) return "Terkini";
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return "Terkini";
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Terkini";
    }
  }, [latestCalculation, universe.fetchedAt]);

  // Real institutional aggregate flow
  const instTotalNetLot = useMemo(() => {
    return analyses.reduce((sum, a) => {
      const instGroup = a.groups?.find(
        (g) => g.classification === "INSTITUTIONAL_ASSOCIATED",
      );
      return sum + (instGroup?.netLot ?? 0);
    }, 0);
  }, [analyses]);

  // Average relative volume
  const avgRvol = useMemo(() => {
    if (!analyses.length) return 0;
    const sum = analyses.reduce(
      (acc, a) => acc + (a.priceVolume?.relativeVolume ?? 1),
      0,
    );
    return sum / analyses.length;
  }, [analyses]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO HEADER */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-7 shadow-xl">
        {/* Subtle geometric background wave */}
        <div className="absolute top-0 right-0 -bottom-10 w-96 pointer-events-none opacity-20 overflow-hidden">
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full text-blue-500"
            fill="none"
          >
            <path
              d="M0,100 C150,200 250,0 400,150 L400,400 L0,400 Z"
              fill="currentColor"
            />
            <path
              d="M0,180 C120,240 280,100 400,220"
              stroke="#38BDF8"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Radio size={12} className="animate-pulse text-blue-400" />
                IDX Research Intelligence
              </span>
              {/* Compact Historical Limitation Badge */}
              <MetricTooltip
                label="Historical data"
                explanation="Data IDX agregat harian melalui Sectors API dan TradingView snapshot. Waktu perhitungan batch periodik."
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Market Intelligence
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Lihat fase pasar, arus broker, dan perubahan kepemilikan dalam satu tampilan.
            </p>
          </div>

          {/* Right side compact status badges */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 shadow-sm">
              <Building2 size={16} className="text-blue-400" />
              <div className="text-left">
                <span className="block text-xs font-bold text-white tabular-nums">
                  {universe.total || universe.stocks.length || 0}
                </span>
                <span className="block text-[10px] text-slate-400 -mt-0.5">
                  Saham Terdaftar
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 shadow-sm">
              <Sparkles size={16} className="text-purple-400" />
              <div className="text-left">
                <span className="block text-xs font-bold text-white tabular-nums">
                  {analyses.length}
                </span>
                <span className="block text-[10px] text-slate-400 -mt-0.5">
                  Saham Dianalisis
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 shadow-sm">
              <Activity size={16} className="text-emerald-400" />
              <div className="text-left">
                <span className="block text-xs font-bold text-white tabular-nums">
                  {lastUpdatedDisplay}
                </span>
                <span className="block text-[10px] text-slate-400 -mt-0.5">
                  Waktu Perhitungan
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PHASE OVERVIEW SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Large Donut Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Distribusi Fase Pasar
              </h2>
              <p className="text-xs text-slate-400">
                Proporsi fase dari {analyses.length} emiten yang dianalisis
              </p>
            </div>
            <Link
              href="/scanner"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5 font-medium transition-colors"
            >
              Semua <ChevronRight size={14} />
            </Link>
          </div>

          <div className="my-auto py-2">
            <PhaseDonutChart
              slices={donutSlices}
              total={analyses.length}
              selectedPhase={
                selectedScannerTab !== "Semua"
                  ? selectedScannerTab.toUpperCase()
                  : null
              }
              onSelectPhase={(phase) => {
                const mapTab: Record<string, string> = {
                  AKUMULASI: "Akumulasi",
                  POMPOM: "Pompom",
                  MENGGORENG: "Menggoreng",
                  DISTRIBUSI: "Distribusi",
                };
                setSelectedScannerTab(mapTab[phase] ?? "Semua");
              }}
            />
          </div>

          <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span>Klik segmen untuk memfilter tabel scanner di bawah</span>
            <span className="text-slate-400 font-mono">100% Heuristik</span>
          </div>
        </div>

        {/* Right: 4 Compact Phase Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {DISPLAY_PHASES.map((phase) => {
            const count = phaseCounts[phase] || 0;
            const percentage = analyses.length
              ? Math.round((count / analyses.length) * 100)
              : 0;
            const phaseColor = PHASE_COLORS[phase];
            const isSelected =
              selectedScannerTab.toUpperCase() === phase;

            // Representative sparkline from real leading stock in phase
            const sampleStocks = enrichedStocks.filter((s) => s.phase === phase);
            const sparkPoints = sampleStocks[0]?.sparklineData ?? [];

            // Real analytical metric derived directly from API stock data
            let statText = "Tidak ada emiten aktif";
            if (sampleStocks.length > 0) {
              const avgConf =
                sampleStocks.reduce((sum, s) => sum + s.confidence, 0) /
                sampleStocks.length;
              statText = `Rata-rata confidence: ${avgConf.toFixed(0)}%`;
            }

            return (
              <div
                key={phase}
                onClick={() => {
                  const mapTab: Record<string, string> = {
                    AKUMULASI: "Akumulasi",
                    POMPOM: "Pompom",
                    MENGGORENG: "Menggoreng",
                    DISTRIBUSI: "Distribusi",
                  };
                  setSelectedScannerTab(mapTab[phase] ?? "Semua");
                }}
                className={`group cursor-pointer rounded-xl border p-4.5 transition-all flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? "bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/30"
                    : "bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700"
                }`}
              >
                {/* Top color bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 transition-opacity opacity-75 group-hover:opacity-100"
                  style={{ backgroundColor: phaseColor }}
                />

                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: phaseColor }}
                    />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                      {phase}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md tabular-nums"
                    style={{
                      backgroundColor: `${phaseColor}15`,
                      color: phaseColor,
                    }}
                  >
                    {percentage}%
                  </span>
                </div>

                {count > 0 ? (
                  <>
                    <div className="flex items-baseline justify-between my-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-white tabular-nums">
                          {count}
                        </span>
                        <span className="text-xs text-slate-400">saham</span>
                      </div>
                      {sparkPoints.length > 0 && (
                        <div className="shrink-0">
                          <MiniSparkline
                            data={sparkPoints}
                            width={80}
                            height={24}
                            color={phaseColor}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                      <span className="truncate">{statText}</span>
                      <ArrowRight
                        size={12}
                        className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-1"
                      />
                    </div>
                  </>
                ) : (
                  <div className="py-3 flex flex-col items-center justify-center text-center">
                    <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 mb-1.5">
                      <ShieldCheck size={16} />
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      Belum ada kandidat
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Dalam sampel analisa saat ini
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. MAIN INSIGHT SECTION (TWO COLUMNS) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Market Pulse */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between space-y-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-amber-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Market Pulse
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Sentimen Seketika
              </span>
            </div>

            {/* Dominant Phase Indicator */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400 font-medium">
                  Fase Dominan Saat Ini:
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                  style={{
                    backgroundColor: `${PHASE_COLORS[dominantPhase.phase]}20`,
                    color: PHASE_COLORS[dominantPhase.phase],
                  }}
                >
                  {dominantPhase.phase}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {dominantPhase.phase === "AKUMULASI"
                  ? "Tekanan beli terpantau dominan dengan akumulasi teratur oleh broker institusional pada saham-saham utama."
                  : dominantPhase.phase === "POMPOM"
                    ? "Perhatian pasar dan partisipasi ritel meningkat cepat pada saham yang dianalisis."
                    : dominantPhase.phase === "MENGGORENG"
                      ? "Aktivitas markup agresif dan perputaran volume cepat terdeteksi."
                      : "Tekanan jual dan distribusi inventori mendominasi portofolio pantauan."}
              </p>
            </div>
          </div>

          {/* Market Breadth */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Market Breadth
              </span>
              <span className="text-[11px] text-slate-400">
                Berdasarkan harga terkini
              </span>
            </div>
            <BreadthBar
              advancers={marketBreadth.advancers}
              unchanged={marketBreadth.unchanged}
              decliners={marketBreadth.decliners}
            />
          </div>

          {/* Volume & Foreign Flow Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] text-slate-400 block mb-1">
                Rata-rata RVOL
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-white tabular-nums">
                  {avgRvol.toFixed(2)}
                  x
                </span>
                <span
                  className={`text-[10px] ${
                    avgRvol >= 1.5
                      ? "text-amber-400"
                      : avgRvol >= 0.8
                        ? "text-emerald-400"
                        : "text-slate-400"
                  }`}
                >
                  {avgRvol >= 1.5 ? "Tinggi" : avgRvol >= 0.8 ? "Normal" : "Rendah"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] text-slate-400 block mb-1">
                Arus Institusi Proxy
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-lg font-bold tabular-nums ${
                    instTotalNetLot > 0
                      ? "text-blue-400"
                      : instTotalNetLot < 0
                        ? "text-rose-400"
                        : "text-slate-400"
                  }`}
                >
                  {instTotalNetLot > 0 ? `+${num(instTotalNetLot)}` : num(instTotalNetLot)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {instTotalNetLot >= 0 ? "lot akumulasi" : "lot distribusi"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Top Opportunities & Risks (6 compact cards) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3.5">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-blue-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">
                Top Opportunities & Risks
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Heuristik Confidence Tertinggi
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!topOpportunities.length ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">
                Belum ada indikasi peluang atau risiko pada sampel emiten saat ini.
              </div>
            ) : (
              topOpportunities.map((opp, idx) => {
                const item = opp.item;

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-950/90 transition-all flex flex-col justify-between relative group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[140px]">
                        {opp.title}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{
                          backgroundColor: `${PHASE_COLORS[opp.badge] ?? "#64748B"}20`,
                          color: PHASE_COLORS[opp.badge] ?? "#94A3B8",
                        }}
                      >
                        {opp.badge}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <Link
                            href={`/stocks/${item.ticker}`}
                            className="text-base font-bold text-white hover:text-blue-400 transition-colors flex items-center gap-1"
                          >
                            {item.ticker}
                            <ArrowUpRight size={13} className="text-slate-500" />
                          </Link>
                          <span className="text-[11px] text-slate-400 truncate block max-w-[140px]">
                            {item.companyName}
                          </span>
                        </div>
                        <ConfidenceRing value={item.confidence} size={36} />
                      </div>

                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/60 text-xs">
                        <span className="text-slate-400 text-[11px] font-medium">
                          {opp.metric}
                        </span>
                        <Link
                          href={`/stocks/${item.ticker}`}
                          className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                        >
                          View analysis →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 4. CANDIDATE STOCK CARDS */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Kandidat Saham Pantauan
            </h2>
            <p className="text-xs text-slate-400">
              Emiten dengan indikasi fase terkuat berdasarkan price action dan arus broker
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllCandidates(!showAllCandidates)}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-3 py-1.5 rounded-lg border border-blue-500/30 hover:bg-blue-500/10 transition-colors flex items-center gap-1"
          >
            {showAllCandidates ? "Tampilkan lebih sedikit" : "Lihat semua kandidat"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidateStocks.map((stock) => {
            const hasChange = stock.priceReturn !== null;
            const isPos = hasChange && stock.priceReturn! > 0;
            const isNeg = hasChange && stock.priceReturn! < 0;
            const phaseColor = PHASE_COLORS[stock.phase] ?? "#64748B";

            return (
              <div
                key={stock.ticker}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4.5 hover:border-slate-700 hover:bg-slate-900 transition-all flex flex-col justify-between shadow-xs group"
              >
                <div>
                  {/* Card Header: Ticker, Name, Phase */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/stocks/${stock.ticker}`}
                          className="text-lg font-black text-white hover:text-blue-400 transition-colors tracking-tight"
                        >
                          {stock.ticker}
                        </Link>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                          style={{
                            backgroundColor: `${phaseColor}20`,
                            color: phaseColor,
                          }}
                        >
                          {stock.phase}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 truncate block max-w-[190px] mt-0.5">
                        {stock.companyName}
                      </span>
                    </div>
                    <ConfidenceRing value={stock.confidence} size={40} />
                  </div>

                  {/* Price, Daily Return & Sparkline */}
                  <div className="flex items-center justify-between my-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div>
                      <div className="text-base font-bold text-white tabular-nums">
                        {stock.currentPrice !== null
                          ? `Rp ${num(stock.currentPrice)}`
                          : "Rp —"}
                      </div>
                      {hasChange ? (
                        <span
                          className={`text-xs font-semibold tabular-nums flex items-center gap-0.5 ${
                            isPos
                              ? "text-emerald-400"
                              : isNeg
                                ? "text-rose-400"
                                : "text-slate-400"
                          }`}
                        >
                          {isPos ? "+" : ""}
                          {(stock.priceReturn! * 100).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </div>

                    <div className="shrink-0">
                      <MiniSparkline
                        data={stock.sparklineData}
                        width={90}
                        height={26}
                        positive={isPos}
                      />
                    </div>
                  </div>

                  {/* Flow & RVOL Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 block">
                        Relative Volume
                      </span>
                      <span className="font-semibold text-slate-200 tabular-nums">
                        {num(stock.priceVolume?.relativeVolume, 2)}x
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 block">
                        Top Net Buyer
                      </span>
                      <span className="font-semibold text-blue-400">
                        {stock.topBuyer ? `${stock.topBuyer} (Net Buy)` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Coverage: {(stock.coverage * 100).toFixed(0)}%
                  </span>
                  <Link
                    href={`/stocks/${stock.ticker}`}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    Lihat detail <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. MAIN SCANNER TABLE (STOCK PHASE SCANNER) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Stock Phase Scanner
            </h2>
            <p className="text-xs text-slate-400">
              Filter dan telusuri fase emiten berdasarkan deteksi volume dan akumulasi broker
            </p>
          </div>

          {/* Scanner Controls: Search & Sector filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center h-8 px-2.5 bg-slate-950 border border-slate-800 focus-within:border-blue-500 rounded-lg w-48 transition-colors">
              <Search
                size={13}
                className="text-slate-400 shrink-0 mr-2 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Cari emiten..."
                value={scannerSearch}
                onChange={(e) => setScannerSearch(e.target.value)}
                className="w-full bg-transparent border-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none p-0"
              />
            </div>

            <select
              value={scannerSector}
              onChange={(e) => setScannerSector(e.target.value)}
              className="h-8 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {sectorsList.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === "ALL" ? "Semua Sektor" : sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Phase Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            "Semua",
            "Akumulasi",
            "Pompom",
            "Menggoreng",
            "Distribusi",
            "Transition",
          ].map((tab) => {
            const active = selectedScannerTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedScannerTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  active
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Scanner Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Harga Terakhir</th>
                <th className="py-3 px-4">Perubahan</th>
                <th className="py-3 px-4">Fase</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Coverage</th>
                <th className="py-3 px-4">RVOL</th>
                <th className="py-3 px-4">Top Buyer</th>
                <th className="py-3 px-4">Top Seller</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {scannerRows.map((row) => {
                const phaseColor = PHASE_COLORS[row.phase] ?? "#64748B";
                const hasChange = row.priceReturn !== null;
                const isPos = hasChange && row.priceReturn! > 0;
                const isNeg = hasChange && row.priceReturn! < 0;

                return (
                  <tr
                    key={row.ticker}
                    className="hover:bg-slate-900/80 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/stocks/${row.ticker}`}
                        className="font-bold text-white hover:text-blue-400 transition-colors"
                      >
                        {row.ticker}
                      </Link>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[130px]">
                        {row.companyName}
                      </span>
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-200">
                      {row.currentPrice !== null
                        ? `Rp ${num(row.currentPrice)}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      {hasChange ? (
                        <span
                          className={`font-semibold ${
                            isPos
                              ? "text-emerald-400"
                              : isNeg
                                ? "text-rose-400"
                                : "text-slate-400"
                          }`}
                        >
                          {isPos ? "+" : ""}
                          {(row.priceReturn! * 100).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${phaseColor}20`,
                          color: phaseColor,
                        }}
                      >
                        {row.phase}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${row.confidence}%`,
                              backgroundColor: phaseColor,
                            }}
                          />
                        </div>
                        <span className="text-slate-300 font-mono text-[11px]">
                          {row.confidence}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-400">
                      {(row.coverage * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-slate-200">
                      {num(row.priceVolume?.relativeVolume, 2)}x
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {row.topBuyer ?? "—"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">
                      {row.topSeller ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/stocks/${row.ticker}`}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors inline-block"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!scannerRows.length && (
                <tr>
                  <td
                    colSpan={10}
                    className="py-8 text-center text-slate-500 font-medium"
                  >
                    Tidak ada saham yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. DATA QUALITY SECTION */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Data Coverage & Reliability
                </h2>
                <span className="text-xs font-extrabold text-emerald-400 tabular-nums bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {avgCoverage}%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Integritas data dihitung dari ketersediaan agregat harga, volume, dan transaksi broker
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDataQualityDrawerOpen(true)}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-colors shrink-0"
          >
            Lihat detail batasan data
          </button>
        </div>

        {/* Small Status Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-4 mt-3 border-t border-slate-800/60">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Price-Volume: Available
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Broker Summary: Available
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Frequency: Daily aggregate only
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Tick Data: Unavailable
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Bid-Offer Events: Unavailable
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Narrative Data: Unavailable
          </span>
        </div>
      </section>

      {/* 7 & 8. MARKET VISUALIZATIONS & INSTITUTIONAL FLOW */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sector Heatmap & Activity */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <PieChart size={18} className="text-purple-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">
                Sector Activity Heatmap
              </h2>
            </div>
            <Link
              href="/sectors"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5"
            >
              Rotasi Sektor <ChevronRight size={14} />
            </Link>
          </div>

          <SectorHeatmap
            sectors={sectorHeatmapData}
            onSelectSector={(sec) => {
              setScannerSector(sec);
              const el = document.querySelector("table");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>

        {/* Institutional Flow & Broker Activity Preview */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Institutional Flow & Broker Activity
                </h2>
              </div>
              <Link
                href="/brokers"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5"
              >
                Broker Stalker <ChevronRight size={14} />
              </Link>
            </div>

            {/* Top Net Buyers & Sellers Ranked Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5">
              {/* Net Buyers */}
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Top Net Buyers
                </span>
                {brokerFlowLeaders.topBuyers.map((b) => (
                  <Link
                    key={b.brokerCode}
                    href={`/brokers?broker=${b.brokerCode}`}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">
                        {b.brokerCode}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {b.stocks.join(", ")}
                      </span>
                    </div>
                    <span className="font-semibold text-emerald-400 tabular-nums">
                      +{num(b.netLot)} lot
                    </span>
                  </Link>
                ))}
                {!brokerFlowLeaders.topBuyers.length && (
                  <span className="text-xs text-slate-500">
                    Tidak ada data net buy
                  </span>
                )}
              </div>

              {/* Net Sellers */}
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                  Top Net Sellers
                </span>
                {brokerFlowLeaders.topSellers.map((b) => (
                  <Link
                    key={b.brokerCode}
                    href={`/brokers?broker=${b.brokerCode}`}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">
                        {b.brokerCode}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {b.stocks.join(", ")}
                      </span>
                    </div>
                    <span className="font-semibold text-rose-400 tabular-nums">
                      {num(b.netLot)} lot
                    </span>
                  </Link>
                ))}
                {!brokerFlowLeaders.topSellers.length && (
                  <span className="text-xs text-slate-500">
                    Tidak ada data net sell
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Arus broker berbasis heuristik inventori akumulatif</span>
            <Link
              href="/institutional-flow"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Institutional Flow Map →
            </Link>
          </div>
        </div>
      </section>

      {/* 9 & 10. SECTOR ROTATION QUADRANT & LIVE ALERTS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sector Rotation Quadrant */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Sector Rotation Quadrant
              </h2>
              <p className="text-xs text-slate-400">
                Momentum harga vs Arus volume relatif antar sektor
              </p>
            </div>
            <Link
              href="/sectors"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              Detail Sektor →
            </Link>
          </div>

          <SectorQuadrantChart
            sectors={sectorQuadrantData}
            onSelectSector={(sec) => {
              setScannerSector(sec);
            }}
          />
        </div>

        {/* Live Alerts Panel */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Live Alerts
                </h2>
              </div>
              <Link
                href="/alerts"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Semua Alerts ({allAlerts.length}) →
              </Link>
            </div>

            <div className="space-y-2 mt-3 overflow-y-auto max-h-[250px] pr-1">
              {allAlerts.slice(0, 6).map((al) => {
                const isCrit = al.severity === "CRITICAL";
                const isHigh = al.severity === "HIGH";

                return (
                  <div
                    key={al.id}
                    onClick={() => setActiveAlert(al)}
                    className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/50 hover:bg-slate-950 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isCrit
                            ? "bg-rose-500 animate-pulse"
                            : isHigh
                              ? "bg-amber-400"
                              : "bg-blue-400"
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">
                            {al.ticker}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {readable(al.type)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[240px]">
                          {al.evidence[0] ?? "Indikasi anomali volume & broker"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(al.timestamp * 1000)
                          .toISOString()
                          .slice(5, 10)}
                      </span>
                      <button
                        type="button"
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                      >
                        Bukti
                      </button>
                    </div>
                  </div>
                );
              })}
              {!allAlerts.length && (
                <div className="py-8 text-center text-xs text-slate-500">
                  Tidak ada alert aktif pada sesi analisa saat ini.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Klik alert untuk memeriksa bukti analitis di panel samping</span>
            <Link
              href="/methodology"
              className="text-slate-400 hover:text-white"
            >
              Metodologi Aturan →
            </Link>
          </div>
        </div>
      </section>

      {/* DETAIL DRAWER FOR ALERT EVIDENCE */}
      <DetailDrawer
        isOpen={Boolean(activeAlert)}
        onClose={() => setActiveAlert(null)}
        title={
          activeAlert
            ? `${activeAlert.ticker} · ${readable(activeAlert.type)}`
            : ""
        }
        subtitle="Analisis Bukti Sinyal & Batasan Model"
      >
        {activeAlert && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tingkat Keparahan:</span>
                <span
                  className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                    activeAlert.severity === "CRITICAL"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {activeAlert.severity}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fase Saat Kejadian:</span>
                <span className="font-bold text-white uppercase">
                  {readable(activeAlert.phase)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Confidence Model:</span>
                <span className="font-bold text-blue-400">
                  {activeAlert.confidence}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nilai Terukur vs Baseline:</span>
                <span className="font-mono text-slate-200">
                  {num(activeAlert.actualValue)} / {num(activeAlert.baseline)}
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-200 text-xs mb-2">
                Mengapa Alert Ini Muncul? (Bukti Heuristik)
              </h3>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-300">
                {activeAlert.evidence.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>

            {activeAlert.warnings.length > 0 && (
              <div>
                <h3 className="font-bold text-amber-400 text-xs mb-2">
                  Batasan & Disclaimer
                </h3>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
                  {activeAlert.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
              <Link
                href={`/stocks/${activeAlert.ticker}`}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-center transition-colors"
              >
                Buka Analisis Saham
              </Link>
              <Link
                href={`/stocks/${activeAlert.ticker}#inventory`}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
              >
                Inventori Broker
              </Link>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* DETAIL DRAWER FOR DATA QUALITY */}
      <DetailDrawer
        isOpen={dataQualityDrawerOpen}
        onClose={() => setDataQualityDrawerOpen(false)}
        title="Audit Cakupan & Keterbatasan Data"
        subtitle="Spesifikasi transparansi data Sectors API & TradingView"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-slate-400 block">Status Integrasi:</span>
            <p className="text-slate-200 leading-relaxed">
              Platform menggunakan data resmi agregat harian dari Sectors API v2
              dan candle harga dari TradingView snapshot.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-200 text-xs mb-2">
              Data Yang Tersedia:
            </h3>
            <ul className="space-y-1.5 list-disc pl-4 text-emerald-400">
              <li>
                <strong className="text-slate-200">Price & Volume:</strong> Daily
                OHLCV hingga 500 bar ke belakang.
              </li>
              <li>
                <strong className="text-slate-200">Broker Summary:</strong> Total lot
                beli dan jual per kode broker pada sesi harian yang telah ditutup.
              </li>
              <li>
                <strong className="text-slate-200">Company Metadata:</strong> Sektor,
                subsektor, dan persentase free-float emiten.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-400 text-xs mb-2">
              Batasan Yang Tidak Tersedia (Sengaja Ditampilkan Eksplisit):
            </h3>
            <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
              <li>
                <strong className="text-slate-300">Tick Data:</strong> Eksekusi
                per milidetik tidak disediakan bursa IDX untuk feed publik.
              </li>
              <li>
                <strong className="text-slate-300">Bid-Offer Events:</strong> Antrian
                orderbook level 2/3 tidak tersedia dalam mode batch.
              </li>
              <li>
                <strong className="text-slate-300">Opening Inventory:</strong> Saldo
                awal kepemilikan broker sebelum periode analisa adalah nol atau
                tidak diketahui.
              </li>
            </ul>
          </div>

          <p className="text-[11px] text-slate-500 italic pt-2">
            Prinsip FlowPhase: Nilai 0 berarti terukur nol. Nilai tidak tersedia
            ditampilkan secara eksplisit sebagai data unavailable, bukan nol palsu.
          </p>
        </div>
      </DetailDrawer>
    </div>
  );
}
