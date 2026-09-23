import { PHASE_CONFIG } from "@/config/phases";
export const VERSION = "remora-intelligence-3.0.0";
export const RULES = {
  sharesPerLot: PHASE_CONFIG.sharesPerLot,
  liquidityBuffer: 3,
  marketForeignFetchLimit: 10,
  anomalyMultiple: 3,
  minimumBaseline: 5,
  crossingThreshold: 0.9,
};
export type DataStatus =
  "OBSERVED" | "DERIVED" | "ESTIMATED" | "INFERRED" | "UNAVAILABLE";
export interface Meta {
  source: string[];
  as_of: string | null;
  period_start: string | null;
  period_end: string | null;
  calculation_method: string;
  data_status: DataStatus;
  confidence: number;
  quality_flags: string[];
}
export interface Metric extends Meta {
  value: number | null;
}
export function metric(
  value: number | null | undefined,
  meta: Meta,
  method: string,
  status: DataStatus = "DERIVED",
): Metric {
  const valid = typeof value === "number" && Number.isFinite(value);
  return {
    ...meta,
    value: valid ? value : null,
    calculation_method: method,
    data_status: valid ? status : "UNAVAILABLE",
    confidence: valid ? meta.confidence : 0,
  };
}
export function envelope<T>(data: T, meta: Meta, dataCoverage: number) {
  return {
    data,
    asOf: meta.as_of,
    source: meta.source,
    status: meta.data_status,
    dataCoverage,
    confidence: meta.confidence,
    qualityFlags: meta.quality_flags,
    calculationVersion: VERSION,
  };
}
export type AffiliationType =
  | "LOCAL_PRIVATE"
  | "LOCAL_STATE_OWNED_OR_AFFILIATED"
  | "FOREIGN_AFFILIATED"
  | "JOINT_VENTURE"
  | "UNKNOWN";
export interface Affiliation {
  broker_code: string;
  broker_name: string;
  ownership_type: AffiliationType;
  parent_company: string | null;
  country: string | null;
  effective_from: string;
  effective_to: string | null;
  source: string;
  last_verified_at: string;
}
export interface Entity {
  id: string;
  name: string;
  type:
    | "PERSON"
    | "COMPANY"
    | "PUBLIC_COMPANY"
    | "BROKER"
    | "GOVERNMENT_ENTITY"
    | "FUND"
    | "FOUNDATION"
    | "SUBSIDIARY"
    | "PARENT_COMPANY"
    | "BENEFICIAL_OWNER"
    | "UNKNOWN_ENTITY";
  symbol?: string;
}
export interface Relation {
  id: string;
  from: string;
  to: string;
  type:
    | "OWNS"
    | "CONTROLS"
    | "AFFILIATED_WITH"
    | "PARENT_OF"
    | "SUBSIDIARY_OF"
    | "DIRECTOR_OF"
    | "COMMISSIONER_OF"
    | "BENEFICIAL_OWNER_OF"
    | "TRANSACTS_THROUGH"
    | "RELATED_PARTY";
  category:
    | "LEGAL OWNERSHIP"
    | "MANAGEMENT RELATION"
    | "DISCLOSED AFFILIATION"
    | "OBSERVED TRADING FLOW"
    | "INFERRED ASSOCIATION";
  source: string;
  effective_from: string | null;
  effective_to: string | null;
  ownership_percentage: number | null;
  confidence: number;
  verification_status: "PROVIDER_REPORTED" | "VERIFIED" | "INFERRED";
  last_updated_at: string;
}
export function activeRelation(r: Relation, date: string) {
  return (
    r.effective_from !== null &&
    r.effective_from <= date &&
    (!r.effective_to || r.effective_to >= date)
  );
}
/** Traverses explicitly identified legal edges only. Never resolves identity by name. */
export function ownershipPaths(
  relations: Relation[],
  from: string,
  to: string,
  date: string,
) {
  const paths: { ids: string[]; percentage: number | null }[] = [];
  function walk(id: string, seen: string[], percentage: number | null) {
    if (seen.length > 12) return;
    for (const r of relations.filter(
      (r) =>
        r.from === id &&
        r.type === "OWNS" &&
        r.category === "LEGAL OWNERSHIP" &&
        r.verification_status === "VERIFIED" &&
        activeRelation(r, date),
    )) {
      if (seen.includes(r.to)) continue;
      const next =
        percentage === null || r.ownership_percentage === null
          ? null
          : (percentage * r.ownership_percentage) / 100;
      if (r.to === to) paths.push({ ids: [...seen, r.to], percentage: next });
      else walk(r.to, [...seen, r.to], next);
    }
  }
  walk(from, [from], 100);
  return paths;
}
export function ownershipPercent(shares: number | null, total: number | null) {
  return shares !== null &&
    total !== null &&
    shares >= 0 &&
    total > 0 &&
    shares <= total
    ? (shares / total) * 100
    : null;
}
export function positionSize(
  risk: number,
  entry: number,
  stop: number,
  visible: number | null,
  buffer = RULES.liquidityBuffer,
) {
  if (
    ![risk, entry, stop, buffer].every(Number.isFinite) ||
    risk < 0 ||
    entry <= 0 ||
    stop <= 0 ||
    entry === stop ||
    buffer < 1
  )
    throw new Error(
      "Enter positive prices, distinct entry/stop and buffer ≥ 1.",
    );
  const lots = Math.floor(
    risk / Math.max(Math.abs(entry - stop), 1) / RULES.sharesPerLot,
  );
  return {
    positionLot: lots,
    requiredVisibleExitCapacity: lots * buffer,
    exitCoverageRatio:
      visible !== null && visible >= 0 && lots > 0
        ? visible / (lots * buffer)
        : null,
  };
}
/** Only timestamped, sequenced executions qualify. Daily aggregates must never enter this engine. */
export function executionLedger(
  opening: { lots: number; cost: number } | null,
  trades: {
    timestamp: number;
    sequence: number;
    side: "BUY" | "SELL";
    lots: number;
    price: number;
  }[],
  current: number | null,
) {
  if (!opening)
    return {
      remaining: null,
      cost: null,
      realized: null,
      unrealized: null,
      flags: ["UNKNOWN_OPENING"],
    };
  let lots = opening.lots,
    cost = opening.cost,
    realized = 0;
  if (![lots, cost].every((x) => Number.isFinite(x) && x >= 0))
    throw new Error("Invalid opening");
  trades.forEach((t, i) => {
    const prior = trades[i - 1];
    if (
      ![t.timestamp, t.sequence, t.lots, t.price].every(Number.isFinite) ||
      t.lots < 0 ||
      t.price <= 0 ||
      (prior &&
        (t.timestamp < prior.timestamp ||
          (t.timestamp === prior.timestamp && t.sequence <= prior.sequence)))
    )
      throw new Error("Chronological executions required");
    if (t.side === "BUY") {
      if (t.lots > 0) cost = (lots * cost + t.lots * t.price) / (lots + t.lots);
      lots += t.lots;
    } else {
      if (t.lots > lots) throw new Error("Unobserved pre-period inventory");
      realized += t.lots * RULES.sharesPerLot * (t.price - cost);
      lots -= t.lots;
    }
  });
  return {
    remaining: lots,
    cost,
    realized,
    unrealized:
      current !== null && Number.isFinite(current) && current > 0
        ? lots * RULES.sharesPerLot * (current - cost)
        : null,
    flags: ["ESTIMATED_EXCLUDES_FEES_AND_TAX"],
  };
}
