import { it, expect, vi } from "vitest";
vi.mock("@/lib/intelligence/extended/service", () => ({
  ownership: vi.fn(),
  phaseInventory: vi.fn(),
  brokerUniverse: vi.fn(async () => ({ rows: [], coverage: 0, total: 962 })),
  market: vi.fn(),
  foreignFlow: vi.fn(),
  envelope: (data: unknown, meta: unknown, coverage: number) => ({
    data,
    meta,
    dataCoverage: coverage,
  }),
  unavailableMeta: { data_status: "UNAVAILABLE" },
}));
vi.mock("@/lib/intelligence/store", () => ({
  listAnalyses: vi.fn(async () => []),
}));
vi.mock("@/lib/intelligence/extended/context-alerts", () => ({
  contextAlerts: vi.fn(async () => []),
}));
import { GET } from "@/app/api/[...intelligence]/route";
import { phaseInventory, ownership } from "./service";
const request = (path: string, query = "") =>
  GET(new Request("http://localhost/api/" + path + query), {
    params: Promise.resolve({ intelligence: path.split("/") }),
  });
it("serves unavailable broker observations without demo fallback", async () => {
  const r = await request("brokers/AI/stocks");
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({ data: [], dataCoverage: 0 });
});
it("rejects invalid dates before provider work", async () => {
  expect(
    (
      await request(
        "stocks/BBCA/broker-inventory-by-phase",
        "?start=2026-02-31",
      )
    ).status,
  ).toBe(400);
  expect(phaseInventory).not.toHaveBeenCalled();
});
it("does not invent entity identity or source routes", async () => {
  const r = await request("entities/unverified/holdings");
  expect((await r.json()).data).toBeNull();
  expect((await request("unverified-provider")).status).toBe(404);
});
it("returns sanitized provider failure", async () => {
  vi.mocked(ownership).mockRejectedValueOnce(
    new Error("secret test must not escape"),
  );
  const r = await request("stocks/BBCA/ownership");
  expect(r.status).toBe(503);
  expect(await r.text()).not.toContain("secret test");
});
