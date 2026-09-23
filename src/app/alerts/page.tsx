import { contextAlerts } from "@/lib/intelligence/extended/context-alerts";
import { ExtendedAlerts } from "@/components/extended-alerts";
import { extendedAlerts } from "@/lib/intelligence/extended/alerts";
import { AlertCenter } from "@/components/alert-center";
import { listAnalyses } from "@/lib/intelligence/store";
export const metadata = { title: "Alerts" };
export default async function AlertsPage() {
  const analyses = await listAnalyses();
  return (
    <>
      <AlertCenter analyses={analyses} />
      <ExtendedAlerts
        alerts={[
          ...analyses.flatMap(extendedAlerts),
          ...(await contextAlerts()),
        ]}
      />
    </>
  );
}
