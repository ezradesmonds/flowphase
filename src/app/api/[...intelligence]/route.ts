import { contextAlerts } from "@/lib/intelligence/extended/context-alerts";
import { z } from "zod";
import {
  ownership,
  phaseInventory,
  brokerUniverse,
  market,
  foreignFlow,
  envelope,
  unavailableMeta,
} from "@/lib/intelligence/extended/service";
import { listAnalyses } from "@/lib/intelligence/store";
import {
  extendedAlerts,
  GATED_ALERTS,
} from "@/lib/intelligence/extended/alerts";
import { VERIFIED_ENTITIES, VERIFIED_RELATIONS } from "@/config/relationships";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ intelligence: string[] }> },
) {
  const route = (await params).intelligence,
    url = new URL(request.url);
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
  try {
    if (route[0] === "stocks" && route.length === 3) {
      const symbol = route[1].toUpperCase();
      if (!/^[A-Z]{4}$/.test(symbol))
        return json({ message: "Invalid symbol" }, 400);
      if (["broker-inventory-by-phase", "broker-timeline"].includes(route[2])) {
        const start = url.searchParams.get("start") ?? undefined,
          end = url.searchParams.get("end") ?? undefined;
        if (
          (start && !z.iso.date().safeParse(start).success) ||
          (end && !z.iso.date().safeParse(end).success) ||
          (start && end && start > end)
        )
          return json({ message: "Invalid date range" }, 400);
        const { rows } = await phaseInventory(symbol, start, end);
        return json(
          envelope(
            rows,
            rows[0]?.meta ?? unavailableMeta,
            rows.length ? Math.min(...rows.map((r) => r.coverage)) : 0,
          ),
        );
      }
      if (["ownership", "ownership-history", "relations"].includes(route[2])) {
        const data = await ownership(symbol);
        return json(
          envelope(
            route[2] === "ownership-history"
              ? data.history
              : route[2] === "relations"
                ? { nodes: data.nodes, relations: data.relations }
                : data,
            data.meta,
            data.history.length ? 1 : 0,
          ),
        );
      }
      if (route[2] === "foreign-flow") {
        const data = await foreignFlow(symbol);
        return json(
          envelope(
            data,
            {
              ...unavailableMeta,
              source: [data.source],
              as_of: data.fetchedAt,
              data_status: data.rows.length ? "OBSERVED" : "UNAVAILABLE",
              confidence: data.rows.length ? 70 : 0,
              quality_flags: data.qualityFlags,
            },
            data.rows.length ? 1 : 0,
          ),
        );
      }
    }
    if (route[0] === "brokers" && route.length <= 3) {
      const data = await brokerUniverse(),
        code = route[1]?.toUpperCase();
      if (code && !/^[A-Z0-9]{2}$/.test(code))
        return json({ message: "Invalid broker code" }, 400);
      if (route[2] && !["stocks", "phase-activity"].includes(route[2]))
        return json({ message: "Not found" }, 404);
      const rows = data.rows.filter((r) => !code || r.broker.code === code);
      if (route[2] === "phase-activity") {
        const analyses = await listAnalyses();
        const { inventoryByPhase } =
          await import("@/lib/intelligence/extended/inventory");
        return json(
          envelope(
            analyses.flatMap((a) =>
              inventoryByPhase(a).filter(
                (r) => r.broker.code === code && r.phase !== "CUSTOM",
              ),
            ),
            rows[0]?.meta ?? unavailableMeta,
            data.coverage,
          ),
        );
      }
      return json(
        envelope(rows, rows[0]?.meta ?? unavailableMeta, data.coverage),
      );
    }
    if (route[0] === "entities" && route.length <= 3) {
      const entity = VERIFIED_ENTITIES.find((e) => e.id === route[1]);
      const relations = VERIFIED_RELATIONS.filter(
        (r) => r.from === route[1] || r.to === route[1],
      );
      return json(
        envelope(
          entity
            ? {
                entity,
                relations,
                holdings: relations.filter(
                  (r) => r.from === entity.id && r.type === "OWNS",
                ),
              }
            : null,
          {
            ...unavailableMeta,
            quality_flags: [
              "ONLY_EXPLICIT_VERIFIED_ENTITY_IDS; NO_NAME_MATCHING",
            ],
          },
          0,
        ),
      );
    }
    if (
      route.join("/") === "market-summary" ||
      ["sectors/activity", "sectors/rotation"].includes(route.join("/"))
    ) {
      const data = await market();
      return json(
        envelope(
          route[0] === "sectors" ? data.sectors : data,
          data.meta,
          data.coverage,
        ),
      );
    }
    if (
      ["institutional-flow", "whale-activity", "research-alerts"].includes(
        route.join("/"),
      )
    ) {
      const analyses = await listAnalyses(),
        alerts = [
          ...analyses.flatMap(extendedAlerts),
          ...(await contextAlerts()),
        ];
      if (route[0] === "institutional-flow") {
        const data = await brokerUniverse();
        return json(
          envelope(
            data.rows,
            data.rows[0]?.meta ?? unavailableMeta,
            data.coverage,
          ),
        );
      }
      return json(
        envelope(
          {
            alerts:
              route[0] === "whale-activity"
                ? alerts.filter((a) => a.type === "WHALE_ACTIVITY_CANDIDATE")
                : alerts,
            gated: GATED_ALERTS,
          },
          alerts.length ? alerts[0].actual : unavailableMeta,
          alerts.length ? 1 : 0,
        ),
      );
    }
    return json({ message: "Not found" }, 404);
  } catch {
    return json(
      envelope(
        null,
        {
          ...unavailableMeta,
          quality_flags: ["PROVIDER_OR_VALIDATION_FAILURE", "RETRY_AVAILABLE"],
        },
        0,
      ),
      503,
    );
  }
}
