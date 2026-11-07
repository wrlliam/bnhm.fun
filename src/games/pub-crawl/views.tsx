"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/room/avatar";
import { GameLobby } from "@/components/room/game-bits";
import { act, BigButton, RoomShell } from "@/components/room/room-shell";
import { StopListEditor, useSearchNear } from "@/components/map/places";
import { type MapStop, RouteMap, useWalkingRoute } from "@/components/map/route-map";
import { directionsLink, locate, type PlaceInput, routeLink, searchPlaces } from "@/lib/maps";
import { clockTime, formatDuration, formatKm, type LatLng, stepsFor } from "@/lib/pub-crawl";
import { fileToPhoto, roomAction, type RoomView, type StreamStatus } from "@/lib/rooms/client";
import type { PubGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };
type Person = PubGameView["people"][number];
type StopV = PubGameView["stops"][number];

const pub = (room: RoomView) => room.game as PubGameView;
const playerOf = (room: RoomView, id: string) => room.players.find((p) => p.id === id);
const nameOf = (room: RoomView, id: string) => (id === room.me ? "You" : (playerOf(room, id)?.name ?? "Someone"));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? "th"}`;

// ---- phone ------------------------------------------------------------------

export function PubPlayer({ room, token, hostToken, status }: Props) {
  const g = pub(room);
  return (
    <RoomShell
      room={room}
      status={status}
      token={token}
      hostToken={hostToken}
      menu={
        room.isHost && g.status !== "lobby" ? (
          <details>
            <summary className="cursor-pointer text-sm font-medium">Edit the stops</summary>
            <div className="mt-3">
              <StopsEditor room={room} hostToken={hostToken} />
            </div>
          </details>
        ) : undefined
      }
    >
      {g.status === "lobby" && (
        <GameLobby
          room={room}
          token={token}
          hostToken={hostToken}
          minPlayers={1}
          howItWorks="everyone makes their own way round the stops. At each one tap “I'm here”, then snap your empty glass to tick it off. Keep count of your drinks. First to finish every stop wins."
        >
          <StopsEditor room={room} hostToken={hostToken} />
        </GameLobby>
      )}
      {g.status === "lobby" && !room.isHost && <StopList room={room} />}
      {g.status === "crawling" && <Crawling room={room} token={token} hostToken={hostToken} />}
      {g.status === "finished" && <Results room={room} hostToken={hostToken} />}
    </RoomShell>
  );
}

function Crawling({ room, token, hostToken }: { room: RoomView; token: string; hostToken: string | null }) {
  const g = pub(room);
  const me = g.me;
  if (!me) return null;
  const current = g.stops.find((x) => x.id === me.currentStop) ?? null;
  const index = current ? g.stops.indexOf(current) : -1;

  return (
    <div className="space-y-8">
      <Progress room={room} person={me} />
      {current ? (
        <CurrentStop key={current.id} room={room} token={token} stop={current} index={index} person={me} />
      ) : (
        <Finished room={room} person={me} />
      )}
      <CrawlMap room={room} person={me} />
      <MyStops room={room} token={token} person={me} />
      <WhereIsEveryone room={room} />
      <LatestPhotos room={room} />
      {room.isHost && (
        <button
          onClick={() => confirm("End the crawl for everyone and show the results?") && act(room, token, hostToken, { type: "end" })}
          className="w-full rounded-md border-2 border-ink py-3 font-medium transition-colors hover:bg-ink hover:text-paper"
        >
          End the crawl and show results
        </button>
      )}
    </div>
  );
}

/** One dot per stop: filled when ticked off, ringed where you are now. */
function Progress({ room, person, big = false }: { room: RoomView; person: Person; big?: boolean }) {
  const g = pub(room);
  return (
    <div className="flex items-center gap-1.5" aria-label={`${person.done} of ${g.stops.length} stops done`}>
      {g.stops.map((x) => {
        const v = person.visits[x.id];
        const here = v.arrivedAt && !v.doneAt;
        return (
          <span
            key={x.id}
            title={x.name}
            className={`h-2 flex-1 rounded-full ${big ? "h-3" : ""} ${
              v.skipped ? "bg-ink/25" : v.doneAt ? "bg-hit" : here ? "bg-hit/40 ring-2 ring-hit" : "bg-ink/10"
            }`}
          />
        );
      })}
    </div>
  );
}

function CurrentStop({ room, token, stop, index, person }: { room: RoomView; token: string; stop: StopV; index: number; person: Person }) {
  const g = pub(room);
  const v = person.visits[stop.id];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const run = async (what: string, body: Record<string, unknown>) => {
    setBusy(what);
    setError("");
    await act(room, token, null, { stopId: stop.id, ...body });
    setBusy(null);
  };
  const others = stop.arrivals.filter((id) => id !== room.me);

  return (
    <section className="pop space-y-5">
      <div>
        <p className="text-sm text-faint">
          Stop {index + 1} of {g.stops.length}
          {v.arrivedAt && <> · here since {clockTime(v.arrivedAt)}</>}
        </p>
        <h2 className="font-hand text-6xl font-bold leading-none">{stop.name}</h2>
        <a href={directionsLink(stop.name, stop.spot)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline underline-offset-4">
          Directions
        </a>
        {others.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-faint">
            <span className="flex -space-x-2">
              {others.slice(0, 6).map((id) => {
                const p = playerOf(room, id);
                return p ? <Avatar key={id} player={p} size={24} ring="ring-paper" /> : null;
              })}
            </span>
            {others.length === 1 ? `${nameOf(room, others[0])} is` : `${others.length} others are`} here
          </div>
        )}
      </div>

      {!v.arrivedAt ? (
        <div className="space-y-3">
          <BigButton
            className="w-full py-5 text-xl"
            disabled={!!busy}
            onClick={async () => {
              setBusy("arrive");
              const spot = await locate();
              await act(room, token, null, { type: "arrive", stopId: stop.id, ...(spot ?? {}) });
              setBusy(null);
            }}
          >
            {busy === "arrive" ? "Checking in…" : "I'm here"}
          </BigButton>
          <p className="text-xs text-faint">Your phone may ask for your location. It&rsquo;s only used to work out the distance you walked.</p>
          <button
            disabled={!!busy}
            onClick={() => confirm(`Skip ${stop.name}?`) && run("skip", { type: "skip" })}
            className="text-sm text-faint underline underline-offset-4 hover:text-ink"
          >
            Skip this stop
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <BigButton className="w-full py-5 text-xl" disabled={!!busy} onClick={() => file.current?.click()}>
            {busy === "proof" ? "Sending…" : "Snap your empty glass"}
          </BigButton>
          <input
            ref={file}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy("proof");
              setError("");
              try {
                const photo = await fileToPhoto(f);
                await act(room, token, null, { type: "proof", stopId: stop.id, photo });
              } catch (err) {
                setError((err as Error).message);
              }
              setBusy(null);
            }}
          />
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <button disabled={!!busy} onClick={() => run("moveOn", { type: "moveOn" })} className="underline underline-offset-4">
              Move on without a photo
            </button>
            <button disabled={!!busy} onClick={() => run("undo", { type: "undo" })} className="text-faint underline underline-offset-4 hover:text-ink">
              Not here yet
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-miss">{error}</p>}

      <DrinkCounter room={room} token={token} stop={stop} person={person} />
    </section>
  );
}

function DrinkCounter({ room, token, stop, person }: { room: RoomView; token: string; stop: StopV; person: Person }) {
  const here = person.visits[stop.id].drinks;
  const bump = (delta: number) => act(room, token, null, { type: "drink", stopId: stop.id, delta });
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink/15 bg-surface p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Drinks here</p>
        <p className="text-xs text-faint">{plural(person.drinks, "drink")} tonight</p>
      </div>
      <button
        onClick={() => bump(-1)}
        disabled={here === 0}
        aria-label="One fewer drink"
        className="size-12 rounded-full border-2 border-ink text-2xl font-bold leading-none disabled:opacity-30"
      >
        −
      </button>
      <span className="w-10 text-center font-mono text-3xl font-bold tabular-nums" aria-live="polite">
        {here}
      </span>
      <button onClick={() => bump(1)} aria-label="One more drink" className="size-12 rounded-full bg-ink text-2xl font-bold leading-none text-paper">
        +
      </button>
    </div>
  );
}

function Finished({ room, person }: { room: RoomView; person: Person }) {
  const g = pub(room);
  const place = g.ranking.filter((id) => g.people.find((p) => p.playerId === id)?.complete).indexOf(person.playerId) + 1;
  const left = g.people.filter((p) => p.done < g.stops.length).length;
  return (
    <section className="pop rounded-2xl bg-hit/10 p-5">
      <h2 className="font-hand text-5xl font-bold">{person.complete ? (place === 1 ? "First to finish!" : `Done — ${ordinal(place)} to finish`) : "That's your lot"}</h2>
      <p className="mt-1">
        {person.finishedAt && g.startedAt && <>Every stop in {formatDuration(person.finishedAt - g.startedAt)}. </>}
        {plural(person.drinks, "drink")}, {plural(person.photos, "photo")}
        {person.km > 0 && <>, about {formatKm(person.km)} walked</>}.
      </p>
      <p className="mt-2 text-sm text-faint">
        {left ? `Waiting on ${plural(left, "other")}. The results show once everyone's done or the host ends it.` : "Everyone's done."}
      </p>
    </section>
  );
}

/** Every stop with how you did there. Done stops can be stepped back, or the photo retaken. */
function MyStops({ room, token, person }: { room: RoomView; token: string; person: Person }) {
  const g = pub(room);
  return (
    <section>
      <h3 className="text-sm font-medium text-faint">Your night</h3>
      <ol className="mt-2 divide-y divide-ink/10">
        {g.stops.map((x, i) => {
          const v = person.visits[x.id];
          const current = person.currentStop === x.id;
          return (
            <li key={x.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  v.skipped ? "bg-ink/10 text-faint" : v.doneAt ? "bg-hit text-paper" : current ? "ring-2 ring-hit" : "bg-ink/5 text-faint"
                }`}
              >
                {v.doneAt && !v.skipped ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${v.skipped ? "text-faint line-through" : ""}`}>{x.name}</p>
                <p className="text-xs text-faint">
                  {v.skipped
                    ? "Skipped"
                    : v.arrivedAt
                      ? `${clockTime(v.arrivedAt)}${v.drinks ? ` · ${plural(v.drinks, "drink")}` : ""}${v.doneAt && !v.photo ? " · no photo" : ""}`
                      : current
                        ? "Up next"
                        : ""}
                </p>
              </div>
              {v.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.photo} alt={`Your glass at ${x.name}`} className="size-11 rounded-md object-cover" />
              )}
              {v.doneAt && (
                <button onClick={() => act(room, token, null, { type: "undo", stopId: x.id })} className="text-xs text-faint underline underline-offset-4 hover:text-ink">
                  Undo
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StopList({ room }: { room: RoomView }) {
  const g = pub(room);
  if (!g.stops.length) return <p className="mt-6 text-faint">The host hasn&rsquo;t added any stops yet.</p>;
  return (
    <section className="mt-8">
      <h3 className="text-sm font-medium text-faint">Tonight&rsquo;s route</h3>
      <ol className="mt-2 space-y-1.5">
        {g.stops.map((x, i) => (
          <li key={x.id} className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-faint">{i + 1}</span>
            <span className="font-hand text-3xl">{x.name}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <CrawlMap room={room} />
      </div>
    </section>
  );
}

function WhereIsEveryone({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = pub(room);
  const stopName = (id: string | null) => g.stops.find((x) => x.id === id)?.name;
  return (
    <section>
      <h3 className={`font-medium text-faint ${big ? "text-lg" : "text-sm"}`}>Where everyone is</h3>
      <ul className={`mt-2 ${big ? "space-y-4" : "space-y-2.5"}`}>
        {g.ranking.map((id) => {
          const p = playerOf(room, id);
          const person = g.people.find((x) => x.playerId === id)!;
          if (!p) return null;
          const at = person.currentStop ? person.visits[person.currentStop] : null;
          return (
            <li key={id} className="flex items-center gap-3">
              <Avatar player={p} size={big ? 56 : 36} dim={!p.online} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`truncate font-hand font-bold ${big ? "text-4xl" : "text-2xl"}`}>{p.id === room.me ? "You" : p.name}</span>
                  <span className={`shrink-0 text-faint ${big ? "text-lg" : "text-xs"}`}>
                    {person.currentStop
                      ? `${at?.arrivedAt ? "at" : "heading to"} ${stopName(person.currentStop)}`
                      : person.complete
                        ? `finished ${person.finishedAt ? clockTime(person.finishedAt) : ""}`
                        : "done for the night"}
                    {" · "}
                    {plural(person.drinks, "drink")}
                  </span>
                </div>
                <div className="mt-1">
                  <Progress room={room} person={person} big={big} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type Shot = { url: string; playerId: string; stopId: string; at: number };

function allPhotos(g: PubGameView): Shot[] {
  return g.people
    .flatMap((p) => g.stops.map((x) => ({ v: p.visits[x.id], playerId: p.playerId, stopId: x.id })))
    .filter((s) => s.v.photo)
    .map((s) => ({ url: s.v.photo!, playerId: s.playerId, stopId: s.stopId, at: s.v.photoAt ?? 0 }))
    .sort((a, b) => b.at - a.at);
}

function LatestPhotos({ room, big = false, limit = 8 }: { room: RoomView; big?: boolean; limit?: number }) {
  const g = pub(room);
  const shots = allPhotos(g).slice(0, limit);
  if (!shots.length) return null;
  return (
    <section>
      <h3 className={`font-medium text-faint ${big ? "text-lg" : "text-sm"}`}>Latest proof</h3>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {shots.map((s) => (
          <Photo key={s.url} room={room} shot={s} />
        ))}
      </div>
    </section>
  );
}

function Photo({ room, shot, big = false, hostToken }: { room: RoomView; shot: Shot; big?: boolean; hostToken?: string | null }) {
  const p = playerOf(room, shot.playerId);
  const stop = pub(room).stops.find((x) => x.id === shot.stopId);
  return (
    <figure className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shot.url} alt={`${p?.name ?? "Someone"}'s glass at ${stop?.name ?? "a stop"}`} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
      {p && (
        <span className="absolute bottom-1 left-1">
          <Avatar player={p} size={big ? 36 : 22} ring="ring-paper" />
        </span>
      )}
      {room.isHost && hostToken !== undefined && (
        <button
          onClick={() => confirm("Take this photo down?") && act(room, null, hostToken, { type: "removePhoto", playerId: shot.playerId, stopId: shot.stopId })}
          className="absolute right-1 top-1 rounded-full bg-paper/90 px-2 text-xs text-miss"
          aria-label="Remove photo"
        >
          ×
        </button>
      )}
    </figure>
  );
}

// ---- host: the stop list ---------------------------------------------------------

export function StopsEditor({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = pub(room);
  const lastPin = [...g.stops].reverse().find((x) => x.pinned)?.spot ?? null;
  const { near, wantNear } = useSearchNear(lastPin);
  const tried = useRef(new Set<string>());
  const unpinned = room.isHost ? g.stops.filter((x) => !x.pinned).map((x) => x.id).join(",") : "";

  // stops added by name only (or from before pins existed) get the best match near the others
  useEffect(() => {
    if (!unpinned) return;
    const todo = g.stops.filter((x) => !x.pinned && !tried.current.has(x.id));
    for (const x of todo) tried.current.add(x.id);
    void (async () => {
      for (const x of todo) {
        const [best] = await searchPlaces(x.name, lastPin).catch(() => []);
        if (best) await roomAction(room.code, { type: "pinStop", hostToken: hostToken ?? undefined, id: x.id, lat: best.lat, lng: best.lng, address: best.address });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per newly unpinned stop
  }, [unpinned]);

  if (!room.isHost) return null;
  const send = (body: Record<string, unknown>) => act(room, null, hostToken, body);
  const place = (p: PlaceInput) => ({ name: p.name, lat: p.lat ?? null, lng: p.lng ?? null, address: p.address ?? null });

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Stops {g.stops.length > 0 && <span className="text-faint">({g.stops.length})</span>}</p>
      <StopListEditor
        stops={g.stops.map((x) => ({ key: x.id, name: x.name, address: x.address, pinned: x.pinned }))}
        near={near}
        onFocusNear={wantNear}
        onAdd={(p) => send({ type: "addStop", ...place(p) })}
        onReplace={(id, p) => send({ type: "pinStop", id, ...place(p) })}
        onMove={(id, dir) => void send({ type: "moveStop", id, dir })}
        onRemove={(id) => {
          const x = g.stops.find((s) => s.id === id);
          if (g.status === "lobby" || confirm(`Remove ${x?.name ?? "this stop"}? Check-ins and photos there go too.`)) void send({ type: "removeStop", id });
        }}
      />
      {g.status === "lobby" && <CrawlMap room={room} />}
    </div>
  );
}

/** Pins for the map: coloured by how this person's doing, when there is one. */
function mapStops(g: PubGameView, person?: Person | null): MapStop[] {
  return g.stops.map((x, i) => {
    const v = person?.visits[x.id];
    return {
      key: x.id,
      n: i + 1,
      name: x.name,
      spot: x.spot,
      state: !person ? "todo" : v?.skipped ? "skipped" : v?.doneAt ? "done" : person.currentStop === x.id ? "current" : "todo",
    };
  });
}

/** The route on a real map, with the walking distance and a link to open it in Google Maps. */
function CrawlMap({ room, person, big = false }: { room: RoomView; person?: Person | null; big?: boolean }) {
  const g = pub(room);
  const stops = mapStops(g, person);
  const spots = stops.map((x) => x.spot).filter((p): p is LatLng => !!p);
  const route = useWalkingRoute(spots);
  const link = routeLink(spots);
  if (!spots.length) return null;
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className={`font-medium text-faint ${big ? "text-2xl" : "text-sm"}`}>The route</h3>
        <p className={`text-faint ${big ? "text-xl" : "text-xs"}`}>
          {route && (
            <>
              {formatKm(route.km)} walk · about {route.minutes} min on foot
            </>
          )}
          {route && link && !big && " · "}
          {link && !big && (
            <a href={link} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-4">
              Open in Google Maps
            </a>
          )}
        </p>
      </div>
      <div className="mt-2">
        <RouteMap stops={stops} className={big ? "h-[55vh]" : "h-64"} labels={big} />
      </div>
      {spots.length < g.stops.length && (
        <p className={`mt-1 text-faint ${big ? "text-lg" : "text-xs"}`}>
          {g.stops.length - spots.length} {g.stops.length - spots.length === 1 ? "stop isn't" : "stops aren't"} on the map yet
        </p>
      )}
    </section>
  );
}

// ---- results ----------------------------------------------------------------------

export function Results({ room, hostToken, big = false }: { room: RoomView; hostToken: string | null; big?: boolean }) {
  const g = pub(room);
  const people = new Map(g.people.map((p) => [p.playerId, p]));
  const ranked = g.ranking.map((id) => people.get(id)!).filter((p) => playerOf(room, p.playerId));
  const finishers = ranked.filter((p) => p.complete);
  const duration = g.startedAt && g.endedAt ? g.endedAt - g.startedAt : null;
  const shots = allPhotos(g).reverse();
  const route = useWalkingRoute(g.stops.map((x) => x.spot).filter((p): p is LatLng => !!p));
  const km = route?.km ?? g.routeKm;

  const stats = [
    { label: g.stops.length === 1 ? "stop" : "stops", value: String(g.stops.length) },
    { label: route ? "walk between stops" : "walked, roughly", value: km > 0 ? formatKm(km) : "—" },
    { label: g.totalDrinks === 1 ? "drink" : "drinks", value: String(g.totalDrinks) },
    { label: g.totalPhotos === 1 ? "empty glass" : "empty glasses", value: String(g.totalPhotos) },
    ...(duration ? [{ label: "out", value: formatDuration(duration) }] : []),
  ];

  return (
    <div className={`pop ${big ? "space-y-14" : "space-y-10"}`}>
      <header>
        <h2 className={`font-hand font-bold leading-none ${big ? "text-9xl" : "text-6xl"}`}>That&rsquo;s the crawl</h2>
        <dl className={`mt-6 grid gap-3 ${big ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-3"}`}>
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-ink/5 p-4">
              <dd className={`font-mono font-bold tabular-nums ${big ? "text-6xl" : "text-3xl"}`}>{s.value}</dd>
              <dt className={`text-faint ${big ? "text-xl" : "text-sm"}`}>{s.label}</dt>
            </div>
          ))}
        </dl>
        {km > 0 && (
          <p className={`mt-2 text-faint ${big ? "text-lg" : "text-xs"}`}>
            About {stepsFor(km).toLocaleString()} steps{route ? " along the walking route between the stops" : " between the stops, measured from where phones checked in"}.
          </p>
        )}
      </header>

      {shots.length > 0 && <Slideshow room={room} shots={shots} big={big} />}

      <section>
        <h3 className={`font-medium text-faint ${big ? "text-2xl" : "text-sm"}`}>Finish order</h3>
        {finishers.length === 0 && <p className={`mt-2 ${big ? "text-2xl" : ""}`}>Nobody made it to every stop. Next time.</p>}
        <ol className={`mt-3 grid gap-3 ${big ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
          {finishers.slice(0, 3).map((p, i) => {
            const pl = playerOf(room, p.playerId)!;
            return (
              <li key={p.playerId} className={`flex items-center gap-4 rounded-2xl p-4 ${i === 0 ? "bg-hit/15" : "bg-ink/5"}`}>
                <span className={`font-hand font-bold ${i === 0 ? "text-hit" : "text-faint"} ${big ? "text-7xl" : "text-5xl"}`}>{i + 1}</span>
                <Avatar player={pl} size={big ? 80 : 52} ring={i === 0 ? "ring-hit" : undefined} />
                <div className="min-w-0">
                  <p className={`truncate font-hand font-bold ${big ? "text-5xl" : "text-3xl"}`}>{nameOf(room, p.playerId)}</p>
                  <p className={`text-faint ${big ? "text-lg" : "text-sm"}`}>
                    {p.finishedAt && clockTime(p.finishedAt)}
                    {p.finishedAt && g.startedAt && ` · ${formatDuration(p.finishedAt - g.startedAt)}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <Awards room={room} ranked={ranked} big={big} />

      <CrawlMap room={room} big={big} />

      <section>
        <h3 className={`font-medium text-faint ${big ? "text-2xl" : "text-sm"}`}>Everyone</h3>
        <div className="mt-2 overflow-x-auto">
          <table className={`w-full whitespace-nowrap text-left ${big ? "text-2xl" : "text-sm"}`}>
            <thead className="text-faint">
              <tr>
                <th className="py-2 pr-3 font-normal">#</th>
                <th className="py-2 pr-3 font-normal">Name</th>
                <th className="py-2 pr-3 text-right font-normal">Stops</th>
                <th className="py-2 pr-3 text-right font-normal">Photos</th>
                <th className="py-2 pr-3 text-right font-normal">Drinks</th>
                <th className="py-2 pr-3 text-right font-normal">Walked</th>
                <th className="py-2 text-right font-normal">Finished</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, i) => {
                const pl = playerOf(room, p.playerId)!;
                return (
                  <tr key={p.playerId} className="border-t border-ink/10">
                    <td className="py-2 pr-3 font-mono text-faint">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <Avatar player={pl} size={big ? 40 : 24} />
                        <span className="truncate font-medium">{nameOf(room, p.playerId)}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">
                      {p.visited}/{g.stops.length}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{p.photos}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{p.drinks}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{p.km > 0 ? formatKm(p.km) : "—"}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{p.complete && p.finishedAt ? clockTime(p.finishedAt) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={big ? "space-y-12" : "space-y-8"}>
        <h3 className={`font-medium text-faint ${big ? "text-2xl" : "text-sm"}`}>Stop by stop</h3>
        {g.stops.map((x, i) => {
          const stopShots = shots.filter((s) => s.stopId === x.id);
          return (
            <article key={x.id}>
              <div className="flex items-baseline gap-3">
                <span className={`font-mono text-faint ${big ? "text-2xl" : "text-sm"}`}>{i + 1}</span>
                <h4 className={`font-hand font-bold leading-none ${big ? "text-6xl" : "text-4xl"}`}>{x.name}</h4>
              </div>
              <p className={`mt-1 text-faint ${big ? "text-xl" : "text-sm"}`}>
                {x.arrivals.length
                  ? `${nameOf(room, x.arrivals[0])} got there first${x.firstAt ? ` at ${clockTime(x.firstAt)}` : ""} · ${plural(x.arrivals.length, "visitor")} · ${plural(x.drinks, "drink")}`
                  : "Nobody made it here"}
              </p>
              {stopShots.length > 0 && (
                <div className={`mt-3 grid gap-2 ${big ? "grid-cols-6" : "grid-cols-3"}`}>
                  {stopShots.map((s) => (
                    <Photo key={s.url} room={room} shot={s} big={big} hostToken={big ? undefined : hostToken} />
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>

      {room.isHost && !big && (
        <div className="flex flex-wrap gap-3">
          <button onClick={() => act(room, null, hostToken, { type: "resume" })} className="rounded-md border-2 border-ink px-4 py-2 text-sm font-medium">
            Reopen the crawl
          </button>
          <button
            onClick={() => confirm("Start a fresh crawl on the same route? Tonight's check-ins, drinks and photos are cleared.") && act(room, null, hostToken, { type: "start" })}
            className="rounded-md px-4 py-2 text-sm text-miss underline underline-offset-4"
          >
            Start again from scratch
          </button>
        </div>
      )}
    </div>
  );
}

function Awards({ room, ranked, big }: { room: RoomView; ranked: Person[]; big: boolean }) {
  const g = pub(room);
  if (!ranked.length) return null;
  const firsts = new Map<string, number>();
  for (const x of g.stops) if (x.arrivals[0]) firsts.set(x.arrivals[0], (firsts.get(x.arrivals[0]) ?? 0) + 1);
  const most = (xs: Person[], score: (p: Person) => number) => {
    const top = [...xs].sort((a, b) => score(b) - score(a))[0];
    return top && score(top) > 0 ? top : null;
  };
  const awards = [
    { title: "First through the door", who: most(ranked, (p) => firsts.get(p.playerId) ?? 0), note: (p: Person) => `first in at ${plural(firsts.get(p.playerId) ?? 0, "stop")}` },
    { title: "Thirstiest", who: most(ranked, (p) => p.drinks), note: (p: Person) => plural(p.drinks, "drink") },
    { title: "Most steps", who: most(ranked, (p) => p.km), note: (p: Person) => `about ${formatKm(p.km)}` },
    { title: "Camera ready", who: most(ranked, (p) => p.photos), note: (p: Person) => plural(p.photos, "photo") },
  ].filter((a): a is typeof a & { who: Person } => !!a.who);
  if (!awards.length || ranked.length < 2) return null;
  return (
    <section>
      <h3 className={`font-medium text-faint ${big ? "text-2xl" : "text-sm"}`}>Awards</h3>
      <ul className={`mt-3 grid gap-3 ${big ? "grid-cols-4" : "grid-cols-2"}`}>
        {awards.map((a) => {
          const p = playerOf(room, a.who.playerId)!;
          return (
            <li key={a.title} className="rounded-2xl border border-ink/10 p-4">
              <p className={`font-medium ${big ? "text-xl" : "text-sm"}`}>{a.title}</p>
              <div className="mt-2 flex items-center gap-2">
                <Avatar player={p} size={big ? 48 : 28} />
                <span className={`truncate font-hand font-bold ${big ? "text-4xl" : "text-2xl"}`}>{nameOf(room, p.id)}</span>
              </div>
              <p className={`text-faint ${big ? "text-lg" : "text-xs"}`}>{a.note(a.who)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Every proof photo in turn, big. */
function Slideshow({ room, shots, big }: { room: RoomView; shots: Shot[]; big: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (shots.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % shots.length), 4000);
    return () => clearInterval(t);
  }, [shots.length]);
  const shot = shots[i % shots.length];
  const p = playerOf(room, shot.playerId);
  const stop = pub(room).stops.find((x) => x.id === shot.stopId);
  return (
    <section className="overflow-hidden rounded-3xl bg-ink">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={shot.url} src={shot.url} alt="" className={`pop w-full object-contain ${big ? "h-[60vh]" : "h-80"}`} />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
          {p && <Avatar player={p} size={big ? 56 : 36} />}
          <div className="min-w-0">
            <p className={`truncate font-hand font-bold ${big ? "text-5xl" : "text-3xl"}`}>{p?.name ?? "Someone"}</p>
            <p className={big ? "text-xl" : "text-sm"}>
              {stop?.name}
              {shot.at ? ` · ${clockTime(shot.at)}` : ""}
            </p>
          </div>
          <span className={`ml-auto font-mono ${big ? "text-xl" : "text-xs"}`}>
            {(i % shots.length) + 1}/{shots.length}
          </span>
        </div>
      </div>
      {!big && shots.length > 1 && (
        <div className="flex justify-between px-4 py-2 text-sm text-paper">
          <button onClick={() => setI((n) => (n - 1 + shots.length) % shots.length)}>← Previous</button>
          <button onClick={() => setI((n) => (n + 1) % shots.length)}>Next →</button>
        </div>
      )}
    </section>
  );
}

// ---- TV ---------------------------------------------------------------------------

export function PubTv({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = pub(room);
  if (g.status === "finished") return <Results room={room} hostToken={hostToken} big />;
  if (g.status === "lobby") {
    return (
      <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
        <div>
          <h2 className="font-hand text-9xl font-bold leading-none">Pub Crawl</h2>
          <p className="mt-4 max-w-2xl text-2xl">
            Join on your phone with the code in the corner. At each stop, tap &ldquo;I&rsquo;m here&rdquo; and snap your empty glass. First round
            every stop wins.
          </p>
          {room.isHost && (
            <BigButton className="mt-8 px-10 py-4 text-xl" disabled={!g.stops.length} onClick={() => act(room, null, hostToken, { type: "start" })}>
              {g.stops.length ? `Start the crawl (${plural(room.players.length, "player")})` : "Add stops on your phone first"}
            </BigButton>
          )}
        </div>
        <div>
          <h3 className="text-lg text-faint">Tonight&rsquo;s route</h3>
          {g.stops.length ? (
            <ol className="mt-3 space-y-2">
              {g.stops.map((x, i) => (
                <li key={x.id} className="flex items-baseline gap-4">
                  <span className="font-mono text-xl text-faint">{i + 1}</span>
                  <span className="font-hand text-5xl">{x.name}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-2xl text-faint">No stops yet</p>
          )}
        </div>
        <div className="lg:col-span-2">
          <CrawlMap room={room} big />
        </div>
      </div>
    );
  }
  return (
    <div className="grid min-h-0 flex-1 gap-12 lg:grid-cols-[1fr_420px]">
      <div className="space-y-10">
        <div className="flex items-baseline justify-between gap-6">
          <h2 className="font-hand text-8xl font-bold leading-none">Pub Crawl</h2>
          <p className="text-2xl text-faint">
            {plural(g.totalDrinks, "drink")} · {plural(g.totalPhotos, "empty glass", "empty glasses")}
            {g.startedAt && <Elapsed since={g.startedAt} />}
          </p>
        </div>
        <WhereIsEveryone room={room} big />
        <CrawlMap room={room} big />
        {room.isHost && (
          <BigButton className="px-8 py-3 text-lg" onClick={() => confirm("End the crawl and show the results?") && act(room, null, hostToken, { type: "end" })}>
            End the crawl and show results
          </BigButton>
        )}
      </div>
      <aside className="space-y-10">
        <section>
          <h3 className="text-lg text-faint">Stops</h3>
          <ol className="mt-3 space-y-3">
            {g.stops.map((x, i) => (
              <li key={x.id} className="flex items-center gap-4">
                <span className="font-mono text-lg text-faint">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-hand text-4xl">{x.name}</span>
                <span className="flex -space-x-3">
                  {x.arrivals.slice(0, 5).map((id) => {
                    const p = playerOf(room, id);
                    return p ? <Avatar key={id} player={p} size={32} ring="ring-paper" /> : null;
                  })}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <LatestPhotos room={room} big limit={12} />
      </aside>
    </div>
  );
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return <> · {formatDuration(now - since)} in</>;
}
