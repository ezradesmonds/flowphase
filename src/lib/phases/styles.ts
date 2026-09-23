import type { MarketPhase } from "@/domain/market";
export const PHASE_REGION_STYLES: Record<
  MarketPhase,
  { label: string; border: string; fill: string }
> = {
  AKUMULASI: {
    label: "Akumulasi",
    border: "#3B82F6",
    fill: "rgba(59,130,246,0.14)",
  },
  POMPOM: {
    label: "Pompom Candidate",
    border: "#A855F7",
    fill: "rgba(168,85,247,0.14)",
  },
  MENGGORENG: {
    label: "Menggoreng Candidate",
    border: "#F59E0B",
    fill: "rgba(245,158,11,0.14)",
  },
  DISTRIBUSI: {
    label: "Distribusi",
    border: "#EF4444",
    fill: "rgba(239,68,68,0.14)",
  },
  POST_DISTRIBUTION_MARKDOWN: {
    label: "Post-Distribution Markdown",
    border: "#991B1B",
    fill: "rgba(153,27,27,0.28)",
  },
  TRANSITION: {
    label: "Transition",
    border: "#94A3B8",
    fill: "rgba(148,163,184,0.08)",
  },
  UNCERTAIN: {
    label: "Uncertain",
    border: "#94A3B8",
    fill: "rgba(148,163,184,0.08)",
  },
  INSUFFICIENT_DATA: {
    label: "Insufficient Data",
    border: "#94A3B8",
    fill: "rgba(148,163,184,0.04)",
  },
};
