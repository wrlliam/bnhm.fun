/**
 * Privacy-friendly usage counters: no cookies, no IPs, no player data — just
 * numbers. Stored in a Redis hash when REDIS_URL is set, otherwise in memory.
 */
import { redis } from "./rooms/persist";

export type StatEvent = "room_created" | "player_joined" | "game_started" | "reaction";
const HASH = "bnhm:stats";

const g = globalThis as unknown as { __stats?: Map<string, number> };
const memory = (g.__stats ??= new Map());

const day = (d = new Date()) => d.toISOString().slice(0, 10);

/** Fire-and-forget; never throws into a request. */
export function track(event: StatEvent, kind?: string) {
  const fields = [`total:${event}`, `day:${day()}:${event}`, ...(kind ? [`game:${kind}:${event}`] : [])];
  for (const f of fields) memory.set(f, (memory.get(f) ?? 0) + 1);
  void (async () => {
    const client = await redis();
    if (!client) return;
    try {
      await Promise.all(fields.map((f) => client.hIncrBy(HASH, f, 1)));
    } catch {}
  })();
}

export async function readStats() {
  const client = await redis();
  const raw: Record<string, number> = client
    ? Object.fromEntries(Object.entries(await client.hGetAll(HASH)).map(([k, v]) => [k, Number(v)]))
    : Object.fromEntries(memory);
  const get = (k: string) => raw[k] ?? 0;
  const events: StatEvent[] = ["room_created", "player_joined", "game_started", "reaction"];

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (13 - i));
    const key = day(d);
    return { day: key, ...Object.fromEntries(events.map((e) => [e, get(`day:${key}:${e}`)])) } as { day: string } & Record<StatEvent, number>;
  });
  const games = Object.entries(raw)
    .filter(([k]) => k.startsWith("game:") && k.endsWith(":game_started"))
    .map(([k, v]) => ({ kind: k.split(":")[1], started: v }))
    .sort((a, b) => b.started - a.started);

  return {
    storage: client ? "redis" : "memory",
    totals: Object.fromEntries(events.map((e) => [e, get(`total:${e}`)])) as Record<StatEvent, number>,
    today: Object.fromEntries(events.map((e) => [e, get(`day:${day()}:${e}`)])) as Record<StatEvent, number>,
    days,
    games,
  };
}
