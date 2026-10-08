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
  Terminal,
  ScanLine,
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
        evidenceBasis:
          a.regions.at(-1)?.brokerEvidence ?? "INSUFFICIENT_DATA",
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
      if (CORE_PHASES.some((phase) => phase === a.state)) {
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

  // Top Opportunities and Risks
  const topOpportunities = useMemo(() => {
    const list: {
      title: string;
      item: (typeof enrichedStocks)[0];
      badge: string;
      metric: string;
    }[] = [];

    const accCandidates = enrichedStocks
      .filter((s) => s.phase === "AKUMULASI")
      .sort((a, b) => b.confidence - a.confidence);
    if (accCandidates[0]) {
      list.push({
        title: "Top Accumulation Candidate",
        item: accCandidates[0],
        badge: "AKUMULASI",
        metric: `EVIDENCE ${accCandidates[0].confidence}%`,
      });
    }

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

    const pompomCandidate = enrichedStocks
      .filter((s) => s.phase === "POMPOM")
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (pompomCandidate) {
      list.push({
        title: "Pompom Attention Candidate",
        item: pompomCandidate,
        badge: "POMPOM",
        metric: `EVIDENCE ${pompomCandidate.confidence}%`,
      });
    }

    const distWarning = enrichedStocks
      .filter((s) => s.phase === "DISTRIBUSI" || s.state === "DISTRIBUSI")
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (distWarning) {
      list.push({
        title: "Distribution Risk Warning",
        item: distWarning,
        badge: "DISTRIBUSI",
        metric: `EVIDENCE ${distWarning.confidence}%`,
      });
    }

    const topNetBuy = [...enrichedStocks]
      .filter((s) => (s.instNetLot ?? 0) > 0)
      .sort((a, b) => (b.instNetLot ?? 0) - (a.instNetLot ?? 0))[0];
    if (topNetBuy && !list.some((c) => c.item.ticker === topNetBuy.ticker && c.badge === "FLOW")) {
      list.push({
        title: "Largest Institutional-Associated Net Buy Proxy",
        item: topNetBuy,
        badge: "FLOW",
        metric: `+${num(topNetBuy.instNetLot)} LOT`,
      });
    }

    const topNetSell = [...enrichedStocks]
      .filter((s) => (s.instNetLot ?? 0) < 0)
      .sort((a, b) => (a.instNetLot ?? 0) - (b.instNetLot ?? 0))[0];
    if (topNetSell) {
      list.push({
        title: "Institutional-Associated Net Sell Proxy",
        item: topNetSell,
        badge: "FLOW",
        metric: `${num(topNetSell.instNetLot)} LOT`,
      });
    }

    return list.slice(0, 6);
  }, [enrichedStocks]);

  const candidateStocks = useMemo(() => {
    const sorted = [...enrichedStocks].sort((a, b) => b.confidence - a.confidence);
    return showAllCandidates ? sorted : sorted.slice(0, 6);
  }, [enrichedStocks, showAllCandidates]);

  const sectorsList = useMemo(() => {
    return [
      "ALL",
      ...new Set(enrichedStocks.map((s) => s.sector).filter(Boolean)),
    ];
  }, [enrichedStocks]);

  const scannerRows = useMemo(() => {
    return enrichedStocks.filter((s) => {
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

      if (scannerSearch.trim()) {
        const q = scannerSearch.toLowerCase();
        const matchTicker = s.ticker.toLowerCase().includes(q);
        const matchName = s.companyName.toLowerCase().includes(q);
        if (!matchTicker && !matchName) return false;
      }

      if (scannerSector !== "ALL" && s.sector !== scannerSector) {
        return false;
      }

      return true;
    });
  }, [enrichedStocks, selectedScannerTab, scannerSearch, scannerSector]);

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
        let dominant: string = data.stocks[0]?.phase ?? "AKUMULASI";
        let maxP = 0;
        for (const [p, c] of Object.entries(data.phaseCounts)) {
          if (c > maxP) {
            maxP = c;
            dominant = p;
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

  const avgCoverage = useMemo(() => {
    if (!analyses.length) return 0;
    const sum = analyses.reduce((acc, val) => acc + val.coverage, 0);
    return Math.round((sum / analyses.length) * 100);
  }, [analyses]);

  const lastUpdatedDisplay = useMemo(() => {
    const raw = latestCalculation;
    if (!raw) return "NOT ANALYSED";
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return "UNKNOWN";
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "UNKNOWN";
    }
  }, [latestCalculation]);

  const instTotalNetLot = useMemo(() => {
    return analyses.reduce((sum, a) => {
      const instGroup = a.groups?.find(
        (g) => g.classification === "INSTITUTIONAL_ASSOCIATED",
      );
      return sum + (instGroup?.netLot ?? 0);
    }, 0);
  }, [analyses]);

  const avgRvol = useMemo(() => {
    if (!analyses.length) return 0;
    const sum = analyses.reduce(
      (acc, a) => acc + (a.priceVolume?.relativeVolume ?? 1),
      0,
    );
    return sum / analyses.length;
  }, [analyses]);

  return (
    <div className="space-y-2 font-mono pb-8">
      {/* ── 1. BLOOMBERG TERMINAL HERO TELEMETRY ── */}
      <section className="panel" style={{ borderLeft: "3px solid var(--amber)", marginBottom: 6 }}>
        <div className="p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-amber bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded-xs tracking-wider">
                [IDX MARKET INTELLIGENCE // ANALYTICS WORKSTATION]
              </span>
              <MetricTooltip
                label="DATA PROVENANCE"
                explanation="Verified Sectors API company universe + TradingView market candles. Periodic deterministic cycle models."
              />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight uppercase">
              BROKER-FLOW & MARKET CYCLE COCKPIT
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Explainable phase candidates · Sectors broker/ownership context · TradingView price-volume context.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xs flex items-center gap-2">
              <Building2 size={13} className="text-cyan" />
              <div>
                <span className="text-[9px] text-slate-500 block">TOTAL UNIVERSE</span>
                <span className="font-bold text-white tabular-nums">
                  {universe.total || universe.stocks.length} TICKERS
                </span>
              </div>
            </div>

            <div className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xs flex items-center gap-2">
              <Activity size={13} className="text-amber" />
              <div>
                <span className="text-[9px] text-slate-500 block">ANALYSED COVERAGE</span>
                <span className="font-bold text-amber tabular-nums">
                  {analyses.length} ({avgCoverage}%)
                </span>
              </div>
            </div>

            <div className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xs flex items-center gap-2">
              <ShieldCheck size={13} className="text-green" />
              <div>
                <span className="text-[9px] text-slate-500 block">CALCULATION AS OF</span>
                <span className="font-bold text-white tabular-nums">
                  {lastUpdatedDisplay}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. MODULAR PHASE DISTRIBUTION & TELEMETRY HUD ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Left: Donut Chart Telemetry */}
        <div className="panel lg:col-span-5 flex flex-col justify-between" style={{ marginBottom: 0 }}>
          <div className="panel-heading">
            <div className="panel-title">
              <span>[MOD.01 // PHASE_DISTRIBUTION]</span>
            </div>
            <span className="panel-tag">{analyses.length} ANALYSED</span>
          </div>

          <div className="p-3 my-auto">
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

          <div className="panel-footnote flex items-center justify-between">
            <span>SELECT SEGMENT TO FILTER WORKSTATION SCANNER</span>
            <span className="text-amber">RULE-BASED RESEARCH MODEL</span>
          </div>
        </div>

        {/* Right: 4 Institutional HUD Phase Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DISPLAY_PHASES.map((phase) => {
            const count = phaseCounts[phase] || 0;
            const percentage = analyses.length
              ? Math.round((count / analyses.length) * 100)
              : 0;
            const phaseColor = PHASE_COLORS[phase];
            const isSelected = selectedScannerTab.toUpperCase() === phase;
            const sampleStocks = enrichedStocks.filter((s) => s.phase === phase);
            const sparkPoints = sampleStocks[0]?.sparklineData ?? [];

            let statText = "NO ACTIVE CANDIDATES";
            if (sampleStocks.length > 0) {
              const avgConf =
                sampleStocks.reduce((sum, s) => sum + s.confidence, 0) /
                sampleStocks.length;
              statText = `AVG CONFIDENCE: ${avgConf.toFixed(0)}%`;
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
                className={`hud-card cursor-pointer ${
                  isSelected
                    ? "border-amber bg-slate-900"
                    : "border-slate-800 hover:border-slate-700"
                }`}
                style={{ borderTop: `2px solid ${phaseColor}` }}
              >
                <div className="hud-card-header">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-xs"
                      style={{ backgroundColor: phaseColor }}
                    />
                    <span className="font-bold text-white tracking-wider">
                      {phase}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1 py-0.2 rounded-xs tabular-nums"
                    style={{
                      backgroundColor: `${phaseColor}20`,
                      color: phaseColor,
                    }}
                  >
                    {percentage}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between my-1">
                  <div className="hud-card-value">
                    <span>{count}</span>
                    <small>TICKERS</small>
                  </div>
                  {sparkPoints.length > 0 && (
                    <MiniSparkline
                      data={sparkPoints}
                      width={75}
                      height={20}
                      color={phaseColor}
                    />
                  )}
                </div>

                <div className="hud-card-footer justify-between text-[9.5px]">
                  <span className="text-slate-400">{statText}</span>
                  <ChevronRight size={12} className="text-slate-600" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. MARKET PULSE & TOP OPPORTUNITIES ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Left: Market Pulse */}
        <div className="panel lg:col-span-5 flex flex-col justify-between" style={{ marginBottom: 0 }}>
          <div className="panel-heading">
            <div className="panel-title">
              <Flame size={13} className="text-amber" />
              <span>[MOD.02 // MARKET_PULSE]</span>
            </div>
            <span className="panel-tag">ANALYSED SUBSET</span>
          </div>

          <div className="p-3 space-y-3">
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-xs">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">DOMINANT CYCLE STATE:</span>
                <span
                  className="font-bold text-[10px] px-1.5 py-0.2 rounded-xs uppercase"
                  style={{
                    backgroundColor: `${PHASE_COLORS[dominantPhase.phase]}20`,
                    color: PHASE_COLORS[dominantPhase.phase],
                  }}
                >
                  {dominantPhase.phase} ({dominantPhase.percentage}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {dominantPhase.phase === "AKUMULASI"
                  ? `${dominantPhase.percentage}% of analysed names currently classify as accumulation candidates.`
                  : dominantPhase.phase === "POMPOM"
                    ? `${dominantPhase.percentage}% of analysed names currently classify as attention/participation expansion candidates.`
                    : dominantPhase.phase === "MENGGORENG"
                      ? `${dominantPhase.percentage}% of analysed names currently classify as aggressive markup candidates.`
                      : `${dominantPhase.percentage}% of analysed names currently classify as distribution candidates.`}{" "}
                This describes the acquired subset, not the whole IDX market.
              </p>
            </div>

            <BreadthBar
              advancers={marketBreadth.advancers}
              unchanged={marketBreadth.unchanged}
              decliners={marketBreadth.decliners}
            />

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div className="p-2 bg-slate-950 border border-slate-800 rounded-xs">
                <span className="text-[9.5px] text-slate-500 block">AVG RVOL</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {avgRvol.toFixed(2)}x
                </span>
              </div>
              <div className="p-2 bg-slate-950 border border-slate-800 rounded-xs">
                <span className="text-[9.5px] text-slate-500 block">INSTITUTIONAL PROXY</span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    instTotalNetLot >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {instTotalNetLot >= 0 ? `+${num(instTotalNetLot)}` : num(instTotalNetLot)} LOT
                </span>
              </div>
            </div>
          </div>

          <div className="panel-footnote text-[9.5px]">
            EQUAL-WEIGHT ANALYSED SUBSET // NOT A REALTIME WHOLE-MARKET BREADTH FEED
          </div>
        </div>

        {/* Right: Screen Opportunities Matrix */}
        <div className="panel lg:col-span-7 flex flex-col justify-between" style={{ marginBottom: 0 }}>
          <div className="panel-heading">
            <div className="panel-title">
              <Zap size={13} className="text-cyan" />
              <span>[MOD.03 // CANDIDATE_SIGNALS]</span>
            </div>
            <span className="panel-tag">EVIDENCE-SCORE RANKED</span>
          </div>

          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {!topOpportunities.length ? (
              <div className="col-span-full py-6 text-center text-xs text-slate-500">
                NO ACTIVE SIGNALS DETECTED IN ACQUIRED UNIVERSE.
              </div>
            ) : (
              topOpportunities.map((opp, idx) => {
                const item = opp.item;
                return (
                  <div
                    key={idx}
                    className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9.5px] text-slate-400 uppercase font-bold truncate max-w-[150px]">
                        {opp.title}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1 py-0.2 rounded-xs"
                        style={{
                          backgroundColor: `${PHASE_COLORS[opp.badge] ?? "#64748B"}20`,
                          color: PHASE_COLORS[opp.badge] ?? "#94A3B8",
                        }}
                      >
                        {opp.badge}
                      </span>
                    </div>

                    <div className="flex items-center justify-between my-1">
                      <div>
                        <Link
                          href={`/stocks/${item.ticker}`}
                          className="text-xs font-bold text-cyan hover:text-amber transition-colors flex items-center gap-1"
                        >
                          {item.ticker}
                          <ArrowUpRight size={11} className="text-slate-500" />
                        </Link>
                        <span className="text-[9.5px] text-slate-400 block truncate max-w-[140px]">
                          {item.companyName}
                        </span>
                      </div>
                      <ConfidenceRing value={item.confidence} size={28} strokeWidth={2.5} />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                      <span className="text-amber font-semibold">{opp.metric}</span>
                      <Link
                        href={`/stocks/${item.ticker}`}
                        className="text-cyan hover:text-white font-bold"
                      >
                        ANALYZE →
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="panel-footnote flex items-center justify-between text-[9.5px]">
            <span>AUTOMATED CYCLE DETECTOR</span>
            <Link href="/scanner" className="text-cyan hover:text-amber">
              FULL SCANNER [F2] →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. DENSE INSTITUTIONAL SCANNER TABLE ── */}
      <section className="panel" style={{ marginBottom: 0 }}>
        <div className="panel-heading">
          <div className="panel-title">
            <ScanLine size={13} className="text-amber" />
            <span>[MOD.04 // WORKSTATION_SCANNER_TABLE]</span>
          </div>
          <span className="panel-tag">{scannerRows.length} MATCHES</span>
        </div>

        {/* Filter Bar */}
        <div className="filter-toolbar">
          <div className="flex items-center gap-1 overflow-x-auto">
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
                  className={`terminal-btn ${active ? "active" : ""}`}
                >
                  {tab.toUpperCase()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="text"
              placeholder="FILTER TICKER..."
              value={scannerSearch}
              onChange={(e) => setScannerSearch(e.target.value)}
              className="w-36 text-xs"
            />
            <select
              value={scannerSector}
              onChange={(e) => setScannerSector(e.target.value)}
              className="text-xs"
            >
              {sectorsList.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === "ALL" ? "ALL SECTORS" : sec.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>TICKER</th>
                <th>COMPANY</th>
                <th>LAST (IDR)</th>
                <th className="text-right">CHG %</th>
                <th>PHASE</th>
                <th>EVIDENCE BASIS</th>
                <th>EVID SCORE</th>
                <th>COVERAGE</th>
                <th className="text-right">RVOL</th>
                <th>TOP NET BUYER</th>
                <th>TOP NET SELLER</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {scannerRows.slice(0, 50).map((row) => {
                const phaseColor = PHASE_COLORS[row.phase] ?? "#64748B";
                const hasChange = row.priceReturn !== null;
                const isPos = hasChange && row.priceReturn! > 0;
                const isNeg = hasChange && row.priceReturn! < 0;

                return (
                  <tr key={row.ticker}>
                    <td className="ticker-cell">
                      <Link
                        href={`/stocks/${row.ticker}`}
                        className="text-cyan hover:text-amber font-bold"
                      >
                        {row.ticker}
                      </Link>
                    </td>
                    <td className="text-slate-300 truncate max-w-[160px]">
                      {row.companyName}
                    </td>
                    <td className="tabular-nums font-semibold">
                      {row.currentPrice !== null ? num(row.currentPrice) : "—"}
                    </td>
                    <td className="text-right tabular-nums">
                      {hasChange ? (
                        <span
                          className={`font-bold ${
                            isPos ? "text-green" : isNeg ? "text-red" : "text-slate-400"
                          }`}
                        >
                          {isPos ? "+" : ""}
                          {(row.priceReturn! * 100).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="phase-badge"
                        style={{
                          backgroundColor: `${phaseColor}15`,
                          color: phaseColor,
                          border: `1px solid ${phaseColor}40`,
                        }}
                      >
                        {row.phase}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`evidence-basis-pill ${
                          row.evidenceBasis === "BROKER_SUPPORTED"
                            ? "sectors-backed"
                            : "price-only"
                        }`}
                      >
                        {row.evidenceBasis === "BROKER_SUPPORTED"
                          ? "SECTORS-BACKED"
                          : row.evidenceBasis === "PRICE_VOLUME_ONLY"
                            ? "PRICE-VOLUME ONLY"
                            : "INSUFFICIENT"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-900 border border-slate-800 rounded-xs overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${row.confidence}%`,
                              backgroundColor: phaseColor,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-300 tabular-nums">
                          {row.confidence}%
                        </span>
                      </div>
                    </td>
                    <td className="tabular-nums text-slate-400">
                      {(row.coverage * 100).toFixed(0)}%
                    </td>
                    <td className="text-right tabular-nums font-semibold text-slate-200">
                      {num(row.priceVolume?.relativeVolume, 2)}x
                    </td>
                    <td className="font-bold text-cyan">
                      {row.topBuyer ?? "—"}
                    </td>
                    <td className="font-bold text-red">
                      {row.topSeller ?? "—"}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/stocks/${row.ticker}`}
                        className="terminal-btn text-[9px] py-0.5 px-1.5 text-cyan hover:text-white"
                      >
                        ANALYSIS →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!scannerRows.length && (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-slate-500">
                    NO SECURITIES MATCHING SPECIFIED CRITERIA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel-footnote flex items-center justify-between">
          <span>SHOWING {Math.min(50, scannerRows.length)} OF {scannerRows.length} STOCKS</span>
          <button
            onClick={() => setDataQualityDrawerOpen(true)}
            className="text-cyan hover:text-amber font-semibold"
          >
            DATA QUALITY SPECIFICATION →
          </button>
        </div>
      </section>

      {/* ── 5. SECTOR ROTATION & INSTITUTIONAL BROKER FLOW ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Sector Activity */}
        <div className="panel lg:col-span-6 flex flex-col justify-between" style={{ marginBottom: 0 }}>
          <div className="panel-heading">
            <div className="panel-title">
              <PieChart size={13} className="text-purple" />
              <span>[MOD.05 // SECTOR_ROTATION_HEATMAP]</span>
            </div>
            <Link href="/sectors" className="panel-tag text-cyan">
              EXPAND [F6] →
            </Link>
          </div>

          <div className="p-3">
            <SectorHeatmap
              sectors={sectorHeatmapData}
              onSelectSector={(sec) => {
                setScannerSector(sec);
                const el = document.querySelector("table");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>

          <div className="panel-footnote">
            SECTOR PERFORMANCE & EQUAL-WEIGHT MOMENTUM
          </div>
        </div>

        {/* Institutional Broker Leaderboard */}
        <div className="panel lg:col-span-6 flex flex-col justify-between" style={{ marginBottom: 0 }}>
          <div className="panel-heading">
            <div className="panel-title">
              <TrendingUp size={13} className="text-cyan" />
              <span>[MOD.06 // BROKER_FLOW_LEADERBOARD]</span>
            </div>
            <Link href="/brokers" className="panel-tag text-cyan">
              BROKER STALKER [F4] →
            </Link>
          </div>

          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-xs space-y-1.5">
              <span className="text-[10px] font-bold text-green uppercase tracking-wider block border-b border-slate-900 pb-1">
                TOP NET ACCUMULATORS
              </span>
              {brokerFlowLeaders.topBuyers.map((b) => (
                <Link
                  key={b.brokerCode}
                  href={`/brokers?broker=${b.brokerCode}`}
                  className="flex items-center justify-between text-xs py-0.5 px-1 rounded-xs hover:bg-slate-900 transition-colors"
                >
                  <span className="font-bold text-white">{b.brokerCode}</span>
                  <span className="font-bold text-green tabular-nums">
                    +{num(b.netLot)} LOT
                  </span>
                </Link>
              ))}
              {!brokerFlowLeaders.topBuyers.length && (
                <span className="text-xs text-slate-500">NO DATA</span>
              )}
            </div>

            <div className="p-2 bg-slate-950 border border-slate-800 rounded-xs space-y-1.5">
              <span className="text-[10px] font-bold text-red uppercase tracking-wider block border-b border-slate-900 pb-1">
                TOP NET DISTRIBUTORS
              </span>
              {brokerFlowLeaders.topSellers.map((b) => (
                <Link
                  key={b.brokerCode}
                  href={`/brokers?broker=${b.brokerCode}`}
                  className="flex items-center justify-between text-xs py-0.5 px-1 rounded-xs hover:bg-slate-900 transition-colors"
                >
                  <span className="font-bold text-white">{b.brokerCode}</span>
                  <span className="font-bold text-red tabular-nums">
                    {num(b.netLot)} LOT
                  </span>
                </Link>
              ))}
              {!brokerFlowLeaders.topSellers.length && (
                <span className="text-xs text-slate-500">NO DATA</span>
              )}
            </div>
          </div>

          <div className="panel-footnote flex items-center justify-between">
            <span>INVENTORY DELTA BASED ON OBSERVED LOTS</span>
            <Link href="/institutional-flow" className="text-cyan hover:text-amber">
              BROKER BEHAVIOR MAP →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. SECTOR ROTATION QUADRANT & CURRENT ANALYSIS ALERTS ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        <div className="panel lg:col-span-6 flex flex-col justify-between" style={{ marginBottom: 0 }}>
          <div className="panel-heading">
            <div className="panel-title">
              <span>[MOD.07 // SECTOR_ROTATION_QUADRANT]</span>
            </div>
            <Link href="/sectors" className="panel-tag text-cyan">
              DETAILS →
            </Link>
          </div>

          <div className="p-3">
            <SectorQuadrantChart
              sectors={sectorQuadrantData}
              onSelectSector={(sec) => setScannerSector(sec)}
            />
          </div>

          <div className="panel-footnote">
            X-AXIS: PRICE MOMENTUM // Y-AXIS: RELATIVE VOLUME
          </div>
        </div>

        <div className="panel lg:col-span-6 flex flex-col justify-between" style={{ marginBottom: 0 }}>
          <div className="panel-heading">
            <div className="panel-title">
              <AlertCircle size={13} className="text-amber" />
              <span>[MOD.08 // CURRENT_ANALYSIS_ALERTS]</span>
            </div>
            <Link href="/alerts" className="panel-tag text-amber">
              ALL ({allAlerts.length}) [F7] →
            </Link>
          </div>

          <div className="p-2 space-y-1 max-h-[260px] overflow-y-auto">
            {allAlerts.slice(0, 6).map((al) => {
              const isCrit = al.severity === "CRITICAL";
              return (
                <div
                  key={al.id}
                  onClick={() => setActiveAlert(al)}
                  className="p-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-xs ${
                        isCrit ? "bg-red" : "bg-amber"
                      }`}
                    />
                    <strong className="text-cyan font-bold w-12">{al.ticker}</strong>
                    <span className="text-slate-300 text-[11px] truncate max-w-[200px]">
                      {readable(al.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">
                      {new Date(al.timestamp * 1000).toISOString().slice(5, 10)}
                    </span>
                    <button className="terminal-btn text-[9px] py-0.2 px-1 text-amber">
                      EVIDENCE
                    </button>
                  </div>
                </div>
              );
            })}
            {!allAlerts.length && (
              <div className="py-6 text-center text-xs text-slate-500">
                NO ACTIVE ALERTS RECORDED.
              </div>
            )}
          </div>

          <div className="panel-footnote flex items-center justify-between">
            <span>TRANSPARENT HEURISTIC AUDIT LOG</span>
            <Link href="/methodology" className="text-slate-400 hover:text-white">
              RULE METHODOLOGY →
            </Link>
          </div>
        </div>
      </section>

      {/* ── DETAIL DRAWER FOR ALERT EVIDENCE ── */}
      <DetailDrawer
        isOpen={Boolean(activeAlert)}
        onClose={() => setActiveAlert(null)}
        title={
          activeAlert
            ? `${activeAlert.ticker} // ${readable(activeAlert.type)}`
            : ""
        }
        subtitle="HEURISTIC SIGNAL EVIDENCE & AUDIT LOG"
      >
        {activeAlert && (
          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SEVERITY LEVEL:</span>
                <span
                  className={`font-bold uppercase px-1.5 py-0.2 rounded-xs text-[10px] ${
                    activeAlert.severity === "CRITICAL"
                      ? "bg-red text-black"
                      : "bg-amber text-black"
                  }`}
                >
                  {activeAlert.severity}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">OCCURRED PHASE:</span>
                <span className="font-bold text-white uppercase">
                  {readable(activeAlert.phase)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">MODEL CONFIDENCE:</span>
                <span className="font-bold text-cyan">
                  {activeAlert.confidence}%
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-amber text-xs mb-1.5">
                [HEURISTIC EVIDENCE LOG]
              </h3>
              <ul className="space-y-1 list-disc pl-4 text-slate-300 text-[11px]">
                {activeAlert.evidence.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>

            {activeAlert.warnings.length > 0 && (
              <div>
                <h3 className="font-bold text-red text-xs mb-1.5">
                  [LIMITATIONS & INTERPRETATION]
                </h3>
                <ul className="space-y-1 list-disc pl-4 text-slate-400 text-[11px]">
                  {activeAlert.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              <Link
                href={`/stocks/${activeAlert.ticker}`}
                className="button primary flex-1 py-1 text-center"
              >
                OPEN STOCK ANALYSIS [F3]
              </Link>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* ── DETAIL DRAWER FOR DATA QUALITY AUDIT ── */}
      <DetailDrawer
        isOpen={dataQualityDrawerOpen}
        onClose={() => setDataQualityDrawerOpen(false)}
        title="DATA COVERAGE & INTEGRITY SPECIFICATION"
        subtitle="Institutional data provenance audit"
      >
        <div className="space-y-3 text-xs font-mono">
          <div className="p-3 bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block mb-1">INTEGRATION ARCHITECTURE:</span>
            <p className="text-slate-200 leading-relaxed text-[11px]">
              Daily aggregate transactions sourced via official Sectors API v2 with OHLCV daily bars from TradingView snapshots.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-green text-xs mb-1">
              [AVAILABLE OBSERVABLE FEEDS]
            </h3>
            <ul className="space-y-1 list-disc pl-4 text-slate-300 text-[11px]">
              <li>Daily OHLCV bars with relative volume anomalies.</li>
              <li>Broker summary gross buy/sell lot transactions.</li>
              <li>Sectors verified company metadata & free-float coverage.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-red text-xs mb-1">
              [UNAVAILABLE EXPLICIT LIMITATIONS]
            </h3>
            <ul className="space-y-1 list-disc pl-4 text-slate-400 text-[11px]">
              <li>Millisecond tick-by-tick order execution is not provided by public IDX feeds.</li>
              <li>Orderbook level 2/3 depth not captured in batch daily mode.</li>
              <li>Opening inventory prior to period start is unknown.</li>
            </ul>
          </div>
        </div>
      </DetailDrawer>
    </div>
  );
}
