import { createPuzzle } from "@/lib/puzzles";
import { clientIp, rateLimit, readJson } from "@/lib/rooms/limits";
import { errorResponse } from "@/lib/rooms/server";

export async function POST(req: Request) {
  try {
    rateLimit(`puzzle:${clientIp(req)}`, 20, 10 * 60_000);
    const { word, by } = await readJson(req);
    const p = await createPuzzle(word, by);
    return Response.json({ id: p.id });
  } catch (e) {
    return errorResponse(e);
  }
}
