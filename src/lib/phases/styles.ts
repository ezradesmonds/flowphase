import type { MarketPhase } from "@/domain/market";
export const PHASE_REGION_STYLES: Record<
  Exclude<MarketPhase, "UNCLASSIFIED">,
  { label: string; border: string; fill: string }
> = {
  ACCUMULATION: {
    label: "Akumulasi",
    border: "#3B82F6",
    fill: "rgba(59, 130, 246, 0.14)",
  },
  MARKUP: {
    label: "Markup",
    border: "#22C55E",
    fill: "rgba(34, 197, 94, 0.12)",
  },
  EUPHORIA: {
    label: "Euforia",
    border: "#F59E0B",
    fill: "rgba(245, 158, 11, 0.14)",
  },
  DISTRIBUTION: {
    label: "Distribusi",
    border: "#EF4444",
    fill: "rgba(239, 68, 68, 0.14)",
  },
  MARKDOWN: {
    label: "Markdown",
    border: "#64748B",
    fill: "rgba(100, 116, 139, 0.14)",
  },
};
