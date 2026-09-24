import "server-only";
import { unstable_cache } from "next/cache";
import type { BrokerProfile } from "@/domain/intelligence";
import { sectorsFetch } from "./client";
import { brokerRegistrySchema } from "./schemas";

export interface SectorsBrokerProfile extends BrokerProfile {
  name: string;
  origin: "FOREIGN" | "DOMESTIC";
  licenseType: string | null;
}

function classification(
  cohort: "retail" | "mixed" | "institutional" | "unknown" | null,
): BrokerProfile["classification"] {
  if (cohort === "institutional") return "INSTITUTIONAL_ASSOCIATED";
  if (cohort === "retail") return "RETAIL_ACCESSIBLE";
  return "MIXED_OR_UNKNOWN";
}

export const getSectorsBrokerRegistry = unstable_cache(
  async (): Promise<SectorsBrokerProfile[]> =>
    brokerRegistrySchema.parse(await sectorsFetch("/brokers/")).map((row) => ({
      brokerCode: row.code,
      classification: classification(row.cohort),
      source: "VERIFIED_METADATA" as const,
      confidence: 95,
      notes:
        "Official Sectors broker cohort metadata. Cohort describes the exchange member, not the beneficial owner behind an individual trade.",
      enabled: true,
      effectiveFrom: "0001-01-01",
      effectiveTo: null,
      name: row.name,
      origin: row.is_foreign ? ("FOREIGN" as const) : ("DOMESTIC" as const),
      licenseType: row.license_type,
    })),
  ["sectors-broker-registry-v1"],
  { revalidate: 86400 },
);
