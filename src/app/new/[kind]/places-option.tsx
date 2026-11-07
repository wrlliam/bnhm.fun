"use client";

import { useState } from "react";
import { StopListEditor, useSearchNear } from "@/components/map/places";
import { RouteMap } from "@/components/map/route-map";
import type { PlaceInput } from "@/lib/maps";
import { MAX_STOPS } from "@/lib/pub-crawl";

type Item = PlaceInput & { key: string };

/** Setup page: build the stop list from map search, with a live map of the route. */
export function PlacesOption({ label, hint, onChange }: { label: string; hint?: string; onChange: (items: PlaceInput[]) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const spotOf = (x: PlaceInput) => (x.lat != null && x.lng != null ? { lat: x.lat, lng: x.lng } : null);
  const lastPin = [...items].reverse().map(spotOf).find(Boolean) ?? null;
  const { near, wantNear } = useSearchNear(lastPin);

  const update = (next: Item[]) => {
    setItems(next);
    onChange(next.map((x) => ({ name: x.name, address: x.address ?? null, lat: x.lat ?? null, lng: x.lng ?? null })));
  };
  const clash = (name: string, except?: string) => items.some((x) => x.key !== except && x.name.toLowerCase() === name.toLowerCase());

  return (
    <div>
      <p className="font-medium">{label}</p>
      {hint && <p className="text-sm text-faint">{hint}</p>}
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
        <StopListEditor
          stops={items.map((x) => ({ key: x.key, name: x.name, address: x.address ?? null, pinned: !!spotOf(x), spot: spotOf(x) }))}
          near={near}
          onFocusNear={wantNear}
          onAdd={(p) => {
            setError("");
            if (items.length >= MAX_STOPS) return setError(`That's ${MAX_STOPS} stops — plenty`), false;
            if (clash(p.name)) return setError(`${p.name} is already on the list`), false;
            update([...items, { ...p, key: crypto.randomUUID() }]);
          }}
          onReplace={(key, p) => {
            setError("");
            if (clash(p.name, key)) return setError(`${p.name} is already on the list`), false;
            update(items.map((x) => (x.key === key ? { ...p, key } : x)));
          }}
          onMove={(key, dir) => {
            const i = items.findIndex((x) => x.key === key);
            const j = i + dir;
            if (j < 0 || j >= items.length) return;
            const next = [...items];
            [next[i], next[j]] = [next[j], next[i]];
            update(next);
          }}
          onRemove={(key) => update(items.filter((x) => x.key !== key))}
        />
        <RouteMap className="h-64 md:h-full md:min-h-64" stops={items.map((x, i) => ({ key: x.key, n: i + 1, name: x.name, spot: spotOf(x) }))} />
      </div>
      {error && <p className="mt-2 text-sm text-miss">{error}</p>}
      <p className="mt-2 text-xs text-faint">You can also add or change stops once the room is open. Place search by OpenStreetMap.</p>
    </div>
  );
}
