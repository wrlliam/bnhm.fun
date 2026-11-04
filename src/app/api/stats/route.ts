import { timingSafeEqual } from "node:crypto";
import { connection, type NextRequest } from "next/server";
import { readStats } from "@/lib/analytics";
import { rooms } from "@/lib/rooms/core";
import { clientIp, rateLimit } from "@/lib/rooms/limits";
import { ensureRooms, errorResponse } from "@/lib/rooms/server";

/** Usage counters for the /stats page. Needs STATS_KEY (header `x-stats-key` or `?key=`). */
export async function GET(req: NextRequest) {
  await connection(); // always per-request, never prerendered
  try {
    rateLimit(`stats:${clientIp(req)}`, 30, 60_000);
    const expected = process.env.STATS_KEY;
    if (!expected) return Response.json({ error: "Stats are off. Set STATS_KEY to enable them." }, { status: 404 });
    const given = req.headers.get("x-stats-key") ?? req.nextUrl.searchParams.get("key") ?? "";
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "Wrong key" }, { status: 403 });

    await ensureRooms();
    const live = [...rooms.values()];
    return Response.json(
      {
        ...(await readStats()),
        live: {
          rooms: live.length,
          playersOnline: live.reduce((n, r) => n + [...r.conns.values()].filter((c) => c > 0).length, 0),
          byGame: Object.fromEntries(
            [...new Set(live.map((r) => r.kind))].map((k) => [k, live.filter((r) => r.kind === k).length]),
          ),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
