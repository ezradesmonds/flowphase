import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/sectors/client", () => ({ sectorsFetch: vi.fn() }));
import { sectorsFetch } from "@/lib/sectors/client";
import { getBrokerHistory } from "./broker-history";
const mock = vi.mocked(sectorsFetch);
beforeEach(() => {
  mock.mockReset();
});
describe("bounded broker history", () => {
  it("uses exactly three disjoint 14-day ranges and preserves units", async () => {
    mock.mockImplementation(async (path) => {
      const url = new URL(path, "https://example.test");
      const start = url.searchParams.get("start")!,
        end = url.searchParams.get("end")!;
      return {
        symbol: "TEST",
        start,
        end,
        data: [
          {
            date: start,
            summary: [
              { broker_code: "AK", blot: 2, slot: 1, bval: 20000, sval: 10000 },
            ],
          },
        ],
      };
    });
    const result = await getBrokerHistory("TEST", "2026-09-18");
    expect(mock).toHaveBeenCalledTimes(3);
    expect(result.start).toBe("2026-08-08");
    expect(result.flows.map((f) => f.date)).toEqual([
      "2026-08-08",
      "2026-08-22",
      "2026-09-05",
    ]);
    expect(result.flows[0].buyLot).toBe(2);
    expect(result.flows[0].buyValue).toBe(20000);
  });
  it("fails closed and stops on an unavailable window without fabricating zero flow", async () => {
    mock.mockRejectedValue(new Error("Unavailable"));
    const result = await getBrokerHistory("TEST", "2026-09-18");
    expect(mock).toHaveBeenCalledTimes(1);
    expect(result.flows).toEqual([]);
    expect(result.unavailableReason).toContain("incomplete");
  });
  it("rejects wrong symbols and out-of-window records", async () => {
    mock.mockResolvedValue({
      symbol: "ELSE",
      start: "2026-09-05",
      end: "2026-09-18",
      data: [],
    });
    expect(
      (await getBrokerHistory("TEST", "2026-09-18")).unavailableReason,
    ).not.toBeNull();
  });
});
