import { AlertCenter } from "@/components/alert-center";
import { listAnalyses } from "@/lib/intelligence/store";
export const metadata = { title: "Alerts" };
export default async function AlertsPage() {
  return <AlertCenter analyses={await listAnalyses()} />;
}
