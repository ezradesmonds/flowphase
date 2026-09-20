import { sectorsRepository } from "@/lib/repositories/sectors-repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await sectorsRepository.listStocks(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error: "SECTORS_UNAVAILABLE",
        message:
          "The complete IDX universe could not be loaded. No demo fallback is used.",
      },
      { status: 503 },
    );
  }
}
