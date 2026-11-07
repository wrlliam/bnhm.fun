"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { TILE_ATTRIBUTION, TILE_URL, walkingRoute, type WalkingRoute } from "@/lib/maps";
import type { LatLng } from "@/lib/pub-crawl";

export type MapStop = {
  key: string;
  n: number;
  name: string;
  spot: LatLng | null;
  /** How the pin is drawn: ticked off, where you are / heading now, or still to come. */
  state?: "done" | "current" | "todo" | "skipped";
};

const keyOf = (spots: LatLng[]) => spots.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";");

/** The walking route through these points (null while loading, or if routing is down). */
export function useWalkingRoute(spots: LatLng[]): WalkingRoute | null {
  const key = keyOf(spots);
  const [result, setResult] = useState<{ key: string; route: WalkingRoute | null } | null>(null);
  useEffect(() => {
    if (!key) return;
    let live = true;
    const pts = key.split(";").map((s) => {
      const [lat, lng] = s.split(",").map(Number);
      return { lat, lng };
    });
    void walkingRoute(pts).then((route) => live && setResult({ key, route }));
    return () => {
      live = false;
    };
  }, [key]);
  return result?.key === key ? result.route : null;
}

const PIN_STYLE: Record<NonNullable<MapStop["state"]>, string> = {
  todo: "background:var(--ink);color:var(--paper);",
  current: "background:var(--hit);color:#fff;box-shadow:0 0 0 4px color-mix(in srgb, var(--hit) 35%, transparent);",
  done: "background:var(--hit);color:#fff;opacity:.75;",
  skipped: "background:#9ca3af;color:#fff;",
};

/**
 * A real map (OpenStreetMap data, CARTO tiles) with numbered pins for each stop and
 * the walking route between them. Falls back to straight dashed lines if routing fails.
 */
export function RouteMap({
  stops,
  className = "h-72",
  label,
  labels = false,
}: {
  stops: MapStop[];
  className?: string;
  label?: string;
  /** Always show stop names next to the pins (big screens); otherwise they show on hover / tap. */
  labels?: boolean;
}) {
  const placed = stops.filter((s) => s.spot);
  if (!placed.length) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-ink/5 p-6 text-center text-sm text-faint ${className}`}>
        Stops appear on the map as you add them
      </div>
    );
  }
  return <LeafletMap stops={stops} className={className} label={label} labels={labels} />;
}

function LeafletMap({ stops, className, label, labels }: { stops: MapStop[]; className: string; label?: string; labels: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const live = useRef<{ L: typeof Leaflet; map: Leaflet.Map; layer: Leaflet.LayerGroup; fitted: string } | null>(null);
  const [ready, setReady] = useState(false);
  const spots = stops.map((s) => s.spot).filter((p): p is LatLng => !!p);
  const route = useWalkingRoute(spots);
  const sig = `${keyOf(spots)}|${labels}|${stops.map((s) => `${s.key}:${s.n}:${s.state ?? ""}:${s.name}`).join(",")}`;

  // create the map once
  useEffect(() => {
    let dead = false;
    void import("leaflet").then(({ default: L }) => {
      if (dead || !el.current) return;
      const map = L.map(el.current, { scrollWheelZoom: false, zoomSnap: 0.5 });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      live.current = { L, map, layer: L.layerGroup().addTo(map), fitted: "" };
      setReady(true);
    });
    return () => {
      dead = true;
      live.current?.map.remove();
      live.current = null;
    };
  }, []);

  // redraw pins + route when they change
  useEffect(() => {
    const m = live.current;
    if (!m) return;
    const { L, map, layer } = m;
    layer.clearLayers();
    const placed = stops.filter((s): s is MapStop & { spot: LatLng } => !!s.spot);
    const hit = getComputedStyle(document.documentElement).getPropertyValue("--hit").trim() || "#2f7d4f";
    if (route) {
      L.polyline(route.line, { color: "#fff", weight: 9, opacity: 0.9 }).addTo(layer);
      L.polyline(route.line, { color: hit, weight: 5 }).addTo(layer);
    } else if (placed.length > 1) {
      L.polyline(
        placed.map((s) => [s.spot.lat, s.spot.lng]),
        { color: hit, weight: 3, dashArray: "6 8" },
      ).addTo(layer);
    }
    for (const s of placed) {
      const icon = L.divIcon({
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;border:2px solid #fff;font:500 12px/1 var(--font-geist-mono),ui-monospace,monospace;box-shadow:0 1px 4px rgba(0,0,0,.35);${PIN_STYLE[s.state ?? "todo"]}">${s.n}</span>`,
      });
      // names come from the host: set as text, never as HTML
      const tip = document.createElement("span");
      tip.textContent = s.name;
      L.marker([s.spot.lat, s.spot.lng], { icon, title: s.name, keyboard: false })
        .bindTooltip(tip, { direction: "top", offset: [0, -16], permanent: labels })
        .addTo(layer);
    }
    // only re-frame when the set of points changes, so a pan or zoom isn't undone by every update
    const where = keyOf(placed.map((s) => s.spot));
    if (where !== m.fitted) {
      m.fitted = where;
      if (placed.length === 1) map.setView([placed[0].spot.lat, placed[0].spot.lng], 16);
      else map.fitBounds(L.latLngBounds(placed.map((s) => [s.spot.lat, s.spot.lng])), { padding: [40, 40], maxZoom: 17 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `sig` stands in for `stops`
  }, [ready, sig, route]);

  return (
    <div className="isolate overflow-hidden rounded-2xl">
      <div ref={el} className={`w-full bg-ink/5 ${className}`} role="region" aria-label={label ?? `Map of ${stops.map((s) => s.name).join(", ")}`} />
      {route && (
        <p className="sr-only">
          Walking route about {route.km.toFixed(1)} km, {route.minutes} minutes
        </p>
      )}
    </div>
  );
}
