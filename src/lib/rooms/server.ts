import {
  makeHost,
  react,
  rejoin,
  ackDrinks,
  addPlayer,
  baseView,
  changed,
  createRoom,
  GameError,
  type GameKind,
  getRoom,
  removePlayer,
  rooms,
  resetAdmin,
  unlockAdmin,
  resolveActor,
  type Room,
  type Actor,
  updateProfile,
} from "./core";
import { MAX_ROOMS } from "./limits";
import { roomsReady } from "./persist";
import { GAMES, isGameKind } from "./registry";

/** Await before handling any room request: loads saved rooms from Redis once per process. */
export function ensureRooms() {
  return roomsReady(rooms, (room) => GAMES[room.kind]?.restore?.(room));
}

export function create(kind: unknown) {
  if (!isGameKind(kind)) throw new GameError("Unknown game");
  if (rooms.size >= MAX_ROOMS) throw new GameError("The server is full right now — try again later", 503);
  const room = createRoom(kind as GameKind, GAMES[kind].init);
  return { code: room.code, hostToken: room.hostToken, adminPassword: room.adminPassword };
}

export function viewFor(room: Room, actor: Actor) {
  const mod = GAMES[room.kind];
  return {
    ...baseView(room, actor),
    title: mod.title,
    minPlayers: mod.minPlayers,
    game: mod.view(room, actor),
  };
}

export type RoomView = ReturnType<typeof viewFor>;

type Body = { token?: string; hostToken?: string; type?: string } & Record<string, unknown>;

/** Handle a POST from a client. Returns extra data for the caller (e.g. new player token). */
export function perform(code: string, body: Body) {
  const room = getRoom(code);
  const mod = GAMES[room.kind];
  const actor = resolveActor(room, body.token, body.hostToken);
  let result: Record<string, unknown> = {};

  switch (body.type) {
    case "unlock": {
      // no state change, no broadcast
      return { hostToken: unlockAdmin(room, body.password) };
    }
    case "resetAdmin": {
      if (!actor.isHost) throw new GameError("Only the host can do that", 403);
      result = resetAdmin(room);
      break;
    }
    case "join": {
      const player = addPlayer(room, body.name, body.avatar, actor.isHost, body.group);
      mod.onJoin?.(room, player);
      result = { playerId: player.id, token: player.token };
      break;
    }
    case "profile": {
      if (!actor.player) throw new GameError("Join the room first", 403);
      updateProfile(room, actor.player, body.name, body.avatar, body.group);
      break;
    }
    case "leave": {
      if (!actor.player) return { ok: true };
      mod.onLeave?.(room, actor.player.id);
      removePlayer(room, actor.player.id);
      break;
    }
    case "rejoin": {
      // no state change, no broadcast
      return { token: rejoin(room, body.playerId, body.pin) };
    }
    case "makeHost": {
      if (!actor.isHost) throw new GameError("Only the host can do that", 403);
      makeHost(room, String(body.playerId ?? ""));
      break;
    }
    case "react": {
      if (!actor.player) throw new GameError("Join the room first", 403);
      react(room, actor.player.id, body.emoji);
      break;
    }
    case "recap": {
      if (!actor.isHost) throw new GameError("Only the host can do that", 403);
      room.showRecap = !!body.show;
      break;
    }
    case "ackDrink": {
      if (!actor.player) throw new GameError("Join the room first", 403);
      ackDrinks(room, actor.player.id, body.ids);
      break;
    }
    case "ackAll": {
      // host override for someone who wandered off
      if (!actor.isHost) throw new GameError("Only the host can do that", 403);
      const who = typeof body.playerId === "string" ? body.playerId : null;
      for (const d of room.drinks) if (!who || d.playerId === who) d.acked = true;
      break;
    }
    case "kick": {
      if (!actor.isHost) throw new GameError("Only the host can remove players", 403);
      const id = String(body.playerId ?? "");
      mod.onLeave?.(room, id);
      removePlayer(room, id);
      break;
    }
    default:
      mod.act(room, actor, body);
  }

  changed(room);
  return result;
}

export function avatarFor(code: string, playerId: string) {
  const room = getRoom(code);
  const p = room.players.find((x) => x.id === playerId);
  if (!p?.avatar) throw new GameError("No avatar", 404);
  const [meta, data] = p.avatar.split(",");
  return { type: meta.slice(5, meta.indexOf(";")), bytes: Buffer.from(data, "base64") };
}

export function errorResponse(e: unknown) {
  const status = e instanceof GameError ? e.status : 500;
  if (!(e instanceof GameError)) console.error(e);
  return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status });
}
