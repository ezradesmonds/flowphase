import { candleRequestSchema } from "@/lib/tradingview/schemas";
import { subscribeCandles } from "@/lib/tradingview/session";
import { createTradingViewClient } from "@/lib/tradingview/client";
import { reserveConnection } from "@/lib/services/market-data-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export function GET(request: Request) {
  const parsed = candleRequestSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  let release: () => void;
  try {
    release = reserveConnection();
  } catch {
    return Response.json({ error: "BUSY" }, { status: 429 });
  }
  let stop = () => {};
  let finish = () => {};
  let heartbeat: ReturnType<typeof setInterval>;
  let lifetime: ReturnType<typeof setTimeout>;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      finish = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        request.signal.removeEventListener("abort", finish);
        stop();
        release();
        try {
          controller.close();
        } catch {
          /* Reader cancelled. */
        }
      };
      const send = (event: string, data: unknown) => {
        if (!closed)
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
      };
      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 10_000);
      lifetime = setTimeout(() => {
        send("provider-error", {
          message: "Update session ended after 55 seconds.",
        });
        finish();
      }, 55_000);
      request.signal.addEventListener("abort", finish, { once: true });
      stop = subscribeCandles(
        createTradingViewClient,
        parsed.data,
        (data) => send("candles", data),
        (error) => {
          send("provider-error", { message: error.message });
          finish();
        },
        request.signal,
      );
      if (closed) stop();
    },
    cancel() {
      finish();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
