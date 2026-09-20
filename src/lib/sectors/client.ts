import "server-only";
export class SectorsError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 401 || status === 403
        ? "Sectors access is unavailable for this API key or subscription."
        : status === 429
          ? "Sectors quota or rate limit reached. Try again later."
          : status === 404
            ? "Sectors has no data for this request."
            : "Sectors is unavailable or returned an invalid response. Please retry later.",
    );
  }
}
export async function sectorsFetch(path: string): Promise<unknown> {
  const key = process.env.SECTORS_API_KEY;
  const base = process.env.SECTORS_API_BASE_URL || "https://api.sectors.app/v2";
  const url = new URL(base);
  if (
    !key ||
    url.origin !== "https://api.sectors.app" ||
    url.pathname.replace(/\/$/, "") !== "/v2" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new SectorsError(403);
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      headers: { Authorization: key, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new SectorsError(response.status);
    return await response.json();
  } catch (error) {
    if (error instanceof SectorsError) throw error;
    throw new SectorsError(502);
  }
}
