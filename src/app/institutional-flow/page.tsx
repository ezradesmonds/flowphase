import { brokerUniverse } from "@/lib/intelligence/extended/service";
import { BrokerStalker } from "@/components/broker-stalker";
import { ExtendedAlerts } from "@/components/extended-alerts";
import { extendedAlerts } from "@/lib/intelligence/extended/alerts";
import { listAnalyses } from "@/lib/intelligence/store";
export default async function Page() {
  return (
    <>
      <h1>Institutional Flow</h1>
      <p>
        Observed broker behavior proxies. Crossing-heavy rows carry a confidence
        penalty; gross flow is never treated as clean accumulation.
      </p>
      <BrokerStalker data={await brokerUniverse()} />
      <ExtendedAlerts alerts={(await listAnalyses()).flatMap(extendedAlerts)} />
    </>
  );
}
