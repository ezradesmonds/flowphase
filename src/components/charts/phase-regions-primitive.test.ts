import { expect, it, vi } from "vitest";
import type {
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
} from "lightweight-charts";
import type { PhaseRegion } from "@/domain/market";
import { PhaseRegionsPrimitive } from "./phase-regions-primitive";

const region: PhaseRegion = {
  marketCondition:"NONE", label:"Akumulasi",coverage:0.5,dataQualityFactor:1,algorithmVersion:"test",configVersion:"test",
  scores:{AKUMULASI:0,POMPOM:0,MENGGORENG:0,DISTRIBUSI:0},evidenceItems:[],againstEvidence:[],liquidityBucket:"LOW",changePoint:false,
  id: "test",
  ticker: "AAA",
  phase: "AKUMULASI",
  startTimestamp: 100,
  endTimestamp: 200,
  startPrice: 20,
  endPrice: 30,
  lowPrice: 10,
  highPrice: 40,
  confidence: 82,
  evidence: [],
  warnings: [],
  status: "CALCULATED",
};
it("projects through current time and price scales on every draw; skips unclassified", () => {
  let offset = 0;
  const update = vi.fn();
  const primitive = new PhaseRegionsPrimitive();
  const attachment = {
    chart: {
      timeScale: () => ({
        options: () => ({ barSpacing: 10 }),
        timeToCoordinate: (time: number) => time + offset,
      }),
    },
    series: { priceToCoordinate: (price: number) => 200 - price * 2 },
    requestUpdate: update,
  } as unknown as SeriesAttachedParameter;
  primitive.attached(attachment);
  primitive.setRegions([
    region,
    { ...region, id: "unknown", phase: "INSUFFICIENT_DATA" },
  ]);
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: () => ({ width: 75 }),
  };
  const target = {
    useMediaCoordinateSpace: (callback: (scope: unknown) => void) =>
      callback({ context: ctx, mediaSize: { width: 500, height: 300 } }),
  } as unknown as Parameters<IPrimitivePaneRenderer["draw"]>[0];
  primitive.paneViews()[0].renderer()!.draw(target);
  expect(ctx.strokeRect).toHaveBeenLastCalledWith(95, 102, 110, 81);
  expect(ctx.strokeRect).toHaveBeenCalledTimes(1);
  expect(ctx.fillText.mock.calls[0][0]).toBe("Akumulasi · 82%");
  offset = 50;
  primitive.paneViews()[0].renderer()!.draw(target);
  expect(ctx.strokeRect).toHaveBeenLastCalledWith(145, 102, 110, 81);
  primitive.detached();
  primitive.paneViews()[0].renderer()!.draw(target);
  expect(ctx.strokeRect).toHaveBeenCalledTimes(2);
  expect(update).toHaveBeenCalledTimes(2);
});
