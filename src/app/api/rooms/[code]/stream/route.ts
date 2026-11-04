import type { NextRequest } from "next/server";
import { GameError, getRoom, resolveActor, subscribe } from "@/lib/rooms/core";
import { MAX_STREAMS_PER_ROOM } from "@/lib/rooms/limits";
import { errorResponse, viewFor, ensureRooms } from "@/lib/rooms/server";

/**
 * Server-Sent Events: sends the room as seen by this viewer, then again on every
 * change. `?token=` identifies a player, `?host=` the host (TV / admin panel).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/rooms/[code]/stream">) {
  await ensureRooms();
  let room;
  try {
    const { code } = await ctx.params;
    room = getRoom(code);
    if (room.listeners.size >= MAX_STREAMS_PER_ROOM) throw new GameError("Too many screens connected to this room", 429);
  } catch (e) {
    return errorResponse(e);
  }

  const q = req.nextUrl.searchParams;
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };
      const send = () => {
        // re-resolve each time: the player may have been kicked
        const actor = resolveActor(room, q.get("token"), q.get("host"));
        if (q.get("token") && !actor.player) {
          write(`event: gone\ndata: {}\n\n`);
          return close();
        }
        write(`data: ${JSON.stringify(viewFor(room, actor))}\n\n`);
      };

      const actor = resolveActor(room, q.get("token"), q.get("host"));
      const unsubscribe = subscribe(room, actor.player?.id ?? null, send);
      const ping = setInterval(() => write(`: ping\n\n`), 15_000);

      function close() {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      }
      cleanup = close;
      req.signal.addEventListener("abort", close);
      send();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
