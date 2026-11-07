/**
 * Free map services, called straight from the browser (no API keys):
 * - Photon (photon.komoot.io): place search as you type, built on OpenStreetMap.
 * - OSRM foot routing (routing.openstreetmap.de, the server openstreetmap.org uses): walking routes.
 * - OpenStreetMap's standard tiles for the map itself (fine for light use, with attribution).
 */
import { haversineKm, type LatLng } from "./pub-crawl";

/** `kind` is the OpenStreetMap type, e.g. "pub", "bar", "restaurant". */
export type Place = { name: string; address: string | null; lat: number; lng: number; kind: string | null };
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

/** Places people drink in, searched first so "lamb" finds The Lamb before Lamb Street. */
const VENUE_TAGS = ["amenity:pub", "amenity:bar", "amenity:biergarten", "amenity:nightclub"];
export const isVenue = (kind: string | null) => !!kind && ["pub", "bar", "biergarten", "nightclub"].includes(kind);

async function photon(params: URLSearchParams, signal?: AbortSignal): Promise<Place[]> {
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!res.ok) throw new Error("Place search isn't working right now");
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map((f) => ({
    name: (f.properties.name ?? [f.properties.housenumber, f.properties.street].filter(Boolean).join(" ")) || "Unnamed place",
    address: describe(f.properties),
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    kind: f.properties.osm_value ?? null,
  }));
}

function dedupe(places: Place[]) {
  const seen = new Set<string>();
  return places.filter((p) => {
    const k = `${p.name.toLowerCase()}|${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    return !seen.has(k) && !!seen.add(k);
  });
}

/** Up to 7 matches: pubs and bars first, then anything else (streets, towns, other venues). */
export async function searchPlaces(q: string, near?: LatLng | null, signal?: AbortSignal): Promise<Place[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const base = () => {
    const p = new URLSearchParams({ q: query, lang: "en" });
    if (near) {
      p.set("lat", String(near.lat));
      p.set("lon", String(near.lng));
    }
    return p;
  };
  const venues = base();
  venues.set("limit", "5");
  for (const t of VENUE_TAGS) venues.append("osm_tag", t);
  const any = base();
  any.set("limit", "6");
  const [a, b] = await Promise.all([photon(venues, signal).catch(() => []), photon(any, signal)]);
  return dedupe([...a, ...b]).slice(0, 7);
}

const nearbyCache = new Map<string, Promise<Place[]>>();

/**
 * Pubs and bars within about 800 m of a point, nearest first. Photon only searches by text,
 * so this asks for a few words most pub names contain and keeps what's close.
 */
export function nearbyPubs(at: LatLng): Promise<Place[]> {
  const key = `${at.lat.toFixed(3)},${at.lng.toFixed(3)}`;
  let hit = nearbyCache.get(key);
  if (!hit) {
    const dLat = 0.0072;
    const dLng = dLat / Math.cos((at.lat * Math.PI) / 180);
    const bbox = [at.lng - dLng, at.lat - dLat, at.lng + dLng, at.lat + dLat].map((n) => n.toFixed(5)).join(",");
    hit = Promise.all(
      ["the", "pub", "arms", "bar"].map((q) => {
        const p = new URLSearchParams({ q, lang: "en", limit: "15", bbox });
        for (const t of VENUE_TAGS) p.append("osm_tag", t);
        return photon(p).catch(() => []);
      }),
    ).then((lists) =>
      dedupe(lists.flat())
        .filter((p) => p.name !== "Unnamed place")
        .sort((a, b) => haversineKm(at, a) - haversineKm(at, b))
        .slice(0, 8),
    );
    nearbyCache.set(key, hit);
    void hit.then((r) => r.length || nearbyCache.delete(key));
  }
  return hit;
}

/** "350 m" or "1.2 km" between two points, as the crow flies. */
export function distanceLabel(a: LatLng, b: LatLng) {
  const km = haversineKm(a, b);
  return km < 1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m` : `${km.toFixed(1)} km`;
}

/** Rough walking minutes between two stops (streets add ~30%, 5 km/h). */
export function walkMinutes(a: LatLng, b: LatLng) {
  return Math.max(1, Math.round(((haversineKm(a, b) * 1.3) / 5) * 60));
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
