import { redirect } from "next/navigation";
import { Replay } from "@/components/replay";
import { demoMode } from "@/lib/server/mode";
import { marketRepository } from "@/lib/server/market";
export const metadata = { title: "Cycle Replay" };
export default async function ReplayPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  if (!demoMode) {
    const ticker = (await searchParams).ticker;
    redirect(
      ticker
        ? `/stocks/${encodeURIComponent(ticker.toUpperCase())}?replay=1`
        : "/stocks",
    );
  }
  const rows = await marketRepository.listStocks();
  const stocks = await Promise.all(
    rows.map((r) => marketRepository.getStock(r.ticker)),
  );
  return <Replay stocks={stocks.filter((s) => s !== null)} />;
}
