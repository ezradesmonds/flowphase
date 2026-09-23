export type CapabilityStatus =
  | "VERIFIED_WORKING"
  | "VERIFIED_BUT_LIMITED"
  | "DOCUMENTED_NOT_TESTED"
  | "UNVERIFIED"
  | "UNAVAILABLE"
  | "AUTH_OR_PLAN_BLOCKED";
type Evidence = {
  capability: string;
  status: string;
  httpStatus: number | null;
  recordCount: number;
  fields: Record<string, { present: number; nonNull: number; types: string[] }>;
};
type Definition = {
  id: string;
  endpoint: string | null;
  requiredParams: string;
  resolution: string;
  historicalDepth: string;
  keyFields: string[];
  pagination: string;
  notes: string;
  source: string;
  probe?: string;
  limited?: boolean;
};
const docs = "https://docs.sectors.app/api-references/v2/indonesia/";
const definitions: Definition[] = [
  {
    id: "stockUniverse",
    endpoint: "/companies/",
    requiredParams: "none; diagnostic limit=1, offset=0/1",
    resolution: "current",
    historicalDepth: "Not documented",
    keyFields: ["results[].symbol", "results[].company_name"],
    pagination: "limit <=200, offset, next_offset, has_next",
    probe: "stockUniverse",
    limited: true,
    source: "screener/companies",
    notes: "Two pages only. Provider total is not proof of complete coverage.",
  },
  {
    id: "sectorClassification",
    endpoint: "/company/report/{symbol}/",
    requiredParams: "symbol; sections=overview",
    resolution: "current",
    historicalDepth: "Taxonomy history not established",
    keyFields: ["overview.sector", "overview.sub_sector", "overview.industry"],
    pagination: "none documented",
    probe: "companyReport",
    source: "report/company-report",
    notes: "BBCA only; universe taxonomy enrichment not tested in this run.",
  },
  {
    id: "dailyOhlcv",
    endpoint: "/daily/{symbol}/",
    requiredParams: "symbol; optional start/end",
    resolution: "daily",
    historicalDepth: "90-day maximum request window; retention unknown",
    keyFields: [
      "[].date",
      "[].open",
      "[].high",
      "[].low",
      "[].close",
      "[].volume",
    ],
    pagination: "date windows",
    probe: "dailyOhlcv",
    source: "transaction/daily",
    notes:
      "Volume in shares; nullable O/H/L. Two-week sample is not proof of full historical depth.",
  },
  {
    id: "intradayOhlcv",
    endpoint: null,
    requiredParams: "unknown",
    resolution: "unverified",
    historicalDepth: "unknown",
    keyFields: [],
    pagination: "unknown",
    source: "",
    notes:
      "No documented Sectors intraday endpoint found. TradingView is a separate provider, not verified by this audit.",
  },
  {
    id: "latestPrice",
    endpoint: "/company/report/{symbol}/",
    requiredParams: "symbol; sections=overview",
    resolution: "latest daily close",
    historicalDepth: "current snapshot",
    keyFields: ["overview.last_close_price", "overview.latest_close_date"],
    pagination: "none documented",
    probe: "companyReport",
    limited: true,
    source: "report/company-report",
    notes: "Daily close, not real-time quote.",
  },
  {
    id: "corporateActions",
    endpoint: "/company/corporate-actions/{symbol}/",
    requiredParams: "symbol",
    resolution: "events",
    historicalDepth: "All available history; completeness unknown",
    keyFields: [
      "corporate_actions.stock_split[].date",
      "corporate_actions.dividend[].ex_date",
    ],
    pagination: "none documented",
    probe: "corporateActions",
    limited: true,
    source: "company/corporate-actions",
    notes:
      "Splits, AGM and dividends observed; other action families nullable. Event dates are not freshness.",
  },
  {
    id: "fundamentals",
    endpoint: "/company/report/{symbol}/",
    requiredParams: "symbol; sections=financials",
    resolution: "annual",
    historicalDepth: "Returned years vary by field/company",
    keyFields: [
      "financials.historical_financials[].year",
      "financials.historical_financials[].revenue",
      "financials.historical_financials[].earnings",
    ],
    pagination: "none documented",
    probe: "companyReport",
    limited: true,
    source: "report/company-report",
    notes:
      "Sector-specific fields can be null; quarterly endpoint documented but not tested.",
  },
  {
    id: "brokerSummary",
    endpoint: "/broker-summary/{symbol}/",
    requiredParams: "symbol; optional start/end/broker_code",
    resolution: "broker/day",
    historicalDepth: "14-day maximum request window; retention unknown",
    keyFields: [
      "data[].date",
      "data[].summary[].blot",
      "data[].summary[].slot",
      "data[].summary[].bval",
      "data[].summary[].sval",
      "data[].summary[].bavg_per_share",
      "data[].summary[].savg_per_share",
    ],
    pagination: "date windows",
    probe: "brokerSummary",
    source: "brokers/broker-summary-by-symbol",
    notes:
      "Lots, IDR and per-share prices. Average prices may be null on zero-activity sides; broker is not beneficial owner.",
  },
  {
    id: "historicalBrokerSummary",
    endpoint: "/broker-summary/{symbol}/",
    requiredParams: "symbol; start/end",
    resolution: "broker/day",
    historicalDepth: "Two disjoint 14-calendar-day windows tested",
    keyFields: [
      "data[].date",
      "data[].summary[].blot",
      "data[].summary[].slot",
      "data[].summary[].bval",
      "data[].summary[].sval",
    ],
    pagination: "date windows",
    probe: "historicalBrokerSummary",
    source: "brokers/broker-summary-by-symbol",
    notes:
      "Opening inventory unknown; cumulative net lots are an estimate, not absolute inventory.",
  },
  {
    id: "foreignFlow",
    endpoint: "/foreign-flow/{symbol}/",
    requiredParams: "symbol; optional start/end",
    resolution: "daily",
    historicalDepth: "90-day request window; retention unknown",
    keyFields: [
      "data[].date",
      "data[].foreign_buy_idr",
      "data[].foreign_sell_idr",
      "data[].net_foreign_inflow",
    ],
    pagination: "date windows",
    probe: "foreignFlow",
    source: "brokers/foreign-flow-by-symbol",
    notes:
      "Investor-origin aggregation; not classification by broker nationality.",
  },
  {
    id: "tickTrades",
    endpoint: null,
    requiredParams: "unknown",
    resolution: "unverified",
    historicalDepth: "unknown",
    keyFields: [],
    pagination: "unknown",
    source: "",
    notes:
      "No documented tick endpoint found; keep split-execution and same-second detection disabled.",
  },
  {
    id: "runningTradeAndFrequency",
    endpoint: "/broker-summary/{symbol}/",
    requiredParams: "symbol; optional start/end",
    resolution: "daily counts only",
    historicalDepth: "14-day request window",
    keyFields: ["data[].summary[].bfreq", "data[].summary[].sfreq"],
    pagination: "date windows",
    probe: "brokerSummary",
    limited: true,
    source: "brokers/broker-summary-by-symbol",
    notes:
      "Frequency counts available; running trade, timestamps, aggressor side and unique humans unavailable in these rows.",
  },
  {
    id: "orderBook",
    endpoint: null,
    requiredParams: "unknown",
    resolution: "unverified",
    historicalDepth: "unknown",
    keyFields: [],
    pagination: "unknown",
    source: "",
    notes:
      "No documented endpoint found. UI must show: Order-book data unavailable.",
  },
  {
    id: "orderBookEvents",
    endpoint: null,
    requiredParams: "unknown",
    resolution: "unverified",
    historicalDepth: "unknown",
    keyFields: [],
    pagination: "unknown",
    source: "",
    notes:
      "No order submissions/cancellations endpoint found; no spoofing/reload inference.",
  },
  {
    id: "shareholderCount",
    endpoint: "/company/shareholders-composition/{symbol}/",
    requiredParams: "symbol; optional year",
    resolution: "monthly",
    historicalDepth: "Documented since 2021; current year tested",
    keyFields: [
      "data[].date",
      "data[].numbers_of_shareholders",
      "data[].change_in_shareholders",
    ],
    pagination: "year",
    probe: "ownership",
    source: "company/shareholders-composition",
    notes:
      "Period-end is not publication date; historical availability must be tracked for backtests.",
  },
  {
    id: "ownershipCategory",
    endpoint: "/company/shareholders-composition/{symbol}/",
    requiredParams: "symbol; optional year",
    resolution: "monthly",
    historicalDepth: "Documented since 2021; current year tested",
    keyFields: [
      "data[].date",
      "data[].shares_number",
      "data[].individual_l",
      "data[].individual_f",
      "data[].total_l",
      "data[].total_f",
    ],
    pagination: "year",
    probe: "ownership",
    source: "company/shareholders-composition",
    notes:
      "Local/foreign investor categories. No verified scrip/scripless balance-position feed.",
  },
  {
    id: "freeFloat",
    endpoint: "/free-float/",
    requiredParams: "none; optional one taxonomy filter",
    resolution: "current",
    historicalDepth: "No historical series documented",
    keyFields: ["[].free_float"],
    pagination: "none documented",
    source: "screener/free-float",
    notes:
      "Not requested: no documented ticker filter; avoid bulk data/credit use. Public ownership percentage is not silently substituted.",
  },
  {
    id: "ipoAllocation",
    endpoint: null,
    requiredParams: "unknown",
    resolution: "unverified",
    historicalDepth: "unknown",
    keyFields: [],
    pagination: "unknown",
    source: "ipo/listing-performance",
    notes:
      "Listing-performance endpoint is documented but does not establish prospectus allocation/subscription fields. IPO allocation model disabled.",
  },
];

/** A successful HTTP response alone must never enable a missing capability. */
export function buildCapabilities(
  results: Evidence[],
  generatedAt: string,
  ticker: string,
) {
  return {
    generatedAt,
    ticker,
    scope: "Point-in-time Phase 1 audit; not a production entitlement cache",
    capabilities: Object.fromEntries(
      definitions.map((definition) => {
        const evidence = results.find(
          (row) => row.capability === definition.probe,
        );
        let status: CapabilityStatus = definition.endpoint
          ? "DOCUMENTED_NOT_TESTED"
          : "UNVERIFIED";
        if (definition.probe && evidence) {
          status = evidence.status as CapabilityStatus;
          if (status.startsWith("VERIFIED")) {
            const available = definition.keyFields.every(
              (key) => (evidence.fields[key]?.nonNull ?? 0) > 0,
            );
            status =
              evidence.httpStatus === 200 &&
              evidence.recordCount > 0 &&
              available &&
              !definition.limited &&
              evidence.status === "VERIFIED_WORKING"
                ? "VERIFIED_WORKING"
                : "VERIFIED_BUT_LIMITED";
          }
        }
        return [
          definition.id,
          {
            ...definition,
            method: definition.endpoint ? "GET" : null,
            source: definition.source
              ? docs + definition.source
              : "https://docs.sectors.app/llms.txt",
            rateLimit:
              "Account quota/RPS unknown; inspect diagnostic attempt headers",
            status,
            evidence: evidence?.capability ?? null,
          },
        ];
      }),
    ),
  };
}
