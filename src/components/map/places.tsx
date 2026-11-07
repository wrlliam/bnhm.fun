"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, DownIcon, SearchIcon, UpIcon } from "@/components/icons";
import { distanceLabel, isVenue, locate, nearbyPubs, type Place, type PlaceInput, searchPlaces, walkMinutes } from "@/lib/maps";
import { type LatLng, MAX_STOP_NAME } from "@/lib/pub-crawl";
import { StopPin } from "./stop-pin";

/** Where to centre place searches: the last pinned stop, else (once asked) the phone's position. */
export function useSearchNear(lastPin: LatLng | null) {
  const [device, setDevice] = useState<LatLng | null>(null);
  const asked = useRef(false);
  return {
    near: lastPin ?? device,
    /** Call when the user starts searching: asks for location once, only if nothing's pinned yet. */
    wantNear() {
      if (lastPin || asked.current) return;
      asked.current = true;
      void locate(8000).then((p) => p && setDevice({ lat: p.lat, lng: p.lng }));
    },
  };
}

const KIND_LABEL: Record<string, string> = { pub: "Pub", bar: "Bar", biergarten: "Beer garden", nightclub: "Club", restaurant: "Restaurant", cafe: "Café" };

type Status = "idle" | "searching" | "done" | "error";

/**
 * Type a pub name and pick it from the list; pubs and bars are listed first, with how far
 * each is from the last stop. Enter takes the top match. With the box empty, it suggests
 * pubs near the last stop. No match at all still adds the name, to pin later.
 */
export function PlaceSearch({
  near,
  nearName,
  onFocusNear,
  onPick,
  exclude = [],
  initial = "",
  placeholder = "Search for a pub",
  submitLabel = "Add",
  autoFocus,
  onCancel,
}: {
  near: LatLng | null;
  /** What `near` is, e.g. the last stop's name, for the suggestions heading. */
  nearName?: string | null;
  onFocusNear?: () => void;
  onPick: (p: PlaceInput) => Promise<boolean | void> | boolean | void;
  /** Names already on the list, left out of suggestions. */
  exclude?: string[];
  initial?: string;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [found, setFound] = useState<{ q: string; places: Place[]; status: Status }>({ q: "", places: [], status: "idle" });
  const [nearby, setNearby] = useState<{ at: string; places: Place[] }>({ at: "", places: [] });
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const q = text.trim();
  const nearKey = near ? `${near.lat},${near.lng}` : "";
  const skip = new Set(exclude.map((n) => n.toLowerCase()));

  const searching = q.length >= 2;
  const status: Status = searching ? (found.q === q ? found.status : "searching") : "idle";
  const list = (searching ? (found.q === q ? found.places : []) : nearby.at === nearKey ? nearby.places : []).filter((p) => !skip.has(p.name.toLowerCase()));
  const suggesting = !searching && list.length > 0;

  useEffect(() => {
    if (q.length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(q, near, ctl.signal)
        .then((places) => setFound({ q, places, status: "done" }))
        .catch((e: Error) => e.name !== "AbortError" && setFound({ q, places: [], status: "error" }));
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, near]);

  // suggestions for the empty box: pubs around the last stop
  useEffect(() => {
    if (!near || !open || nearby.at === nearKey) return;
    let live = true;
    void nearbyPubs(near).then((places) => live && setNearby({ at: nearKey, places }));
    return () => {
      live = false;
    };
  }, [near, nearKey, open, nearby.at]);

  async function pick(p: PlaceInput) {
    setBusy(true);
    const ok = await onPick(p);
    setBusy(false);
    if (ok !== false) {
      setText("");
      setActive(-1);
    }
  }

  const showList = open && (list.length > 0 || status === "searching" || status === "done" || status === "error");

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q || busy) return;
        void pick(list[active] ?? list[0] ?? { name: q.slice(0, MAX_STOP_NAME) });
      }}
    >
      <div className="flex gap-2">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-ink/15 bg-surface px-3 transition-colors focus-within:border-ink/60">
          <SearchIcon className="text-faint" />
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
            onFocus={() => {
              setOpen(true);
              onFocusNear?.();
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(list.length - 1, i + 1));
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
            aria-label={placeholder}
            aria-expanded={showList}
            aria-controls={`${id}-list`}
            aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
          />
          {text && (
            <button type="button" onClick={() => setText("")} aria-label="Clear" className="-mr-1 rounded p-1 text-faint transition-colors hover:text-ink">
              <CloseIcon />
            </button>
          )}
        </label>
        <button disabled={!q || busy} className="h-11 rounded-lg bg-ink px-4 font-medium text-paper transition-opacity disabled:opacity-40">
          {busy ? "Adding" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-11 px-2 text-sm text-faint transition-colors hover:text-ink">
            Cancel
          </button>
        )}
      </div>

      {showList && (
        <div className="pop absolute inset-x-0 top-full z-[1100] mt-2 overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          {suggesting && <p className="px-3 pb-1 pt-3 text-xs text-faint">Pubs near {nearName ?? "here"}</p>}
          {list.length > 0 && (
            <ul id={`${id}-list`} role="listbox" className="max-h-80 overflow-y-auto py-1">
              {list.map((p, i) => (
                <li key={`${p.name}|${p.lat}|${p.lng}`} id={`${id}-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void pick(p)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${i === active ? "bg-ink/8" : "hover:bg-ink/5"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      {p.address && <span className="block truncate text-xs text-faint">{p.address}</span>}
                    </span>
                    <span className="shrink-0 text-right text-xs leading-4">
                      {p.kind && KIND_LABEL[p.kind] && <span className={`block ${isVenue(p.kind) ? "text-hit" : "text-faint"}`}>{KIND_LABEL[p.kind]}</span>}
                      {near && <span className="block font-mono tabular-nums text-faint">{distanceLabel(near, p)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searching && list.length === 0 && (
            <p className="px-3 py-3 text-sm text-faint">
              {status === "searching"
                ? "Searching"
                : status === "error"
                  ? "Search isn't working right now. Press Add to use the name as typed"
                  : `Nothing called “${q}” nearby. Press Add to use the name as typed`}
            </p>
          )}
        </div>
      )}
    </form>
  );
}

export type EditorStop = { key: string; name: string; address: string | null; pinned: boolean; spot?: LatLng | null };

const iconButton = "flex size-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent";

/** Numbered stop list with search-to-add, tap-to-change, reorder and remove. */
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
  const lastPinned = [...stops].reverse().find((x) => x.spot);
  const names = stops.map((x) => x.name);
  return (
    <div className="min-w-0 space-y-3 text-left">
      {stops.length > 0 && (
        <ol className="divide-y divide-ink/8 rounded-xl border border-ink/10 bg-surface">
          {stops.map((x, i) => {
            const prev = stops[i - 1]?.spot;
            return (
              <li key={x.key} className="px-3 py-2">
                {editing === x.key ? (
                  <div className="py-1">
                    <PlaceSearch
                      near={x.spot ?? near}
                      nearName={x.name}
                      initial={x.name}
                      autoFocus
                      submitLabel="Save"
                      exclude={names.filter((n) => n !== x.name)}
                      onPick={async (p) => {
                        const ok = await onReplace(x.key, p);
                        if (ok !== false) setEditing(null);
                        return ok;
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <StopPin n={i + 1} />
                    <button onClick={() => setEditing(x.key)} className="min-w-0 flex-1 py-1 text-left" title="Change this stop">
                      <span className="block font-medium leading-5">{x.name}</span>
                      <span className={`block truncate text-xs leading-4 ${x.pinned ? "text-faint" : "text-miss"}`}>
                        {x.pinned ? (x.address ?? "On the map") : "Not on the map yet. Tap to find it"}
                        {prev && x.spot && <> · {walkMinutes(prev, x.spot)} min walk</>}
                      </span>
                    </button>
                    <span className="flex">
                      <button onClick={() => onMove(x.key, -1)} disabled={i === 0} aria-label={`Move ${x.name} up`} className={iconButton}>
                        <UpIcon />
                      </button>
                      <button onClick={() => onMove(x.key, 1)} disabled={i === stops.length - 1} aria-label={`Move ${x.name} down`} className={iconButton}>
                        <DownIcon />
                      </button>
                      <button onClick={() => onRemove(x.key)} aria-label={`Remove ${x.name}`} className={`${iconButton} hover:text-miss`}>
                        <CloseIcon />
                      </button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <PlaceSearch
        near={near}
        nearName={lastPinned?.name ?? "you"}
        onFocusNear={onFocusNear}
        onPick={onAdd}
        exclude={names}
        placeholder={stops.length ? "Add the next pub" : "Search for the first pub"}
      />
    </div>
  );
}
