export const num = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined
    ? "Unavailable"
    : v.toLocaleString("en-US", { maximumFractionDigits: digits });
export const readable = (value: string) =>
  value.replaceAll("_", " ").toLowerCase();
export const groupLabel = (value: string) =>
  value === "INSTITUTIONAL_ASSOCIATED"
    ? "Institutional-associated"
    : value === "RETAIL_ACCESSIBLE"
      ? "Retail-accessible"
      : "Unknown / mixed";
