import { GameError } from "./core";

/**
 * Simple in-memory limits for running on the public internet. One process, so
 * a Map is enough; behind Caddy / Cloudflare the client IP comes from the
 * forwarding headers they set.
 */

export const MAX_ROOMS = 500;
export const MAX_STREAMS_PER_ROOM = 64;
export const MAX_BODY_BYTES = 200_000;

type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __limits?: Map<string, Bucket> };
const buckets = (g.__limits ??= new Map());

/** Fixed-window counter: at most `max` hits per `windowMs` for this key. */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  if (b.count > max) {
    throw new GameError(`Slow down — try again in ${Math.ceil((b.resetAt - now) / 1000)}s`, 429);
  }
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
}

export function clientIp(req: Request) {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local"
  );
}

/** Parse a JSON body, refusing anything suspiciously large. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) throw new GameError("Request too large", 413);
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new GameError("Request too large", 413);
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object") throw new Error();
    return data;
  } catch {
    throw new GameError("Invalid JSON");
  }
}
