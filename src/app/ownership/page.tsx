import { OwnershipWorkspace } from "@/components/ownership-workspace";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const { symbol } = await searchParams;
  return (
    <>
      <form className="research-filters" action="/ownership">
        <label>
          Stock symbol
          <input
            name="symbol"
            placeholder="BBCA"
            defaultValue={symbol}
            pattern="[A-Za-z]{4}"
            required
          />
        </label>
        <button>Open ownership graph</button>
      </form>
      {symbol && /^[A-Za-z]{4}$/.test(symbol) ? (
        <OwnershipWorkspace symbol={symbol.toUpperCase()} />
      ) : (
        <p className="empty-state">
          Choose a stock to load its real ownership disclosures.
        </p>
      )}
    </>
  );
}
