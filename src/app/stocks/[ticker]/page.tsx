import { notFound } from "next/navigation";
import { demoMode } from "@/lib/server/mode";
import { ProductionStock } from "@/components/production-market";
import { marketRepository } from "@/lib/server/market";
import { StockAnalysis } from "@/components/stock-detail";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  return {
    title: `${(await params).ticker.toUpperCase()} · Market chart${demoMode ? " & demo analysis" : ""}`,
  };
}
export default async function StockPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ replay?: string }>;
}) {
  if (!demoMode)
    return (
      <ProductionStock
        ticker={(await params).ticker}
        view={(await searchParams).replay === "1" ? "replay" : "detail"}
      />
    );
  const stock = await marketRepository.getStock((await params).ticker);
  if (!stock) notFound();
  return <StockAnalysis stock={stock} />;
}
