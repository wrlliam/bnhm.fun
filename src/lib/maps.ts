/**
 * Free map services, called straight from the browser (no API keys):
 * - Photon (photon.komoot.io): place search as you type, built on OpenStreetMap.
 * - OSRM foot routing (routing.openstreetmap.de, the server openstreetmap.org uses): walking routes.
 * - OpenStreetMap's standard tiles for the map itself (fine for light use, with attribution).
 */
import type { LatLng } from "./pub-crawl";

export type Place = { name: string; address: string | null; lat: number; lng: number };
/** A stop as typed: a picked place, or just a name. */
export type PlaceInput = { name: string; address?: string | null; lat?: number | null; lng?: number | null };

export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
};

function describe(p: PhotonFeature["properties"]) {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const parts = [street || null, p.locality ?? p.district ?? null, p.city ?? p.county ?? null, p.postcode ?? null];
  return [...new Set(parts.filter(Boolean))].join(", ") || null;
}

/** Up to 6 matching places, nearest-first around `near` when given. */
export async function searchPlaces(q: string, near?: LatLng | null, signal?: AbortSignal): Promise<Place[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const params = new URLSearchParams({ q: query, limit: "6", lang: "en" });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lon", String(near.lng));
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!res.ok) throw new Error("Place search is unavailable right now");
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  return (data.features ?? [])
    .map((f) => ({
      name: (f.properties.name ?? [f.properties.housenumber, f.properties.street].filter(Boolean).join(" ")) || query,
      address: describe(f.properties),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }))
    .filter((p) => {
      const k = `${p.name}|${p.address}`;
      return !seen.has(k) && !!seen.add(k);
    });
}

export type WalkingRoute = { km: number; minutes: number; line: [number, number][] };

const routeCache = new Map<string, Promise<WalkingRoute | null>>();

/** The walking route through every point in order, or null if routing fails. Cached per set of points. */
export function walkingRoute(points: LatLng[]): Promise<WalkingRoute | null> {
  if (points.length < 2) return Promise.resolve(null);
  const coords = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
  let hit = routeCache.get(coords);
  if (!hit) {
    hit = (async () => {
      try {
        const res = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`);
        if (!res.ok) return null;
        const data = (await res.json()) as { code: string; routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
        const r = data.code === "Ok" ? data.routes?.[0] : undefined;
        if (!r) return null;
        return { km: r.distance / 1000, minutes: Math.round(r.duration / 60), line: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) };
      } catch {
        return null;
      }
    })();
    routeCache.set(coords, hit);
    // a failure shouldn't stick: let the next render try again
    void hit.then((r) => r || routeCache.delete(coords));
  }
  return hit;
}

/** Google Maps walking directions to one stop (by pin when we have one). */
export function directionsLink(name: string, spot: LatLng | null) {
  return spot
    ? `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=walking`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
}

/** The whole route in Google Maps (it takes up to 9 stops between the start and the end). */
export function routeLink(spots: LatLng[]) {
  if (spots.length < 2) return null;
  const fmt = (p: LatLng) => `${p.lat},${p.lng}`;
  const mid = spots.slice(1, -1).slice(0, 9);
  const params = new URLSearchParams({ api: "1", origin: fmt(spots[0]), destination: fmt(spots[spots.length - 1]), travelmode: "walking" });
  if (mid.length) params.set("waypoints", mid.map(fmt).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

/** The phone's position, or null (no permission, no signal, or too slow). */
export function locate(timeout = 10_000): Promise<{ lat: number; lng: number; acc: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 60_000 },
    );
  });
}
