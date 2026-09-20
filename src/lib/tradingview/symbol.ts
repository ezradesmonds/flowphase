export function normalizeTicker(input: string): string {
  const ticker = input.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,11}$/.test(ticker)) {
    throw new Error("Use an IDX ticker such as BBCA.");
  }
  return ticker;
}
export function toTradingViewSymbol(ticker: string): string {
  return `IDX:${normalizeTicker(ticker)}`;
}
export function fromTradingViewSymbol(symbol: string): string {
  const value = symbol.trim().toUpperCase();
  if (!value.startsWith("IDX:"))
    throw new Error("Only IDX symbols are supported.");
  return normalizeTicker(value.slice(4));
}
