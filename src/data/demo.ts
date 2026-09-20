import type {
  BrokerFlow,
  DailyCandle,
  MarketPhase,
  ScannerResult,
  StockDetail,
} from "@/domain/market";
import { scannerSchema, candleSchema } from "@/domain/schemas";
import { estimateInventory } from "@/lib/ledger";

export const DEMO_NOTICE = "DEMO DATA — NOT LIVE MARKET DATA";
export const DEMO_AS_OF = "2026-08-28T09:00:00Z";
// Fictional scenarios using recognizable ticker labels. These are NOT historical observations.
const seeds: [string, string, string, MarketPhase, number, number, number][] = [
  ["BBCA", "Bank Central Asia", "Financials", "ACCUMULATION", 86, 18, 8900],
  ["TLKM", "Telkom Indonesia", "Infrastructure", "MARKUP", 82, 27, 2900],
  ["ANTM", "Aneka Tambang", "Basic materials", "EUPHORIA", 78, 69, 1800],
  ["BBRI", "Bank Rakyat Indonesia", "Financials", "DISTRIBUTION", 84, 86, 4200],
  ["ASII", "Astra International", "Industrials", "ACCUMULATION", 79, 24, 5100],
  ["GOTO", "GoTo Gojek Tokopedia", "Technology", "MARKDOWN", 75, 78, 65],
  ["BMRI", "Bank Mandiri", "Financials", "MARKUP", 88, 22, 5800],
  ["ICBP", "Indofood CBP", "Consumer staples", "ACCUMULATION", 73, 20, 11000],
  ["DMAS", "Puradelta Lestari", "Real estate", "UNCLASSIFIED", 38, 43, 160],
  [
    "ADRO",
    "Alamtri Resources Indonesia",
    "Energy",
    "DISTRIBUTION",
    76,
    81,
    2200,
  ],
  ["UNVR", "Unilever Indonesia", "Consumer staples", "MARKDOWN", 71, 74, 1700],
  ["INCO", "Vale Indonesia", "Basic materials", "EUPHORIA", 72, 65, 3700],
];
const tradingDates = Array.from(
  { length: 84 },
  (_, i) => new Date(Date.UTC(2026, 5, 8 + i)),
)
  .filter((d) => ![0, 6].includes(d.getUTCDay()))
  .map((d) => d.toISOString().slice(0, 10));
export const demoStocks: StockDetail[] = seeds.map(
  (
    [ticker, companyName, sector, currentPhase, confidence, risk, base],
    index,
  ) => {
    const candles: DailyCandle[] = tradingDates.map((date, i) => {
      const trend =
        i < 20
          ? 0
          : i < 40
            ? (i - 20) * 0.002
            : currentPhase === "MARKDOWN" || currentPhase === "DISTRIBUTION"
              ? 0.04 - (i - 40) * 0.0025
              : currentPhase === "EUPHORIA" || currentPhase === "MARKUP"
                ? 0.04 + (i - 40) * 0.004
                : 0.04;
      const close = Math.round(
        base * (1 + trend + Math.sin(i * 1.7 + index) * 0.008),
      );
      const open = Math.round(close * (1 + Math.sin(i + 2) * 0.006));
      return candleSchema.parse({
        ticker,
        date,
        open,
        close,
        high: Math.ceil(Math.max(open, close) * 1.008),
        low: Math.floor(Math.min(open, close) * 0.992),
        volume: Math.round((1 + ((i * 7 + index) % 13) / 10) * 2500000),
      });
    });
    const flows: BrokerFlow[] = candles.flatMap((c, i) => {
      const net =
        (i < 40
          ? 500 + (i % 5) * 80
          : currentPhase === "DISTRIBUTION" || currentPhase === "MARKDOWN"
            ? -650 - (i % 5) * 100
            : 380 + (i % 5) * 60) *
        (index + 1);
      // Matched counterparties keep total demo market net flow at zero.
      return ["D1", "D2", "D3", "D4"].map((brokerCode, j) => {
        const delta = [
          net,
          Math.round(net * 0.6),
          -net,
          -Math.round(net * 0.6),
        ][j];
        return {
          ticker,
          date: c.date,
          brokerCode,
          buyLot: Math.max(0, delta) + 100,
          sellLot: Math.max(0, -delta) + 100,
        };
      });
    });
    const start = candles[40].date,
      end = candles.at(-1)!.date;
    const inventory = ["D1", "D2", "D3", "D4"].map((code) =>
      estimateInventory(flows, ticker, code, start, end),
    );
    const accumulator = [...inventory].sort(
      (a, b) => b.cumulativeNetLot - a.cumulativeNetLot,
    )[0];
    const distributor = [...inventory].sort(
      (a, b) => a.cumulativeNetLot - b.cumulativeNetLot,
    )[0];
    accumulator.role = "DOMINANT_ACCUMULATOR";
    distributor.role = "DOMINANT_DISTRIBUTOR";
    const cohort = inventory.filter((b) => ["D1", "D2"].includes(b.brokerCode));
    const scanner: ScannerResult = scannerSchema.parse({
      ticker,
      companyName,
      sector,
      currentPhase,
      confidence,
      cycleStart: start,
      cumulativeNetFlow: cohort.reduce((s, b) => s + b.cumulativeNetLot, 0),
      remainingInventoryRatio:
        currentPhase === "UNCLASSIFIED" ? null : cohort[0].remainingRatio,
      relativeVolume:
        currentPhase === "UNCLASSIFIED"
          ? null
          : Number(
              (
                candles.at(-1)!.volume /
                (candles.slice(-21, -1).reduce((s, c) => s + c.volume, 0) / 20)
              ).toFixed(2),
            ),
      distributionRisk: risk,
      lastUpdated: DEMO_AS_OF,
    });
    return {
      scanner,
      candles,
      flows,
      inventory,
      provenance: "DEMO_FIXTURE",
      phase: {
        ticker,
        phase: currentPhase,
        confidence,
        periodStart: start,
        periodEnd: end,
        dataQuality:
          currentPhase === "UNCLASSIFIED" ? "INSUFFICIENT" : "PARTIAL",
        evidence:
          currentPhase === "UNCLASSIFIED"
            ? [
                "This fixture illustrates insufficient evidence for a phase label.",
              ]
            : [
                `The authored scenario illustrates ${currentPhase.toLowerCase()} behavior.`,
                `Demo cohort D1 + D2 has ${scanner.cumulativeNetFlow >= 0 ? "positive" : "negative"} net transaction flow in this period.`,
                "Confidence is an illustrative fixture score, not a calibrated probability.",
              ],
        warnings: [
          "All prices, flows, periods and scores are synthetic demonstration values.",
          "Broker activity is transaction flow, not verified beneficial ownership.",
          "No production phase-detection engine is connected.",
        ],
      },
      cycles: [
        {
          id: "base",
          label: "01 · Base formation",
          start: candles[0].date,
          end: candles[19].date,
          phase: "ACCUMULATION",
          explanation:
            "Authored demo period: a narrow price range and consistent cohort net buying.",
        },
        {
          id: "advance",
          label: "02 · Range expansion",
          start: candles[20].date,
          end: candles[39].date,
          phase: "MARKUP",
          explanation:
            "Authored demo period: price progresses beyond the earlier range.",
        },
        {
          id: "current",
          label: "03 · Current scenario",
          start,
          end,
          phase: currentPhase,
          explanation: `Authored demo period showing ${currentPhase.toLowerCase()}. These boundaries were not detected by an algorithm.`,
        },
      ],
    };
  },
);
