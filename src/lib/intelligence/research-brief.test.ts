import { describe, expect, it } from "vitest";
import type { PhaseEvidence, PhaseRegion } from "@/domain/market";
import { evidenceLabel, researchBrief } from "./research-brief";

const evidence = (
  feature: string,
  value: number | null,
  status: PhaseEvidence["status"] = "DERIVED",
): PhaseEvidence => ({
  feature,
  value,
  status,
  source: "test",
  description: `${feature} evidence`,
});
const region: PhaseRegion = {
  id: "test",
  ticker: "TEST",
  phase: "AKUMULASI",
  label: "Candidate",
  startTimestamp: 1,
  endTimestamp: 2,
  startPrice: 100,
  endPrice: 101,
  lowPrice: 99,
  highPrice: 102,
  confidence: 50,
  coverage: 0.8,
  dataQualityFactor: 1,
  algorithmVersion: "test",
  configVersion: "test",
  scores: { AKUMULASI: 60, POMPOM: 20, MENGGORENG: 10, DISTRIBUSI: 10 },
  evidenceItems: [
    evidence("inventoryGrowth", 75),
    evidence("concentratedNetBuy", 60),
  ],
  againstEvidence: [evidence("narrative", null, "UNAVAILABLE")],
  liquidityBucket: "HIGH",
  changePoint: false,
  marketCondition: "NONE",
  brokerEvidence: "BROKER_SUPPORTED",
  evidence: [],
  warnings: [],
  status: "CALCULATED",
};

describe("research brief", () => {
  it("does not turn a retained phase awaiting confirmation into a supported conclusion", () => {
    const brief = researchBrief({
      ...region,
      againstEvidence: [evidence("pendingConfirmation", null, "INFERRED")],
    });
    expect(brief.conclusion).toContain("masih menunggu konfirmasi");
    expect(brief.supporting).toEqual([]);
    expect(brief.nextCheck).toContain("konfirmasi fase");
  });
  it("summarizes selected-region evidence without changing scores or inputs", () => {
    const before = structuredClone(region);
    const brief = researchBrief(region);
    expect(brief.supporting).toHaveLength(2);
    expect(brief.supporting[0]).toContain("75.0/100");
    expect(brief.nextCheck).toContain("net buyer dan net seller");
    expect(region).toEqual(before);
  });
  it("never promotes opposing, weak, unavailable, or invalid evidence as support", () => {
    const brief = researchBrief({
      ...region,
      evidenceItems: [
        evidence("inventoryGrowth", 75),
        evidence("sellerDispersion", 10),
        evidence("concentratedNetBuy", 80, "UNAVAILABLE"),
        evidence("lowVolumeCorrection", NaN),
      ],
      againstEvidence: [evidence("inventoryGrowth", 75)],
    });
    expect(brief.supporting).toEqual([]);
  });
  it.each(["UNCERTAIN", "TRANSITION", "INSUFFICIENT_DATA"] as const)(
    "does not present %s as a supported primary phase",
    (phase) => {
      const brief = researchBrief({ ...region, phase });
      expect(brief.supporting).toEqual([]);
      expect(brief.nextCheck).toContain("kecukupan riwayat");
    },
  );
  it("directs price-volume-only candidates to missing broker confirmation", () => {
    expect(
      researchBrief({ ...region, brokerEvidence: "PRICE_VOLUME_ONLY" })
        .nextCheck,
    ).toContain("belum menjadi sinyal FlowPhase lengkap");
  });
  it("prioritizes crossing concerns over permanent unavailable capabilities", () => {
    const brief = researchBrief({
      ...region,
      againstEvidence: [
        ...region.againstEvidence,
        evidence("orderBook", null, "UNAVAILABLE"),
        evidence("crossing", 0.8, "INFERRED"),
      ],
    });
    expect(brief.caution[0]).toContain("Crossing-risk");
    expect(brief.nextCheck).toContain("gross dengan net");
    expect(brief.caution).toHaveLength(2);
  });
  it("keeps attention and markup labels separate from manipulation claims", () => {
    expect(researchBrief({ ...region, phase: "POMPOM" }).conclusion).toContain(
      "bukan bukti promosi",
    );
    expect(
      researchBrief({ ...region, phase: "MENGGORENG" }).conclusion,
    ).toContain("bukan bukti manipulasi");
    expect(evidenceLabel(evidence("newFeature", 0))).toBe("new Feature");
  });
});
