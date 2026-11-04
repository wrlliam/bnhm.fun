import type { NextRequest } from "next/server";
import { checkGuess, getPuzzle, publicPuzzle, submitResult } from "@/lib/puzzles";
import { clientIp, rateLimit, readJson } from "@/lib/rooms/limits";
import { errorResponse } from "@/lib/rooms/server";

/** Puzzle info and the results board (never the word). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/puzzles/[id]">) {
  try {
    rateLimit(`puzzle-get:${clientIp(req)}`, 120, 60_000);
    const { id } = await ctx.params;
    return Response.json(publicPuzzle(await getPuzzle(id)), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

/** { type: "guess", guess } → pattern · { type: "result", name, guesses } → word + stored result. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/puzzles/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req);
    rateLimit(`puzzle-act:${clientIp(req)}`, 120, 60_000);
    if (body.type === "guess") return Response.json(await checkGuess(id, body.guess));
    if (body.type === "result") return Response.json(await submitResult(id, body.name, body.guesses));
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}
