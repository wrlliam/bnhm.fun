import { timingSafeEqual } from "node:crypto";

/**
 * Room engine shared by every multiplayer game.
 *
 * Rooms live in memory (on globalThis so dev hot-reloads keep them). Every
 * mutation calls `changed(room)`, which pushes a fresh view to each open
 * Server-Sent Events connection for that room.
 */

export type GameKind = "hangman" | "ring-of-fire" | "most-likely-to";

export type Player = {
  id: string; // public: safe to show to other players
  token: string; // secret: proves "I am this player"
  name: string;
  avatar: string | null; // data:image/jpeg;base64,…
  avatarV: number;
  /** Optional, used by cards like Guys / Girls in Ring of Fire. */
  group: Group;
  joinedAt: number;
};

export type Group = "guy" | "girl" | null;

export type DrinkEvent = {
  id: number;
  playerId: string;
  amount: number;
  reason: string;
  at: number;
  /** The player tapped "Done" on their phone. New cards wait until every drink is acked. */
  acked: boolean;
};

export type Room<S = unknown> = {
  code: string;
  kind: GameKind;
  hostToken: string;
  /** Typed on another device to unlock the TV / admin panel there. */
  adminPassword: string;
  /** Brute-force protection for adminPassword. */
  unlockFails: { count: number; lockedUntil: number };
  /** The player who created the room (once they've joined). */
  hostPlayerId: string | null;
  players: Player[];
  state: S;
  drinks: DrinkEvent[];
  seq: number;
  conns: Map<string, number>; // playerId → open streams
  polls: Map<string, number>; // playerId → last poll time (fallback when streaming is blocked)
  listeners: Set<() => void>;
  createdAt: number;
  updatedAt: number;
};

export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type Actor = { player: Player | null; isHost: boolean };

export type GameModule<S> = {
  kind: GameKind;
  title: string;
  minPlayers: number;
  init(): S;
  onJoin?(room: Room<S>, player: Player): void;
  onLeave?(room: Room<S>, playerId: string): void;
  act(room: Room<S>, actor: Actor, action: Record<string, unknown>): void;
  view(room: Room<S>, viewer: Actor): unknown;
};

const g = globalThis as unknown as { __rooms?: Map<string, Room> };
export const rooms = (g.__rooms ??= new Map<string, Room>());

const ROOM_TTL = 1000 * 60 * 60 * 6;
export const MAX_PLAYERS = 16;
const MAX_AVATAR_CHARS = 60_000;

function cleanup() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const live = room.listeners.size > 0 || room.players.some((p) => isOnline(room, p.id));
    if (!live && now - room.updatedAt > ROOM_TTL) rooms.delete(code);
  }
}

export function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

export function getRoom(code: string): Room {
  const room = rooms.get(String(code).toUpperCase());
  if (!room) throw new GameError("Room not found", 404);
  return room;
}

export function createRoom<S>(kind: GameKind, init: () => S): Room<S> {
  cleanup();
  const room: Room<S> = {
    code: newCode(),
    kind,
    hostToken: crypto.randomUUID(),
    adminPassword: newAdminPassword(),
    unlockFails: { count: 0, lockedUntil: 0 },
    hostPlayerId: null,
    players: [],
    state: init(),
    drinks: [],
    seq: 0,
    conns: new Map(),
    polls: new Map(),
    listeners: new Set(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  rooms.set(room.code, room as Room);
  return room;
}

export function changed(room: Room) {
  room.updatedAt = Date.now();
  for (const fn of room.listeners) {
    try {
      fn();
    } catch {
      room.listeners.delete(fn);
    }
  }
}

export function subscribe(room: Room, playerId: string | null, fn: () => void) {
  room.listeners.add(fn);
  if (playerId) {
    room.conns.set(playerId, (room.conns.get(playerId) ?? 0) + 1);
    changed(room); // presence changed
  }
  return () => {
    room.listeners.delete(fn);
    if (playerId) {
      room.conns.set(playerId, Math.max(0, (room.conns.get(playerId) ?? 1) - 1));
      changed(room);
    }
  };
}

export function cleanName(name: unknown) {
  const n = String(name ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
  if (!n) throw new GameError("Pick a name");
  return n;
}

export function cleanAvatar(avatar: unknown): string | null {
  if (avatar === null || avatar === undefined || avatar === "") return null;
  const a = String(avatar);
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a)) throw new GameError("Unsupported image");
  if (a.length > MAX_AVATAR_CHARS) throw new GameError("Image too large");
  return a;
}

export function cleanGroup(group: unknown): Group {
  return group === "guy" || group === "girl" ? group : null;
}

export function addPlayer(room: Room, name: unknown, avatar: unknown, isHost: boolean, group?: unknown): Player {
  const clean = cleanName(name);
  if (room.players.length >= MAX_PLAYERS) throw new GameError("Room is full");
  if (room.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    throw new GameError("Someone already has that name");
  }
  const player: Player = {
    id: crypto.randomUUID().slice(0, 8),
    token: crypto.randomUUID(),
    name: clean,
    avatar: cleanAvatar(avatar),
    avatarV: 1,
    group: cleanGroup(group),
    joinedAt: Date.now(),
  };
  room.players.push(player);
  if (isHost && !room.hostPlayerId) room.hostPlayerId = player.id;
  return player;
}

export function updateProfile(room: Room, player: Player, name: unknown, avatar: unknown, group?: unknown) {
  if (group !== undefined) player.group = cleanGroup(group);
  if (name !== undefined) {
    const clean = cleanName(name);
    if (room.players.some((p) => p !== player && p.name.toLowerCase() === clean.toLowerCase())) {
      throw new GameError("Someone already has that name");
    }
    player.name = clean;
  }
  if (avatar !== undefined) {
    player.avatar = cleanAvatar(avatar);
    player.avatarV++;
  }
}

export function removePlayer(room: Room, playerId: string) {
  ackDrinks(room, playerId); // nobody should wait on someone who's gone
  room.players = room.players.filter((p) => p.id !== playerId);
  room.conns.delete(playerId);
  if (room.hostPlayerId === playerId) room.hostPlayerId = null;
}

// ---- admin password -------------------------------------------------------

// No 0/o, 1/l/i: easy to read off a phone and type on a TV remote.
const PW_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** 12 random characters (~59 bits), shown as xxxx-xxxx-xxxx. */
export function newAdminPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  // 256 % 31 bias is negligible here, but reject-sample anyway for uniformity
  const chars: string[] = [];
  let i = 0;
  let pool = bytes;
  while (chars.length < 12) {
    if (i >= pool.length) {
      pool = crypto.getRandomValues(new Uint8Array(12));
      i = 0;
    }
    const b = pool[i++];
    if (b < 248) chars.push(PW_ALPHABET[b % PW_ALPHABET.length]);
  }
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`;
}

const normalizePw = (pw: string) => pw.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Exchange the admin password for the host token. After 5 wrong attempts the room
 * locks for 30s, doubling with each further miss (max 15 min).
 */
export function unlockAdmin(room: Room, password: unknown): string {
  const now = Date.now();
  const f = room.unlockFails;
  if (f.lockedUntil > now) {
    throw new GameError(`Too many wrong passwords. Try again in ${Math.ceil((f.lockedUntil - now) / 1000)}s.`, 429);
  }
  const given = Buffer.from(normalizePw(String(password ?? "")));
  const real = Buffer.from(normalizePw(room.adminPassword));
  const ok = given.length === real.length && timingSafeEqual(given, real);
  if (!ok) {
    f.count++;
    if (f.count >= 5) f.lockedUntil = now + Math.min(15 * 60_000, 30_000 * 2 ** (f.count - 5));
    throw new GameError("Wrong admin password", 403);
  }
  f.count = 0;
  f.lockedUntil = 0;
  return room.hostToken;
}

/** New password + new host token: every other admin device loses access. */
export function resetAdmin(room: Room) {
  room.hostToken = crypto.randomUUID();
  room.adminPassword = newAdminPassword();
  room.unlockFails = { count: 0, lockedUntil: 0 };
  return { hostToken: room.hostToken, adminPassword: room.adminPassword };
}

export function resolveActor(room: Room, token: unknown, hostToken: unknown): Actor {
  const player = typeof token === "string" ? (room.players.find((p) => p.token === token) ?? null) : null;
  const isHost = typeof hostToken === "string" && hostToken === room.hostToken;
  return { player, isHost };
}

export function playerName(room: Room, id: string) {
  return room.players.find((p) => p.id === id)?.name ?? "Someone";
}

/** Record that a player has to drink. Devices show an alert for events newer than they've seen. */
export function addDrink(room: Room, playerId: string, amount: number, reason: string) {
  if (!room.players.some((p) => p.id === playerId)) return;
  room.drinks.push({ id: ++room.seq, playerId, amount, reason, at: Date.now(), acked: false });
  if (room.drinks.length > 200) {
    // trim old history, but never drop a drink someone still has to confirm
    const drop = room.drinks.length - 200;
    let removed = 0;
    room.drinks = room.drinks.filter((d) => !(d.acked && removed < drop && ++removed));
  }
}

/** Drinks still waiting for their player to confirm. */
export function pendingDrinks(room: Room) {
  return room.drinks.filter((d) => !d.acked);
}

/** Players who still have to confirm a drink, for "waiting on…" messages. */
export function waitingOn(room: Room) {
  return [...new Set(pendingDrinks(room).map((d) => d.playerId))];
}

/** Throw if anyone still has to confirm a drink. Games call this before moving on. */
export function requireDrinksDone(room: Room) {
  const ids = waitingOn(room);
  if (ids.length) {
    throw new GameError(`Waiting for ${ids.map((id) => playerName(room, id)).join(", ")} to finish drinking`, 409);
  }
}

/** A player confirms their own drinks (all, or specific ids). */
export function ackDrinks(room: Room, playerId: string, ids?: unknown) {
  const only = Array.isArray(ids) ? new Set(ids.map(Number)) : null;
  for (const d of room.drinks) if (d.playerId === playerId && (!only || only.has(d.id))) d.acked = true;
}

/** Connected by a live stream, or polled in the last few seconds. */
export function isOnline(room: Room, playerId: string) {
  return (room.conns.get(playerId) ?? 0) > 0 || Date.now() - (room.polls.get(playerId) ?? 0) < 6000;
}

/** The base view every client receives; games add their own `game` field. */
export function baseView(room: Room, viewer: Actor) {
  return {
    code: room.code,
    kind: room.kind,
    hostPlayerId: room.hostPlayerId,
    me: viewer.player?.id ?? null,
    isHost: viewer.isHost,
    /** Only ever sent to devices that are already admin. */
    adminPassword: viewer.isHost ? room.adminPassword : null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar ? `/api/rooms/${room.code}/avatar/${p.id}?v=${p.avatarV}` : null,
      group: p.group,
      online: isOnline(room, p.id),
    })),
    drinks: room.drinks.slice(-40),
    /** Every unconfirmed drink (not just recent ones), so phones can show and games can wait. */
    pendingDrinks: pendingDrinks(room),
    waitingOn: waitingOn(room),
  };
}

export type BaseView = ReturnType<typeof baseView>;
export type PublicPlayer = BaseView["players"][number];
