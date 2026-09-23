import { brokerUniverse } from "@/lib/intelligence/extended/service";
import { BrokerStalker } from "@/components/broker-stalker";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const q = await searchParams;
  return (
    <BrokerStalker data={await brokerUniverse()} initialCode={q.code ?? ""} />
  );
}
