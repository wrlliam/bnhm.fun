import type { NextRequest } from "next/server";
import { getRoom, resolveActor } from "@/lib/rooms/core";
import { clientIp, rateLimit } from "@/lib/rooms/limits";
import { errorResponse, viewFor, ensureRooms } from "@/lib/rooms/server";

/**
 * Polling fallback for networks/proxies that buffer Server-Sent Events (e.g.
 * Cloudflare quick tunnels). Same view as the stream; also counts as presence.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/rooms/[code]/state">) {
  await ensureRooms();
  try {
    rateLimit(`poll:${clientIp(req)}`, 1500, 60_000);
    const { code } = await ctx.params;
    const room = getRoom(code);
    const q = req.nextUrl.searchParams;
    const actor = resolveActor(room, q.get("token"), q.get("host"));
    if (q.get("token") && !actor.player) return Response.json({ gone: true });
    if (actor.player) room.polls.set(actor.player.id, Date.now());
    return Response.json({ room: viewFor(room, actor) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
