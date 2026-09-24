import { describe, expect, it } from "vitest";
import { buildRadarCandidates } from "./radar";

const stocks = [
  { ticker: "BBCA", companyName: "Bank Central Asia", sector: "Financials", subsector: "Banks", freeFloat: 0.45, source: "SECTORS" as const },
  { ticker: "GOTO", companyName: "GoTo", sector: "Technology", subsector: "Internet", freeFloat: 0.7, source: "SECTORS" as const },
];

describe("buildRadarCandidates", () => {
  it("prioritizes independent discovery triggers without opaque weighting", () => {
    const rows = buildRadarCandidates(
      stocks,
      [{ ticker: "BBCA", companyName: "BCA", change: 0.04, close: 10000, date: "2026-09-23", side: "GAINER", rank: 5 }],
      [
        { ticker: "GOTO", companyName: "GoTo", volume: 10, price: 80, date: "2026-09-23", rank: 1 },
        { ticker: "BBCA", companyName: "BCA", volume: 8, price: 10000, date: "2026-09-23", rank: 7 },
      ],
    );
    expect(rows.map((row) => row.ticker)).toEqual(["BBCA", "GOTO"]);
    expect(rows[0].discoveryStrength).toBe(2);
    expect(rows[0].triggers).toHaveLength(2);
  });

  it("does not combine discovery triggers from different sessions", () => {
    const rows = buildRadarCandidates(
      stocks,
      [{ ticker: "BBCA", companyName: "BCA", change: 0.04, close: 10000, date: "2026-09-23", side: "GAINER", rank: 1 }],
      [{ ticker: "BBCA", companyName: "BCA", volume: 10, price: 10000, date: "2026-09-24", rank: 2 }],
    );
    expect(rows[0].marketDate).toBe("2026-09-24");
    expect(rows[0].discoveryStrength).toBe(1);
    expect(rows[0].triggers.map((item) => item.type)).toEqual(["MOST_TRADED"]);
  });

  it("drops ranking symbols that are not in the verified Sectors universe", () => {
    const rows = buildRadarCandidates(
      stocks,
      [{ ticker: "XXXX", companyName: "Unknown", change: 1, close: 1, date: "2026-09-23", side: "GAINER", rank: 1 }],
      [],
    );
    expect(rows).toEqual([]);
  });
});
