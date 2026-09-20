import { Scanner } from "@/components/scanner";
import { demoMode } from "@/lib/server/mode";
import { ProductionDirectory } from "@/components/production-market";
import { PHASES } from "@/domain/market";
import { marketRepository } from "@/lib/server/market";
export const metadata = { title: "Market Scanner" };
export default async function ScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; phase?: string }>;
}) {
  const params = await searchParams;
  if (!demoMode)
    return (
      <ProductionDirectory
        phase={typeof params.phase === "string" ? params.phase : ""}
        query={typeof params.q === "string" ? params.q : ""}
      />
    );
  const phase = PHASES.find((p) => p === params.phase) ?? "ALL";
  return (
    <Scanner
      key={`${params.q}-${phase}`}
      rows={await marketRepository.listStocks()}
      initialQuery={typeof params.q === "string" ? params.q : ""}
      initialPhase={phase}
    />
  );
}
