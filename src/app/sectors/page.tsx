import { market } from "@/lib/intelligence/extended/service";
import { SectorWorkspace } from "@/components/sector-workspace";
export default async function Page() {
  return <SectorWorkspace data={await market()} />;
}
