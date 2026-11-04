import { getRoom, rooms } from "@/lib/rooms/core";
import { create, perform, viewFor } from "@/lib/rooms/server";

/** A room with N joined players; returns helpers that act as each of them or as the host. */
export function setup(kind: string, names: string[], groups: (string | null)[] = []) {
  const { code, hostToken, adminPassword } = create(kind);
  const players = names.map((name, i) => {
    const r = perform(code, { type: "join", name, group: groups[i] ?? undefined }) as { playerId: string; token: string };
    return { name, id: r.playerId, token: r.token };
  });
  const room = getRoom(code);
  // mark everyone online so "everyone has voted/answered" logic counts them
  for (const p of players) room.polls.set(p.id, Date.now() + 60_000);
  const as = (i: number, body: Record<string, unknown>) => perform(code, { ...body, token: players[i].token });
  const host = (body: Record<string, unknown>) => perform(code, { ...body, hostToken: room.hostToken });
  const view = (i?: number) =>
    viewFor(room, { player: i === undefined ? null : room.players.find((p) => p.id === players[i].id)!, isHost: false });
  return { code, hostToken, adminPassword, players, room, as, host, view };
}

/** Confirm every pending drink (as the host would with "Stop waiting"). */
export function ackAll(code: string) {
  perform(code, { type: "ackAll", hostToken: getRoom(code).hostToken });
}

export function reset() {
  rooms.clear();
}
