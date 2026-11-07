"use client";

import { useEffect, useId, useRef, useState } from "react";
import { locate, type Place, type PlaceInput, searchPlaces } from "@/lib/maps";
import { type LatLng, MAX_STOP_NAME } from "@/lib/pub-crawl";

/** Where to centre place searches: the last pinned stop, else (once asked) the phone's position. */
export function useSearchNear(lastPin: LatLng | null) {
  const [device, setDevice] = useState<LatLng | null>(null);
  const asked = useRef(false);
  return {
    near: lastPin ?? device,
    /** Call when the user starts typing: asks for location once, only if nothing's pinned yet. */
    wantNear() {
      if (lastPin || asked.current) return;
      asked.current = true;
      void locate(8000).then((p) => p && setDevice({ lat: p.lat, lng: p.lng }));
    },
  };
}

/**
 * Type a pub name, pick it from the suggestions. Pressing Enter without picking takes the
 * top match (so it still lands on the map), or just the name if nothing matches.
 */
export function PlaceSearch({
  near,
  onFocusNear,
  onPick,
  initial = "",
  placeholder,
  submitLabel = "Add",
  autoFocus,
  onCancel,
}: {
  near: LatLng | null;
  onFocusNear?: () => void;
  onPick: (p: PlaceInput) => Promise<boolean | void> | boolean | void;
  initial?: string;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [results, setResults] = useState<{ q: string; places: Place[] }>({ q: "", places: [] });
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const q = text.trim();
  const places = results.q === q ? results.places : [];

  useEffect(() => {
    if (q.length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(q, near, ctl.signal)
        .then((places) => {
          setResults({ q, places });
          setError("");
        })
        .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    }, 280);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, near]);

  async function pick(p: PlaceInput) {
    setBusy(true);
    const ok = await onPick(p);
    setBusy(false);
    if (ok !== false) {
      setText("");
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q || busy) return;
        // Enter without picking takes the top match; with no match, just the name (pinned later if it turns up)
        void pick(places[active] ?? places[0] ?? { name: q });
      }}
    >
      <div className="flex gap-2">
        <input
          value={text}
          autoFocus={autoFocus}
          maxLength={MAX_STOP_NAME}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
            onFocusNear?.();
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(places.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(-1, i - 1));
            } else if (e.key === "Escape") {
              if (onCancel) onCancel();
              else setOpen(false);
            }
          }}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open && places.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-ink"
        />
        <button disabled={!q || busy} className="rounded-md bg-ink px-4 font-medium text-paper disabled:opacity-40">
          {busy ? "…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-1 text-sm text-faint">
            Cancel
          </button>
        )}
      </div>
      {open && places.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-[1100] mt-1 overflow-hidden rounded-xl border border-ink/15 bg-surface shadow-lg">
          {places.map((p, i) => (
            <li key={`${p.name}|${p.address}|${i}`} id={`${id}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pick(p)}
                className={`block w-full px-3 py-2 text-left ${i === active ? "bg-ink/10" : "hover:bg-ink/5"}`}
              >
                <span className="block truncate font-medium">{p.name}</span>
                {p.address && <span className="block truncate text-xs text-faint">{p.address}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-miss">{error} — you can still add the name.</p>}
    </form>
  );
}

export type EditorStop = { key: string; name: string; address: string | null; pinned: boolean };

/** Numbered stop list with search-to-add, search-to-change, reorder and remove. */
export function StopListEditor({
  stops,
  near,
  onFocusNear,
  onAdd,
  onReplace,
  onMove,
  onRemove,
}: {
  stops: EditorStop[];
  near: LatLng | null;
  onFocusNear?: () => void;
  onAdd: (p: PlaceInput) => Promise<boolean | void> | boolean | void;
  onReplace: (key: string, p: PlaceInput) => Promise<boolean | void> | boolean | void;
  onMove: (key: string, dir: -1 | 1) => void;
  onRemove: (key: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="space-y-3 text-left">
      {stops.length > 0 && (
        <ol className="divide-y divide-ink/10 rounded-xl border border-ink/15">
          {stops.map((x, i) => (
            <li key={x.key} className="px-3 py-2">
              {editing === x.key ? (
                <PlaceSearch
                  near={near}
                  initial={x.name}
                  autoFocus
                  submitLabel="Save"
                  onPick={async (p) => {
                    const ok = await onReplace(x.key, p);
                    if (ok !== false) setEditing(null);
                    return ok;
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-5 font-mono text-xs text-faint">{i + 1}</span>
                  <button onClick={() => setEditing(x.key)} className="min-w-0 flex-1 text-left" title="Change">
                    <span className="block truncate">{x.name}</span>
                    <span className={`block truncate text-xs ${x.pinned ? "text-faint" : "text-miss"}`}>
                      {x.pinned ? (x.address ?? "On the map") : "Not on the map yet — tap to pick the place"}
                    </span>
                  </button>
                  <button onClick={() => onMove(x.key, -1)} disabled={i === 0} aria-label={`Move ${x.name} up`} className="px-1 text-faint disabled:opacity-20">
                    ↑
                  </button>
                  <button onClick={() => onMove(x.key, 1)} disabled={i === stops.length - 1} aria-label={`Move ${x.name} down`} className="px-1 text-faint disabled:opacity-20">
                    ↓
                  </button>
                  <button onClick={() => onRemove(x.key)} aria-label={`Remove ${x.name}`} className="px-1 text-miss">
                    ×
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <PlaceSearch near={near} onFocusNear={onFocusNear} onPick={onAdd} placeholder={stops.length ? "Add another stop" : "Search for the first pub"} />
    </div>
  );
}
