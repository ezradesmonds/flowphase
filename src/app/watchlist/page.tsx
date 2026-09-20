import { Watchlist } from "@/components/watchlist";
import { demoMode } from "@/lib/server/mode";
import { ProductionDirectory } from "@/components/production-market";
import { marketRepository } from "@/lib/server/market";
export const metadata = { title: "Watchlist" };
export default async function WatchlistPage() {
  if (!demoMode) return <ProductionDirectory view="watchlist" />;
  return <Watchlist rows={await marketRepository.listStocks()} />;
}
