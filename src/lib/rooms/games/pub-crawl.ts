import { type LatLng, MAX_STOP_NAME, MAX_STOPS, routeKm } from "@/lib/pub-crawl";
import { type Actor, GameError, type GameModule, type Room } from "../core";
import { deletePhoto, putPhoto } from "../persist";

/**
 * Pub crawl: the host lists the stops, everyone makes their own way round.
 * At each stop you tap "I'm here" (with your location, if you allow it), then
 * post a photo of your empty glass to tick it off. The finish order, distance
 * and photos make up the results.
 */

type Stop = {
  id: string;
  name: string;
  /** Where the host pinned it on the map (from the place search). Rooms saved before pins existed have none. */
  pin?: LatLng | null;
  /** Street / town line from the place search, shown under the name. */
  address?: string | null;
};

type Visit = {
  arrivedAt: number | null;
  /** Where the phone was on arrival (never sent to other phones, only used for stop positions). */
  at: (LatLng & { acc: number }) | null;
  photo: string | null;
  photoAt: number | null;
  doneAt: number | null;
  /** Ticked off without going there. */
  skipped: boolean;
};

export type PubState = {
  status: "lobby" | "crawling" | "finished";
  stops: Stop[];
  startedAt: number | null;
  endedAt: number | null;
  visits: Record<string, Record<string, Visit>>; // playerId → stopId → visit
  drinks: Record<string, Record<string, number>>; // playerId → stopId → drinks
  stopSeq: number;
};

type R = Room<PubState>;

const MAX_PHOTO_CHARS = 190_000;
const MAX_PHOTOS_PER_ROOM = 400;
const MAX_DRINKS_PER_STOP = 30;
/** Arrivals less accurate than this don't move a stop's pin (if better ones exist). */
const GOOD_FIX_M = 250;

const blankVisit = (): Visit => ({ arrivedAt: null, at: null, photo: null, photoAt: null, doneAt: null, skipped: false });

function cleanStopName(name: unknown) {
  const n = String(name ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_STOP_NAME);
  if (!n) throw new GameError("Give the stop a name");
  return n;
}

function cleanPhoto(photo: unknown) {
  const p = String(photo ?? "");
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p)) throw new GameError("That photo didn't come through — try again");
  if (p.length > MAX_PHOTO_CHARS) throw new GameError("Photo too large");
  return p;
}

function cleanSpot(a: Record<string, unknown>): Visit["at"] {
  const lat = Number(a.lat);
  const lng = Number(a.lng);
  const acc = Number(a.acc);
  if (a.lat === undefined || a.lat === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng, acc: Number.isFinite(acc) && acc >= 0 ? Math.min(acc, 100_000) : 1000 };
}

function requireHost(actor: Actor) {
  if (!actor.isHost) throw new GameError("Only the host can do that", 403);
}

function visit(s: PubState, playerId: string, stopId: string) {
  return ((s.visits[playerId] ??= {})[stopId] ??= blankVisit());
}

function findStop(s: PubState, id: unknown) {
  const stop = s.stops.find((x) => x.id === id);
  if (!stop) throw new GameError("That stop isn't on the list");
  return stop;
}

/** The stop a player is at, else the next one they haven't ticked off. */
function currentStop(s: PubState, playerId: string) {
  const v = s.visits[playerId] ?? {};
  return s.stops.find((x) => v[x.id]?.arrivedAt && !v[x.id]?.doneAt) ?? s.stops.find((x) => !v[x.id]?.doneAt) ?? null;
}

const allDone = (s: PubState, playerId: string) => s.stops.length > 0 && s.stops.every((x) => s.visits[playerId]?.[x.id]?.doneAt);

function maybeFinish(room: R) {
  const s = room.state;
  if (s.status === "crawling" && room.players.length && room.players.every((p) => allDone(s, p.id))) {
    s.status = "finished";
    s.endedAt = Date.now();
  }
}

function median(xs: number[]) {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Optional map pin sent with a stop: { lat, lng, address }. Null when absent or junk. */
function cleanPin(a: Record<string, unknown>): LatLng | null {
  if (a.lat === undefined || a.lat === null || a.lng === undefined || a.lng === null) return null;
  const lat = Number(a.lat);
  const lng = Number(a.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const cleanAddress = (x: unknown) => (typeof x === "string" && x.trim() ? x.replace(/\s+/g, " ").trim().slice(0, 120) : null);

/** Build a stop from a setup-page entry: a plain name, or { name, lat, lng, address }. */
function stopFrom(entry: unknown, id: string): Stop | null {
  const obj = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : { name: entry };
  const name = String(obj.name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_STOP_NAME);
  if (!name) return null;
  const pin = cleanPin(obj);
  return { id, name, pin, address: pin ? cleanAddress(obj.address) : null };
}

/** A stop's position: its map pin, else the middle of where everyone's phone was when they arrived. */
function stopSpot(s: PubState, stopId: string): LatLng | null {
  const pin = s.stops.find((x) => x.id === stopId)?.pin;
  if (pin) return pin;
  const fixes = Object.values(s.visits)
    .map((v) => v[stopId]?.at)
    .filter((x): x is NonNullable<Visit["at"]> => !!x);
  const good = fixes.filter((f) => f.acc <= GOOD_FIX_M);
  const use = good.length ? good : fixes;
  if (!use.length) return null;
  return { lat: median(use.map((f) => f.lat)), lng: median(use.map((f) => f.lng)) };
}

const photoCount = (s: PubState) => Object.values(s.visits).reduce((n, v) => n + Object.values(v).filter((x) => x.photo).length, 0);

function dropPlayerPhotos(room: R, playerId: string) {
  for (const v of Object.values(room.state.visits[playerId] ?? {})) if (v.photo) deletePhoto(room.code, v.photo);
}

/** Keep the room's whole-game sip tally (used by the recap) in step with the drink counter. */
function bumpStats(room: R, playerId: string, delta: number) {
  const st = (room.stats[playerId] ??= { sips: 0, alerts: 0 });
  st.sips = Math.max(0, st.sips + delta);
}

function view(room: R, viewer: Actor) {
  const s = room.state;
  const spots = new Map(s.stops.map((x) => [x.id, stopSpot(s, x.id)]));
  const photoUrl = (id: string | null) => (id ? `/api/rooms/${room.code}/photo/${id}` : null);

  const people = room.players.map((p) => {
    const v = s.visits[p.id] ?? {};
    const d = s.drinks[p.id] ?? {};
    const visited = s.stops.filter((x) => v[x.id]?.arrivedAt);
    const done = s.stops.filter((x) => v[x.id]?.doneAt);
    const complete = s.stops.length > 0 && visited.length === s.stops.length && done.length === s.stops.length;
    const lastAt = Math.max(0, ...Object.values(v).map((x) => Math.max(x.doneAt ?? 0, x.arrivedAt ?? 0)));
    // their own walk, in the order they actually got to each stop
    const path = visited
      .map((x) => ({ at: v[x.id].arrivedAt!, spot: spots.get(x.id) ?? null }))
      .sort((a, b) => a.at - b.at)
      .map((x) => x.spot);
    return {
      playerId: p.id,
      visits: Object.fromEntries(
        s.stops.map((x) => {
          const it = v[x.id];
          return [
            x.id,
            {
              arrivedAt: it?.arrivedAt ?? null,
              doneAt: it?.doneAt ?? null,
              skipped: !!it?.skipped,
              photo: photoUrl(it?.photo ?? null),
              photoAt: it?.photoAt ?? null,
              drinks: d[x.id] ?? 0,
            },
          ];
        }),
      ),
      currentStop: currentStop(s, p.id)?.id ?? null,
      visited: visited.length,
      done: done.length,
      photos: s.stops.filter((x) => v[x.id]?.photo).length,
      drinks: Object.values(d).reduce((n, x) => n + x, 0),
      km: routeKm(path),
      complete,
      finishedAt: done.length === s.stops.length && s.stops.length ? Math.max(...done.map((x) => v[x.id].doneAt!)) : null,
      lastAt: lastAt || null,
    };
  });

  // finishers first (earliest wins), then whoever got furthest, then whoever got there first
  const ranking = [...people].sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    if (a.complete) return a.finishedAt! - b.finishedAt!;
    if (a.visited !== b.visited) return b.visited - a.visited;
    return (a.lastAt ?? Infinity) - (b.lastAt ?? Infinity);
  });

  const stops = s.stops.map((x) => {
    const arrivals = people
      .filter((p) => p.visits[x.id].arrivedAt)
      .sort((a, b) => a.visits[x.id].arrivedAt! - b.visits[x.id].arrivedAt!)
      .map((p) => p.playerId);
    return {
      id: x.id,
      name: x.name,
      address: x.address ?? null,
      pinned: !!x.pin,
      spot: spots.get(x.id) ?? null,
      arrivals,
      firstAt: arrivals.length ? people.find((p) => p.playerId === arrivals[0])!.visits[x.id].arrivedAt : null,
      drinks: people.reduce((n, p) => n + p.visits[x.id].drinks, 0),
    };
  });

  return {
    status: s.status,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    stops,
    people,
    ranking: ranking.map((p) => p.playerId),
    routeKm: routeKm(stops.map((x) => x.spot)),
    totalDrinks: people.reduce((n, p) => n + p.drinks, 0),
    totalPhotos: people.reduce((n, p) => n + p.photos, 0),
    me: viewer.player ? (people.find((p) => p.playerId === viewer.player!.id) ?? null) : null,
  };
}

export type PubView = ReturnType<typeof view>;

export const pubCrawl: GameModule<PubState> = {
  kind: "pub-crawl",
  title: "Pub Crawl",
  minPlayers: 1,

  init: () => ({ status: "lobby", stops: [], startedAt: null, endedAt: null, visits: {}, drinks: {}, stopSeq: 0 }),

  onLeave(room, playerId) {
    dropPlayerPhotos(room, playerId);
    delete room.state.visits[playerId];
    delete room.state.drinks[playerId];
    // removePlayer runs after this, so check the others
    const s = room.state;
    if (s.status === "crawling" && room.players.some((p) => p.id !== playerId) && room.players.every((p) => p.id === playerId || allDone(s, p.id))) {
      s.status = "finished";
      s.endedAt = Date.now();
    }
  },

  act(room: R, actor, a) {
    const s = room.state;
    const me = actor.player;
    const needPlayer = () => {
      if (!me) throw new GameError("Join the room first", 403);
      if (s.status !== "crawling") throw new GameError(s.status === "lobby" ? "The crawl hasn't started yet" : "The crawl is over");
      return me;
    };

    switch (a.type) {
      // ---- host: the route ------------------------------------------------
      case "settings": {
        // setup page: replace the whole list (only before anyone's been anywhere)
        requireHost(actor);
        if (!Array.isArray(a.stops)) return;
        if (s.status !== "lobby") throw new GameError("Edit stops one at a time once the crawl has started");
        const stops: Stop[] = [];
        for (const entry of a.stops) {
          const stop = stopFrom(entry, `s${s.stopSeq + 1}`);
          if (!stop || stops.some((x) => x.name.toLowerCase() === stop.name.toLowerCase())) continue;
          s.stopSeq++;
          stops.push(stop);
          if (stops.length >= MAX_STOPS) break;
        }
        s.stops = stops;
        return;
      }
      case "addStop": {
        requireHost(actor);
        if (s.stops.length >= MAX_STOPS) throw new GameError(`That's ${MAX_STOPS} stops — plenty`);
        const name = cleanStopName(a.name);
        if (s.stops.some((x) => x.name.toLowerCase() === name.toLowerCase())) throw new GameError("That stop's already on the list");
        const pin = cleanPin(a);
        s.stops.push({ id: `s${++s.stopSeq}`, name, pin, address: pin ? cleanAddress(a.address) : null });
        return;
      }
      case "renameStop": {
        requireHost(actor);
        findStop(s, a.id).name = cleanStopName(a.name);
        return;
      }
      case "pinStop": {
        // host picked a place on the map for this stop (lat/lng null takes the pin off); optionally renames it
        requireHost(actor);
        const stop = findStop(s, a.id);
        if (a.name !== undefined) {
          const name = cleanStopName(a.name);
          if (s.stops.some((x) => x !== stop && x.name.toLowerCase() === name.toLowerCase())) throw new GameError("That stop's already on the list");
          stop.name = name;
        }
        stop.pin = cleanPin(a);
        stop.address = stop.pin ? cleanAddress(a.address) : null;
        return;
      }
      case "moveStop": {
        requireHost(actor);
        const i = s.stops.indexOf(findStop(s, a.id));
        const j = i + (Number(a.dir) < 0 ? -1 : 1);
        if (j < 0 || j >= s.stops.length) return;
        [s.stops[i], s.stops[j]] = [s.stops[j], s.stops[i]];
        return;
      }
      case "removeStop": {
        requireHost(actor);
        const stop = findStop(s, a.id);
        for (const pid of Object.keys(s.visits)) {
          const v = s.visits[pid][stop.id];
          if (v?.photo) deletePhoto(room.code, v.photo);
          delete s.visits[pid][stop.id];
        }
        for (const pid of Object.keys(s.drinks)) {
          bumpStats(room, pid, -(s.drinks[pid][stop.id] ?? 0));
          delete s.drinks[pid][stop.id];
        }
        s.stops = s.stops.filter((x) => x !== stop);
        maybeFinish(room);
        return;
      }

      // ---- host: the crawl itself ----------------------------------------
      case "start": {
        requireHost(actor);
        if (!s.stops.length) throw new GameError("Add at least one stop first");
        for (const pid of Object.keys(s.visits)) dropPlayerPhotos(room, pid);
        for (const pid of Object.keys(s.drinks)) bumpStats(room, pid, -Object.values(s.drinks[pid]).reduce((n, x) => n + x, 0));
        Object.assign(s, { status: "crawling", startedAt: Date.now(), endedAt: null, visits: {}, drinks: {} });
        return;
      }
      case "end": {
        requireHost(actor);
        if (s.status !== "crawling") throw new GameError("The crawl isn't running");
        s.status = "finished";
        s.endedAt = Date.now();
        return;
      }
      case "resume": {
        requireHost(actor);
        if (s.status !== "finished") throw new GameError("The crawl is still going");
        s.status = "crawling";
        s.endedAt = null;
        return;
      }
      case "reset": {
        requireHost(actor);
        for (const pid of Object.keys(s.visits)) dropPlayerPhotos(room, pid);
        for (const pid of Object.keys(s.drinks)) bumpStats(room, pid, -Object.values(s.drinks[pid]).reduce((n, x) => n + x, 0));
        room.state = { ...pubCrawl.init(), stops: s.stops, stopSeq: s.stopSeq };
        return;
      }
      case "removePhoto": {
        // host takes down a photo; the stop stays ticked off
        requireHost(actor);
        const v = s.visits[String(a.playerId ?? "")]?.[String(a.stopId ?? "")];
        if (!v?.photo) throw new GameError("No photo there");
        deletePhoto(room.code, v.photo);
        v.photo = null;
        v.photoAt = null;
        return;
      }

      // ---- players --------------------------------------------------------
      case "arrive": {
        const p = needPlayer();
        const stop = findStop(s, a.stopId);
        const v = visit(s, p.id, stop.id);
        if (v.doneAt) throw new GameError(`You've already ticked off ${stop.name}`);
        const here = s.stops.find((x) => x !== stop && s.visits[p.id]?.[x.id]?.arrivedAt && !s.visits[p.id]?.[x.id]?.doneAt);
        if (here) throw new GameError(`Finish up at ${here.name} first`);
        v.arrivedAt ??= Date.now();
        v.at = cleanSpot(a) ?? v.at;
        return;
      }
      case "proof": {
        // the empty glass: ticks the stop off (or swaps the photo on one already done)
        const p = needPlayer();
        const stop = findStop(s, a.stopId);
        const v = visit(s, p.id, stop.id);
        if (!v.arrivedAt) throw new GameError(`Tap “I'm here” at ${stop.name} first`);
        const photo = cleanPhoto(a.photo);
        if (!v.photo && photoCount(s) >= MAX_PHOTOS_PER_ROOM) throw new GameError("This room has run out of photo space");
        const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        if (v.photo) deletePhoto(room.code, v.photo);
        putPhoto(room.code, id, photo);
        v.photo = id;
        v.photoAt = Date.now();
        v.doneAt ??= v.photoAt;
        // an empty glass means at least one drink here
        if (!(s.drinks[p.id]?.[stop.id] ?? 0)) {
          (s.drinks[p.id] ??= {})[stop.id] = 1;
          bumpStats(room, p.id, 1);
        }
        maybeFinish(room);
        return;
      }
      case "moveOn": {
        // done here, no photo
        const p = needPlayer();
        const stop = findStop(s, a.stopId);
        const v = visit(s, p.id, stop.id);
        if (!v.arrivedAt) throw new GameError(`Tap “I'm here” at ${stop.name} first`);
        v.doneAt ??= Date.now();
        maybeFinish(room);
        return;
      }
      case "skip": {
        const p = needPlayer();
        const stop = findStop(s, a.stopId);
        const v = visit(s, p.id, stop.id);
        if (v.arrivedAt) throw new GameError("You're already there — tick it off instead");
        v.doneAt = Date.now();
        v.skipped = true;
        maybeFinish(room);
        return;
      }
      case "undo": {
        // step back one: un-tick a stop, or "not here yet"
        const p = needPlayer();
        const stop = findStop(s, a.stopId);
        const v = s.visits[p.id]?.[stop.id];
        if (!v) return;
        if (v.doneAt) {
          if (s.stops.some((x) => x !== stop && s.visits[p.id]?.[x.id]?.arrivedAt && !s.visits[p.id]?.[x.id]?.doneAt)) {
            throw new GameError("You're checked in somewhere else right now");
          }
          v.doneAt = null;
          if (v.skipped) Object.assign(v, blankVisit());
        } else if (!v.photo) {
          v.arrivedAt = null;
          v.at = null;
        }
        return;
      }
      case "drink": {
        // the counter: +1 / −1 at a stop (your current one by default)
        const p = needPlayer();
        const stop = a.stopId ? findStop(s, a.stopId) : currentStop(s, p.id);
        if (!stop) throw new GameError("No stop to count that at");
        const d = (s.drinks[p.id] ??= {});
        const before = d[stop.id] ?? 0;
        const after = Math.max(0, Math.min(MAX_DRINKS_PER_STOP, before + (Number(a.delta) < 0 ? -1 : 1)));
        d[stop.id] = after;
        bumpStats(room, p.id, after - before);
        return;
      }
      default:
        throw new GameError("Unknown action");
    }
  },

  view,
};
