import type { MarketCycle } from "@/domain/intelligence";
import type { PhaseRegion } from "@/domain/market";
/** A new confirmed accumulation following a decline/distribution closes the previous candidate.
 * Missing phases remain incomplete. We do not infer unobserved history. */
export function detectCycles(
  ticker: string,
  regions: readonly PhaseRegion[],
): MarketCycle[] {
  const cycles: MarketCycle[] = [];
  for (const region of regions) {
    let cycle = cycles.at(-1);
    if (
      !cycle ||
      (region.phase === "AKUMULASI" &&
        cycle.phases.some(
          (p) => p.marketCondition === "POST_DISTRIBUTION_MARKDOWN",
        ))
    ) {
      if (cycle) {
        cycle.endTimestamp = cycle.phases.at(-1)!.endTimestamp;
        const order = cycle.phases
          .filter((p) =>
            ["AKUMULASI", "POMPOM", "MENGGORENG", "DISTRIBUSI"].includes(
              p.phase,
            ),
          )
          .map((p) => p.phase)
          .filter((p, i, a) => !i || p !== a[i - 1]);
        cycle.status =
          order.join(",") === "AKUMULASI,POMPOM,MENGGORENG,DISTRIBUSI"
            ? "COMPLETE"
            : "INCOMPLETE";
      }
      cycle = {
        id: `${ticker}:cycle:${region.startTimestamp}`,
        ticker,
        startTimestamp: region.startTimestamp,
        endTimestamp: null,
        status: "ACTIVE",
        phases: [],
        evidenceStatus: "PRICE_VOLUME_ONLY",
      };
      cycles.push(cycle);
    }
    cycle.phases.push({ ...region, cycleId: cycle.id });
  }
  return cycles;
}
