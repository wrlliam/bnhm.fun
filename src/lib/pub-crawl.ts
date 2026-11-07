/** Pub crawl helpers shared by the server and the browser. */

export type LatLng = { lat: number; lng: number };

export const MAX_STOPS = 20;
export const MAX_STOP_NAME = 60;

/** Straight-line distance in km between two points. */
export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Streets wind, so walking is a bit further than as the crow flies. */
export const WALK_FACTOR = 1.3;

/** Total walk along a list of points (unknown points are skipped). */
export function routeKm(points: (LatLng | null)[]) {
  const known = points.filter((p): p is LatLng => !!p);
  let km = 0;
  for (let i = 1; i < known.length; i++) km += haversineKm(known[i - 1], known[i]);
  return km * WALK_FACTOR;
}

export function formatKm(km: number) {
  if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** Roughly 1,300 steps per km of walking. */
export const stepsFor = (km: number) => Math.round((km * 1300) / 100) * 100;

export function formatDuration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function clockTime(at: number) {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Search link for a stop, so phones can get directions. */
export const mapsLink = (name: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

/** One stop per line; blank lines and duplicates dropped. */
export function parseStops(text: string) {
  const seen = new Set<string>();
  return text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim().slice(0, MAX_STOP_NAME))
    .filter((l) => l && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()))
    .slice(0, MAX_STOPS);
}
