import { clientIp, rateLimit, readJson } from "@/lib/rooms/limits";
import { create, errorResponse, ensureRooms } from "@/lib/rooms/server";

export async function POST(req: Request) {
  await ensureRooms();
  try {
    rateLimit(`create:${clientIp(req)}`, 15, 10 * 60_000);
    const { kind, options } = await readJson(req);
    return Response.json(create(kind, options));
  } catch (e) {
    return errorResponse(e);
  }
}
