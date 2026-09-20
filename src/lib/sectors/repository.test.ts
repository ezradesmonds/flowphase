import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("./client", () => ({
  sectorsFetch: vi.fn(),
  SectorsError: class extends Error {},
}));
import { sectorsFetch } from "./client";
import { sectorsRepository } from "../repositories/sectors-repository";
const fetcher = vi.mocked(sectorsFetch);
beforeEach(() => {
  fetcher.mockReset();
});
const page = (field: string) => ({
  results: [
    {
      symbol: "AAAA.JK",
      company_name: "Provider company",
      query_values: { [field]: field === "sector" ? "Energy" : "Oil & Gas" },
    },
  ],
  pagination: { offset: 0, total_count: 1, has_next: false, next_offset: null },
});
it("retains provider identity when optional enrichment is unavailable", async () => {
  fetcher.mockImplementation(async (path) => {
    if (path.includes("order_by=sub_sector")) return page("sub_sector");
    throw new Error("Unavailable");
  });
  const result = await sectorsRepository.listStocks();
  expect(result.stocks[0]).toMatchObject({
    ticker: "AAAA",
    companyName: "Provider company",
    sector: null,
    freeFloat: null,
    source: "SECTORS",
  });
  expect(result.warnings).toHaveLength(2);
});
it("does not fall back to fixtures when the universe fails", async () => {
  fetcher.mockRejectedValue(new Error("Quota"));
  await expect(sectorsRepository.listStocks()).rejects.toThrow("Quota");
});
it("joins enrichment by ticker and preserves zero", async () => {
  fetcher.mockImplementation(async (path) =>
    path.startsWith("/free-float/")
      ? [{ symbol: "AAAA.JK", free_float: 0 }]
      : page(path.includes("order_by=sub_sector") ? "sub_sector" : "sector"),
  );
  const result = await sectorsRepository.listStocks();
  expect(result.stocks[0]).toMatchObject({
    sector: "Energy",
    subsector: "Oil & Gas",
    freeFloat: 0,
  });
});
it("reports malformed or mismatched broker data as unavailable", async () => {
  fetcher.mockResolvedValue({
    symbol: "BBBB",
    start: "2026-09-01",
    end: "2026-09-14",
    data: [],
  });
  const result = await sectorsRepository.brokerFlow("AAAA");
  expect(result.flows).toEqual([]);
  expect(result.unavailableReason).not.toBeNull();
});
