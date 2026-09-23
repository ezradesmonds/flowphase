import { describe, expect, it } from "vitest";
import { inspectPayload, sanitizeSample } from "./audit";
import { normalizeDailyPrices } from "./schemas";
import sample from "../../../docs/sectors-audit/dailyOhlcv.sample.json";
import { buildCapabilities } from "./capabilities";
describe("Sectors audit", () => {
  it("never enables capabilities from empty HTTP 200 payloads or failed auth", () => {
    const row = {
      capability: "dailyOhlcv",
      status: "VERIFIED_WORKING",
      httpStatus: 200,
      recordCount: 0,
      fields: {},
    };
    expect(
      buildCapabilities([row], "now", "BBCA").capabilities.dailyOhlcv.status,
    ).toBe("VERIFIED_BUT_LIMITED");
    expect(
      buildCapabilities(
        [{ ...row, status: "AUTH_OR_PLAN_BLOCKED", httpStatus: 403 }],
        "now",
        "BBCA",
      ).capabilities.dailyOhlcv.status,
    ).toBe("AUTH_OR_PLAN_BLOCKED");
    expect(
      buildCapabilities([], "now", "BBCA").capabilities.orderBook.status,
    ).toBe("UNVERIFIED");
  });
  it("normalizes the sanitized real BBCA response with share units", () => {
    const rows = normalizeDailyPrices(sample.payload, "BBCA");
    expect(rows).toHaveLength(2);
    expect(rows[0].ticker).toBe("BBCA");
    expect(rows[0].volumeShares).toBe(sample.payload[0].volume);
    expect(rows[0].date <= rows[1].date).toBe(true);
  });
  it("preserves missing OHLC and rejects wrong symbols, duplicates and bad ranges", () => {
    const row = sample.payload[0];
    expect(
      normalizeDailyPrices([{ ...row, open: null }], "BBCA")[0].open,
    ).toBeNull();
    expect(() => normalizeDailyPrices([row], "TLKM")).toThrow();
    expect(() => normalizeDailyPrices([row, row], "BBCA")).toThrow();
    expect(() => normalizeDailyPrices([{ ...row, high: 0 }], "BBCA")).toThrow();
  });
  it("does not confuse requested end date with observed freshness or null with zero", () => {
    const report = inspectPayload({
      end: "2026-09-21",
      data: [
        { date: "2026-09-18", volume: 0 },
        { date: "2026-09-17", volume: null },
      ],
    });
    expect(report.latestTimestamp).toBe("2026-09-18");
    expect(report.fields["data[].volume"]).toMatchObject({
      present: 2,
      nonNull: 1,
    });
  });
  it("bounds samples and omits secret, account and personal text", () => {
    const result = sanitizeSample(
      {
        token: "private",
        account_id: 123,
        name: "Personal Name",
        symbol: "BBCA.JK",
        nested: [{ date: "2026-09-18", label: "private" }, {}, {}],
      },
      ["private"],
    );
    expect(JSON.stringify(result)).not.toMatch(
      /private|Personal Name|account_id|token/,
    );
    expect(result).toMatchObject({
      symbol: "BBCA.JK",
      nested: [{ date: "2026-09-18", label: "[REDACTED]" }, {}],
    });
  });
});
