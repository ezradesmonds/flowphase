import type { BrokerProfile } from "@/domain/intelligence";
// Initial user hypotheses, deliberately low confidence until out-of-sample validation.
export const BROKER_REGISTRY: readonly BrokerProfile[] = [
  ...["XL", "XC", "YP", "PD", "KK"].map((brokerCode) => ({
    brokerCode,
    classification: "RETAIL_ACCESSIBLE" as const,
  })),
  ...["AI", "CS", "BK", "YU", "AK"].map((brokerCode) => ({
    brokerCode,
    classification: "INSTITUTIONAL_ASSOCIATED" as const,
  })),
].map((row) => ({
  ...row,
  source: "USER_HEURISTIC",
  confidence: 40,
  notes:
    "User heuristic; multiple clients per broker. Not validated against future returns or beneficial ownership.",
  enabled: true,
}));
export function brokerProfile(
  code: string,
  registry = BROKER_REGISTRY,
): BrokerProfile {
  const brokerCode = code.trim().toUpperCase();
  return (
    registry.find(
      (p) => p.enabled && p.brokerCode.toUpperCase() === brokerCode,
    ) ?? {
      brokerCode,
      classification: "MIXED_OR_UNKNOWN",
      source: "USER_HEURISTIC",
      confidence: 0,
      notes: "No enabled classification evidence.",
      enabled: true,
    }
  );
}
