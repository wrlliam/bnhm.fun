import { connection } from "next/server";
import { rooms } from "@/lib/rooms/core";

/** Liveness probe for Docker / load balancers. */
export async function GET() {
  await connection(); // always run at request time, never prerender
  return Response.json({ ok: true, rooms: rooms.size, uptime: Math.round(process.uptime()) });
}
