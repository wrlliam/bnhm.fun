/**
 * Optional Redis persistence. With REDIS_URL set, every room is saved (debounced)
 * after each change and loaded back on startup, so restarts and redeploys don't
 * end games. Without it, rooms live in memory only.
 *
 * Note: this persists state for ONE app instance. Running several instances
 * would also need change notifications fanned out (e.g. Redis pub/sub).
 */
import { createClient } from "redis";
import type { Room } from "./core";

type Client = ReturnType<typeof createClient>;

const g = globalThis as unknown as {
  __redis?: Promise<Client | null>;
  __roomsLoaded?: Promise<void>;
  __saveTimers?: Map<string, ReturnType<typeof setTimeout>>;
};
const saveTimers = (g.__saveTimers ??= new Map());

export const ROOM_TTL_SECONDS = 60 * 60 * 6;
const KEY = (code: string) => `bnhm:room:${code}`;

/** Shared Redis connection, or null if REDIS_URL isn't set / Redis is unreachable. */
export function redis(): Promise<Client | null> {
  return (g.__redis ??= (async () => {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    try {
      const client = createClient({ url, socket: { reconnectStrategy: (n) => Math.min(n * 200, 5000) } });
      client.on("error", (e) => console.error("[redis]", e.message));
      await client.connect();
      console.log("[redis] connected — rooms will survive restarts");
      return client;
    } catch (e) {
      console.error("[redis] unavailable, keeping rooms in memory only:", (e as Error).message);
      return null;
    }
  })());
}

/** Everything except live connection state (re-created on load). */
const LIVE_ONLY = new Set(["conns", "polls", "listeners"]);

export function serialize(room: Room) {
  return JSON.stringify(Object.fromEntries(Object.entries(room).filter(([k]) => !LIVE_ONLY.has(k))));
}

export function deserialize(json: string): Room {
  const data = JSON.parse(json) as Omit<Room, "conns" | "polls" | "listeners">;
  return { ...data, conns: new Map(), polls: new Map(), listeners: new Set() } as Room;
}

/** Save a room ~300 ms after its last change (batches bursts of actions). */
export function saveSoon(room: Room) {
  if (!process.env.REDIS_URL) return;
  clearTimeout(saveTimers.get(room.code));
  saveTimers.set(
    room.code,
    setTimeout(async () => {
      saveTimers.delete(room.code);
      const client = await redis();
      if (!client) return;
      try {
        await client.set(KEY(room.code), serialize(room), { EX: ROOM_TTL_SECONDS });
      } catch (e) {
        console.error("[redis] save failed", (e as Error).message);
      }
    }, 300),
  );
}

export async function forget(code: string) {
  dropPhotos(code);
  const client = await redis();
  await client?.del(KEY(code)).catch(() => {});
}

// ---- photos ---------------------------------------------------------------
// Pub crawl proof photos are big, so they live outside the room (which is
// broadcast and saved on every change) and are fetched by id instead.

const g2 = globalThis as unknown as { __photos?: Map<string, string> };
const photos = (g2.__photos ??= new Map<string, string>());
const PHOTO_KEY = (code: string, id: string) => `bnhm:photo:${code}:${id}`;

export function putPhoto(code: string, id: string, dataUrl: string) {
  photos.set(`${code}:${id}`, dataUrl);
  void redis().then((client) =>
    client?.set(PHOTO_KEY(code, id), dataUrl, { EX: ROOM_TTL_SECONDS * 2 }).catch((e) => console.error("[redis] photo save failed", (e as Error).message)),
  );
}

export async function getPhoto(code: string, id: string): Promise<string | null> {
  const hit = photos.get(`${code}:${id}`);
  if (hit) return hit;
  const client = await redis();
  const saved = (await client?.get(PHOTO_KEY(code, id)).catch(() => null)) ?? null;
  if (saved) photos.set(`${code}:${id}`, saved);
  return saved;
}

export function deletePhoto(code: string, id: string) {
  photos.delete(`${code}:${id}`);
  void redis().then((client) => client?.del(PHOTO_KEY(code, id)).catch(() => {}));
}

/** Forget every photo for a room (memory only; Redis copies expire on their own). */
export function dropPhotos(code: string) {
  for (const k of photos.keys()) if (k.startsWith(`${code}:`)) photos.delete(k);
}

/**
 * Load every saved room into `rooms` once per process. API routes await this
 * before touching rooms. `restore` lets game modules re-arm their timers.
 */
export function roomsReady(rooms: Map<string, Room>, restore: (room: Room) => void): Promise<void> {
  return (g.__roomsLoaded ??= (async () => {
    const client = await redis();
    if (!client) return;
    let n = 0;
    for await (const keys of client.scanIterator({ MATCH: KEY("*"), COUNT: 100 })) {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        const json = await client.get(key);
        if (!json) continue;
        try {
          const room = deserialize(json);
          if (!rooms.has(room.code)) {
            rooms.set(room.code, room);
            restore(room);
            n++;
          }
        } catch (e) {
          console.error("[redis] skipping unreadable room", key, (e as Error).message);
        }
      }
    }
    if (n) console.log(`[redis] restored ${n} room(s)`);
  })());
}
