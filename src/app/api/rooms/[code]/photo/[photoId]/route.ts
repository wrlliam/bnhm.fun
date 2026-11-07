import type { NextRequest } from "next/server";
import { errorResponse, ensureRooms, photoFor } from "@/lib/rooms/server";

/** Pub crawl proof photos. Ids are random and a photo never changes, so cache hard. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/rooms/[code]/photo/[photoId]">) {
  await ensureRooms();
  try {
    const { code, photoId } = await ctx.params;
    const { type, bytes } = await photoFor(code, photoId);
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400, immutable" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
