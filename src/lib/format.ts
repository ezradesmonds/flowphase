export const number = (n: number | null) =>
  n === null ? "Unavailable" :
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
export const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
export const signed = (n: number) => `${n > 0 ? "+" : ""}${compact(n)}`;
export const percent = (n: number | null) =>
  n === null ? "Unavailable" : `${Math.round(n * 100)}%`;
export const phaseLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
export const dateLabel = (s: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(s));
