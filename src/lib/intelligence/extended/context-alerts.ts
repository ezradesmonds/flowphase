import "server-only";
import { storedSnapshots } from "./persistence";
import type { normalizeOwnership } from "./ownership";
import type { marketActivity } from "./market";
import type { extendedAlerts } from "./alerts";
import { metric, type Meta } from "./model";
/** Alerts describe snapshots available now; never backdate release to the effective period. */
export async function contextAlerts() {
  const alerts: ReturnType<typeof extendedAlerts> = [];
  const emit = (
    symbol: string,
    type: string,
    meta: Meta,
    actual: number,
    baseline: number,
    text: string,
    phase = "CONTEXT",
  ) =>
    alerts.push({
      id: symbol + ":" + type + ":" + meta.period_end,
      symbol,
      broker: "—",
      phase,
      type,
      date: meta.as_of?.slice(0, 10) ?? "",
      actual: metric(actual, meta, text),
      baseline: metric(baseline, meta, "previous comparable observation"),
      explanation: text,
      limitations: meta.quality_flags,
    });
  const latest = new Map<string, ReturnType<typeof normalizeOwnership>>();
  for (const raw of await storedSnapshots("ownership_snapshots")) {
    const data = raw as ReturnType<typeof normalizeOwnership>;
    if (!data?.symbol || !Array.isArray(data.history) || !data.meta?.as_of)
      continue;
    const previous = latest.get(data.symbol);
    if (!previous || previous.meta.as_of! < data.meta.as_of)
      latest.set(data.symbol, data);
  }
  for (const data of latest.values()) {
    const a = data.history.at(-1),
      b = data.history.at(-2);
    if (!a || !b) continue;
    const meta = {
      ...data.meta,
      period_start: b.date,
      period_end: a.date,
      quality_flags: [
        ...data.meta.quality_flags,
        "KNOWN_ON_FETCH_NOT_PERIOD_END",
      ],
    };
    if (
      a.shareholders.value !== null &&
      b.shareholders.value !== null &&
      a.shareholders.value !== b.shareholders.value
    )
      emit(
        data.symbol,
        "SHAREHOLDER_COUNT_CHANGE",
        meta,
        a.shareholders.value,
        b.shareholders.value,
        "Reported shareholder count changed between monthly periods " +
          b.date +
          " and " +
          a.date,
      );
    const current = a.categories.total_f?.value,
      prior = b.categories.total_f?.value;
    if (current != null && prior != null && current !== prior)
      emit(
        data.symbol,
        "OWNERSHIP_CHANGE",
        meta,
        current,
        prior,
        "Reported foreign-category shares changed; not broker nationality or controlling-owner change",
      );
  }
  const sectors = (
    (await storedSnapshots("sector_snapshots")) as ReturnType<
      typeof marketActivity
    >[]
  )
    .filter(
      (s) =>
        s?.meta?.period_end &&
        Array.isArray(s.sectors) &&
        s.meta.quality_flags.includes("CURRENT_JAKARTA_SESSION_EXCLUDED"),
    )
    .sort((a, b) => a.meta.as_of!.localeCompare(b.meta.as_of!));
  const current = sectors.at(-1),
    previous = sectors
      .filter((s) => s.meta.period_end! < (current?.meta.period_end ?? ""))
      .at(-1);
  if (current && previous)
    for (const sector of current.sectors) {
      const old = previous.sectors.find((s) => s.sector === sector.sector);
      if (
        !old ||
        sector.members
          .map((m) => m.symbol)
          .sort()
          .join() !==
          old.members
            .map((m) => m.symbol)
            .sort()
            .join()
      )
        continue;
      if (
        sector.quadrant !== "Unavailable" &&
        old.quadrant !== "Unavailable" &&
        sector.quadrant !== old.quadrant
      )
        emit(
          sector.sector,
          "SECTOR_ROTATION",
          current.meta,
          sector.metrics.relativeStrength.value!,
          old.metrics.relativeStrength.value!,
          old.quadrant + " → " + sector.quadrant + " on matched constituents",
        );
      const dominant = (counts: Record<string, number>) =>
        Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const a = dominant(sector.phaseCounts),
        b = dominant(old.phaseCounts);
      if (a && b && a[0] !== b[0])
        emit(
          sector.sector,
          "SECTOR_PHASE_SHIFT",
          current.meta,
          a[1],
          b[1],
          "Dominant phase " + b[0] + " → " + a[0],
          a[0],
        );
    }
  return alerts;
}
