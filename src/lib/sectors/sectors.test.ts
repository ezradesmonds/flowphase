import { describe, expect, it, vi } from "vitest";
import { loadAllCompanies } from "./universe";
import { brokerSchema, freeFloatSchema, sectorSymbol } from "./schemas";
const row = (symbol: string) => ({
  symbol: `${symbol}.JK`,
  company_name: `Test ${symbol}`,
  query_values: { sector: "Test sector", sub_sector: "Test subsector" },
});
const page = (
  symbols: string[],
  offset: number,
  total: number,
  next: number | null,
) => ({
  results: symbols.map(row),
  pagination: {
    offset,
    total_count: total,
    has_next: next !== null,
    next_offset: next,
  },
});
describe("Sectors universe", () => {
  it("loads every page and uses provider identities and taxonomy", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(page(["AAAA", "BBBB"], 0, 3, 2))
      .mockResolvedValueOnce(page(["CCCC"], 2, 3, null));
    const result = await loadAllCompanies(fetcher, "sub_sector");
    expect(result.map((s) => s.ticker)).toEqual(["AAAA", "BBBB", "CCCC"]);
    expect(result[0]).toEqual({
      ticker: "AAAA",
      companyName: "Test AAAA",
      sector: "Test sector",
      subsector: "Test subsector",
      freeFloat: null,
      source: "SECTORS",
    });
    expect(fetcher.mock.calls[1][0]).toContain("offset=2");
  });
  it("does not replace a failed page with a truncated or demo universe", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(page(["AAAA"], 0, 2, 1))
      .mockRejectedValueOnce(new Error("Unavailable"));
    await expect(loadAllCompanies(fetcher, "sector")).rejects.toThrow(
      "Unavailable",
    );
  });
  it("rejects repeated offsets, duplicate symbols and incomplete totals", async () => {
    await expect(
      loadAllCompanies(async () => page(["AAAA"], 0, 2, 0), "sector"),
    ).rejects.toThrow("pagination");
    await expect(
      loadAllCompanies(
        async () => page(["AAAA", "AAAA"], 0, 2, null),
        "sector",
      ),
    ).rejects.toThrow("Duplicate");
    await expect(
      loadAllCompanies(async () => page(["AAAA"], 0, 2, null), "sector"),
    ).rejects.toThrow("Incomplete");
  });
  it("preserves missing taxonomy and zero free float distinctly", async () => {
    const stocks = await loadAllCompanies(
      async () => ({
        results: [{ symbol: "AAAA", company_name: "Provider company" }],
        pagination: {
          offset: 0,
          total_count: 1,
          has_next: false,
          next_offset: null,
        },
      }),
      "sector",
    );
    expect(stocks[0].sector).toBeNull();
    expect(stocks[0].subsector).toBeNull();
    expect(
      freeFloatSchema.parse([{ symbol: "AAAA.JK", free_float: 0 }])[0]
        .free_float,
    ).toBe(0);
    expect(
      freeFloatSchema.safeParse([{ symbol: "AAAA", free_float: 12 }]).success,
    ).toBe(false);
    expect(sectorSymbol.safeParse("NYSE:AAAA").success).toBe(false);
  });
  it("validates broker lot units and permits unavailable prices", () => {
    const result = brokerSchema.parse({
      symbol: "AAAA.JK",
      start: "2026-09-01",
      end: "2026-09-14",
      data: [
        {
          date: "2026-09-01",
          summary: [
            {
              broker_code: "AB",
              blot: 0,
              slot: 10,
              bavg_per_share: null,
              bval: 0,
              sval: 10000,
            },
          ],
        },
      ],
    });
    expect(result.data[0].summary[0].blot).toBe(0);
    expect(result.data[0].summary[0].slot).toBe(10);
    expect(result.data[0].summary[0].bavg_per_share).toBeNull();
  });
});
