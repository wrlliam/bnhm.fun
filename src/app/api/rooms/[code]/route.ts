import type { NextRequest } from "next/server";
import { getRoom } from "@/lib/rooms/core";
import { clientIp, rateLimit, readJson } from "@/lib/rooms/limits";
import { errorResponse, perform, viewFor } from "@/lib/rooms/server";

/** Public snapshot (used by the join screen to show the game and who's in). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/rooms/[code]">) {
  try {
    // stops anyone scanning for live room codes
    rateLimit(`lookup:${clientIp(req)}`, 60, 60_000);
    const { code } = await ctx.params;
    const room = getRoom(code);
    return Response.json({ room: viewFor(room, { player: null, isHost: false }) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Every change goes through here: { type, token?, hostToken?, ...args }. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/rooms/[code]">) {
  try {
    const { code } = await ctx.params;
    const body = await readJson(req);
    const ip = clientIp(req);
    rateLimit(`act:${ip}`, 240, 60_000);
    if (body.type === "join") rateLimit(`join:${ip}`, 30, 10 * 60_000);
    if (body.type === "unlock") rateLimit(`unlock:${ip}`, 10, 10 * 60_000);
    if (body.type === "rejoin") rateLimit(`rejoin:${ip}`, 20, 10 * 60_000);
    return Response.json({ ok: true, ...perform(code, body) });
  } catch (e) {
    return errorResponse(e);
  }
}
