import { analysisSummary } from "@/lib/intelligence/summary";
import { getIntelligence, listAnalyses } from "@/lib/intelligence/store";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("status") === "1") {
    const rows = await listAnalyses(),
      latest = [...rows].sort((a, b) =>
        b.calculatedAt.localeCompare(a.calculatedAt),
      )[0];
    return Response.json(
      {
        calculatedAt: latest?.calculatedAt ?? null,
        price: !!latest?.candles,
        broker: !!latest?.broker.flows.length,
        alerts: rows.reduce(
          (n, r) => n + r.alerts.filter((a) => a.status === "NEW").length,
          0,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json((await listAnalyses()).map(analysisSummary), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const publicUrl = new URL(request.url);
  // Next can expose an internal localhost URL while the browser uses 127.0.0.1.
  // Compare the browser origin with the actual request Host, not forwarded headers.
  publicUrl.host = request.headers.get("host") ?? publicUrl.host;
  if (origin && origin !== publicUrl.origin)
    return Response.json(
      { message: "Same-origin requests only." },
      { status: 403 },
    );
  try {
    const body = await request.json();
    if (typeof body.ticker !== "string" || !/^[A-Za-z]{4}$/.test(body.ticker))
      return Response.json(
        { message: "A four-letter Sectors ticker is required." },
        { status: 400 },
      );
    return Response.json(analysisSummary(await getIntelligence(body.ticker)));
  } catch {
    return Response.json(
      { message: "Analysis unavailable or busy. Retry after a short pause." },
      { status: 503 },
    );
  }
}
