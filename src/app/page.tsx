import { Overview } from "@/components/overview";
import { demoMode } from "@/lib/server/mode";
import { ProductionDirectory } from "@/components/production-market";
import { marketRepository } from "@/lib/server/market";
export default async function Home() {
  if (!demoMode) return <ProductionDirectory view="overview" />;
  return <Overview rows={await marketRepository.listStocks()} />;
}
