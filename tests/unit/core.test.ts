import { beforeEach, describe, expect, test } from "bun:test";
import { seededShuffle, shuffle } from "@/lib/cards";
import { deserialize, serialize } from "@/lib/rooms/persist";
import { perform } from "@/lib/rooms/server";
import { ackAll, reset, setup } from "./helpers";

beforeEach(reset);

describe("cards", () => {
  test("a seed always produces the same full 52-card deck", () => {
    const a = shuffle("abc123");
    expect(a).toHaveLength(52);
    expect(new Set(a.map((c) => c.rank + c.suit.key)).size).toBe(52);
    expect(shuffle("abc123")).toEqual(a);
    expect(shuffle("other")).not.toEqual(a);
  });
  test("seededShuffle doesn't mutate its input", () => {
    const input = [1, 2, 3, 4, 5];
    seededShuffle(input, "x");
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("joining", () => {
  test("names are unique (case-insensitive) and trimmed", () => {
    const { code } = setup("hangman", ["Ann"]);
    expect(() => perform(code, { type: "join", name: "  ann " })).toThrow("already has that name");
    expect(() => perform(code, { type: "join", name: "   " })).toThrow("Pick a name");
  });
  test("non-image avatars are rejected", () => {
    const { code } = setup("hangman", []);
    expect(() => perform(code, { type: "join", name: "X", avatar: "data:text/html;base64,PHNjcmlwdD4=" })).toThrow("Unsupported image");
  });
  test("a player only ever sees their own rejoin PIN", () => {
    const { view } = setup("hangman", ["Ann", "Ben"]);
    expect(view(0).myPin).toMatch(/^\d{4}$/);
    expect(JSON.stringify(view(0))).not.toContain(`"pin"`);
  });
});

describe("rejoin with PIN", () => {
  test("right PIN returns the same token; 5 wrong PINs lock it", () => {
    const { code, players, room } = setup("hangman", ["Ann"]);
    const pin = room.players[0].pin;
    expect(perform(code, { type: "rejoin", playerId: players[0].id, pin })).toEqual({ token: players[0].token });
    const wrong = pin === "0000" ? "1111" : "0000";
    for (let i = 0; i < 5; i++) expect(() => perform(code, { type: "rejoin", playerId: players[0].id, pin: wrong })).toThrow("Wrong PIN");
    expect(() => perform(code, { type: "rejoin", playerId: players[0].id, pin })).toThrow("Too many wrong PINs");
  });
});

describe("admin password", () => {
  test("unlock is case/space/dash-insensitive and locks after 5 misses", () => {
    const { code, adminPassword, room } = setup("ring-of-fire", []);
    const messy = adminPassword.toUpperCase().replace(/-/g, " ");
    expect(perform(code, { type: "unlock", password: messy })).toEqual({ hostToken: room.hostToken });
    for (let i = 0; i < 5; i++) expect(() => perform(code, { type: "unlock", password: "nope" })).toThrow("Wrong admin password");
    expect(() => perform(code, { type: "unlock", password: adminPassword })).toThrow("Too many wrong passwords");
  });
  test("resetting admin revokes the old host token", () => {
    const { code, room } = setup("ring-of-fire", ["Ann", "Ben"]);
    const old = room.hostToken;
    perform(code, { type: "resetAdmin", hostToken: old });
    expect(() => perform(code, { type: "start", hostToken: old })).toThrow("Only the host");
  });
});

describe("host handover", () => {
  test("the new host player gets host powers without a host token; the old one loses them", () => {
    const { code, players, room, as } = setup("ring-of-fire", ["Ann", "Ben"]);
    perform(code, { type: "join", name: "Host", hostToken: room.hostToken }); // creator joins as host player
    const hostPlayer = room.players.find((p) => p.name === "Host")!;
    perform(code, { type: "makeHost", token: hostPlayer.token, playerId: players[1].id });
    expect(room.hostPlayerId).toBe(players[1].id);
    expect(() => as(1, { type: "start" })).not.toThrow();
    expect(() => perform(code, { type: "reset", token: hostPlayer.token })).toThrow("Only the host");
  });
});

describe("drinks", () => {
  test("pending drinks block until confirmed; stats keep whole-game totals", () => {
    const { players, room, as, host } = setup("ring-of-fire", ["Ann", "Ben"]);
    host({ type: "start" });
    host({ type: "penalty", playerId: players[0].id });
    expect(room.drinks.filter((d) => !d.acked)).toHaveLength(1);
    expect(() => host({ type: "draw" })).toThrow("Waiting for Ann");
    as(0, { type: "ackDrink" });
    expect(() => host({ type: "draw" })).not.toThrow();
    expect(room.stats[players[0].id].sips).toBeGreaterThanOrEqual(1);
  });
  test("a player can only confirm their own drinks", () => {
    const { code, players, room, as, host } = setup("ring-of-fire", ["Ann", "Ben"]);
    host({ type: "start" });
    host({ type: "penalty", playerId: players[0].id });
    as(1, { type: "ackDrink" });
    expect(room.drinks.filter((d) => !d.acked)).toHaveLength(1);
    ackAll(code);
    expect(room.drinks.filter((d) => !d.acked)).toHaveLength(0);
  });
});

describe("reactions", () => {
  test("only known emoji, throttled per player", () => {
    const { as, room } = setup("trivia", ["Ann"]);
    expect(() => as(0, { type: "react", emoji: "🦄" })).toThrow("Unknown reaction");
    as(0, { type: "react", emoji: "🔥" });
    expect(() => as(0, { type: "react", emoji: "🔥" })).toThrow("one at a time");
    expect(room.reactions).toHaveLength(1);
  });
});

describe("persistence", () => {
  test("a room survives serialize → deserialize without live connection state", () => {
    const { room, host } = setup("ring-of-fire", ["Ann", "Ben"]);
    host({ type: "start" });
    room.conns.set("x", 3);
    const copy = deserialize(serialize(room));
    expect(copy.code).toBe(room.code);
    expect(copy.players.map((p) => p.token)).toEqual(room.players.map((p) => p.token));
    expect(copy.state).toEqual(room.state);
    expect(copy.conns.size).toBe(0);
    expect(copy.listeners).toBeInstanceOf(Set);
  });
});
