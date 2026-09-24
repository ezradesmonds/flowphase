import { PageHeading, Skeleton } from "@/components/ui";

export default function RadarLoading() {
  return (
    <>
      <PageHeading
        eyebrow="DISCOVER // SECTORS MARKET STRUCTURE"
        title="Market Radar"
        description="Loading Sectors discovery signals and bounded foreign-flow context."
      />
      <Skeleton />
    </>
  );
}
