import type { MarketPhase, ScannerResult } from "@/domain/market";
export type SortKey =
  "confidence" | "distributionRisk" | "ticker" | "relativeVolume";
export interface ScannerFilters {
  query: string;
  phase: MarketPhase | "ALL";
  minimumConfidence: number;
  sort: SortKey;
  direction: "asc" | "desc";
}
export const defaultFilters: ScannerFilters = {
  query: "",
  phase: "ALL",
  minimumConfidence: 0,
  sort: "confidence",
  direction: "desc",
};
export function filterScanner(rows: ScannerResult[], filters: ScannerFilters) {
  const query = filters.query.trim().toLowerCase();
  return rows
    .filter(
      (r) =>
        (!query ||
          `${r.ticker} ${r.companyName}`.toLowerCase().includes(query)) &&
        (filters.phase === "ALL" || r.currentPhase === filters.phase) &&
        r.confidence >= filters.minimumConfidence,
    )
    .sort((a, b) => {
      const av = a[filters.sort],
        bv = b[filters.sort];
      if (av === null)
        return bv === null ? a.ticker.localeCompare(b.ticker) : 1;
      if (bv === null) return -1;
      const diff =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return (
        diff * (filters.direction === "asc" ? 1 : -1) ||
        a.ticker.localeCompare(b.ticker)
      );
    });
}
