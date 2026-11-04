import type { NextRequest } from "next/server";
import { avatarFor, errorResponse, ensureRooms } from "@/lib/rooms/server";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/rooms/[code]/avatar/[playerId]">) {
  await ensureRooms();
  try {
    const { code, playerId } = await ctx.params;
    const { type, bytes } = avatarFor(code, playerId);
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
