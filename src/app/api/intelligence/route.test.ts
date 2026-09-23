import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/intelligence/store", () => ({
  getIntelligence: vi.fn(),
  listAnalyses: vi.fn(),
}));
import { POST } from "./route";
describe("analysis request origin", () => {
  const request = (origin: string, host?: string) =>
    new Request("http://localhost:3000/api/intelligence", {
      method: "POST",
      headers: {
        origin,
        ...(host ? { host } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ticker: "INVALID" }),
    });
  it("accepts the actual local Host when Next uses an internal hostname", async () => {
    expect(
      (await POST(request("http://127.0.0.1:3000", "127.0.0.1:3000"))).status,
    ).toBe(400);
  });
  it("rejects foreign origins even with the legitimate Host", async () => {
    expect(
      (await POST(request("https://foreign.example", "127.0.0.1:3000"))).status,
    ).toBe(403);
  });
  it("rejects a different port", async () => {
    expect(
      (await POST(request("http://127.0.0.1:4000", "127.0.0.1:3000"))).status,
    ).toBe(403);
  });
  it("uses request URL when Host is absent", async () => {
    expect((await POST(request("http://localhost:3000"))).status).toBe(400);
  });
});
