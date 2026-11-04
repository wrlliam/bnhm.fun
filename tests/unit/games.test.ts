import { beforeEach, describe, expect, test } from "bun:test";
import { rankValue, seededShuffle, shuffle } from "@/lib/cards";
import type { HlState } from "@/lib/rooms/games/higher-lower";
import type { RofState } from "@/lib/rooms/games/ring-of-fire";
import type { TriviaState } from "@/lib/rooms/games/trivia";
import { TRIVIA } from "@/lib/trivia";
import { ackAll, reset, setup } from "./helpers";

beforeEach(reset);

/** Force the next Ring of Fire draw to be a specific rank by marking every other card drawn. */
function rigNext(state: RofState, rank: string) {
  const deck = shuffle(state.seed);
  const target = deck.findIndex((c, i) => c.rank === rank && !state.drawn.includes(i));
  state.drawn = deck.map((_, i) => i).filter((i) => i !== target && i < target && !state.drawn.includes(i)).concat(state.drawn);
}

describe("Ring of Fire", () => {
  test("disabled cards are never drawn", () => {
    const { host, room, code } = setup("ring-of-fire", ["Ann", "Ben"]);
    host({ type: "settings", disabled: ["K", "J", "8", "2", "4", "5", "6", "7", "9", "10"] });
    host({ type: "start" });
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      ackAll(code);
      host({ type: "draw" });
      seen.push((room.state as RofState).current!.card.rank);
    }
    expect(seen.every((r) => ["A", "3", "Q"].includes(r))).toBe(true);
  });

  test("a finished deck can carry on, or go endless until switched off", () => {
    const { host, room, code } = setup("ring-of-fire", ["Ann", "Ben"]);
    host({ type: "settings", disabled: ["A", "2", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] });
    host({ type: "start" });
    const s = room.state as RofState;
    const drawDeck = () => {
      for (let i = 0; i < 4; i++) {
        ackAll(code);
        host({ type: "draw" });
      }
      ackAll(code);
    };
    expect(() => host({ type: "continue" })).toThrow("hasn't run out");
    drawDeck();
    expect(s.status).toBe("finished");
    host({ type: "continue" });
    expect([s.status, s.deckNo, s.drawn.length]).toEqual(["playing", 2, 0]);
    host({ type: "endless", on: true });
    drawDeck();
    expect([s.status, s.deckNo]).toEqual(["playing", 3]);
    host({ type: "endless", on: false });
    drawDeck();
    expect(s.status).toBe("finished");
  });

  test("turns are enforced and rotate", () => {
    const { as, host, room, players } = setup("ring-of-fire", ["Ann", "Ben"]);
    host({ type: "start" });
    expect(() => as(1, { type: "draw" })).toThrow("not your turn");
    const s = room.state as RofState;
    rigNext(s, "3"); // "Me": resolves itself
    as(0, { type: "draw" });
    expect(s.turnOrder[s.turn]).toBe(players[1].id);
  });

  test("mates chain and can't be picked twice", () => {
    const { as, host, room, players, code } = setup("ring-of-fire", ["Ann", "Ben", "Cat"]);
    host({ type: "start" });
    host({ type: "addMate", a: players[0].id, b: players[1].id });
    host({ type: "addMate", a: players[1].id, b: players[2].id });
    expect(() => host({ type: "addMate", a: players[0].id, b: players[1].id })).toThrow("already partners");
    host({ type: "penalty", playerId: players[0].id });
    const drinkers = room.drinks.map((d) => d.playerId);
    expect(drinkers).toEqual([players[0].id, players[1].id, players[2].id]);
    ackAll(code);
    const s = room.state as RofState;
    rigNext(s, "8");
    as(0, { type: "draw" });
    expect(() => as(0, { type: "choose", targets: [players[1].id] })).toThrow("already your mate");
  });

  test("Guys/Girls resolve themselves when everyone set a group", () => {
    const { as, host, room, players } = setup("ring-of-fire", ["Ann", "Ben"], ["girl", "guy"]);
    host({ type: "start" });
    const s = room.state as RofState;
    rigNext(s, "6");
    as(0, { type: "draw" });
    expect(s.current!.pending).toBe(false);
    expect(room.drinks.map((d) => d.playerId)).toEqual([players[0].id]);
  });

  test("a Jack can call a vote that scraps a rule by majority", () => {
    const { as, host, room, code } = setup("ring-of-fire", ["Ann", "Ben", "Cat"]);
    host({ type: "start" });
    const s = room.state as RofState;
    rigNext(s, "J");
    as(0, { type: "draw" });
    as(0, { type: "choose", text: "No names" });
    ackAll(code);
    s.turn = 0; // Ann again, for brevity
    rigNext(s, "J");
    as(0, { type: "draw" });
    as(0, { type: "choose", mode: "removeVote", ruleId: s.rules[0].id });
    expect(() => host({ type: "draw" })).toThrow("Finish the last card");
    as(0, { type: "ruleVote", yes: true });
    as(1, { type: "ruleVote", yes: true });
    as(2, { type: "ruleVote", yes: false });
    expect(s.vote).toBeNull();
    expect(s.rules).toHaveLength(0);
  });
});

describe("Higher or Lower", () => {
  test("a wrong call costs the streak + 1 and passes the turn", () => {
    const { as, host, room, players } = setup("higher-lower", ["Ann", "Ben"]);
    host({ type: "start" });
    const s = room.state as HlState;
    const deck = shuffle(s.seed);
    const prev = rankValue(deck[0]);
    const next = rankValue(deck[1]);
    const wrongMove = next > prev ? "L" : next < prev ? "H" : "H";
    as(0, { type: "guess", move: wrongMove });
    expect(room.drinks[0]).toMatchObject({ playerId: players[0].id, amount: 1 });
    expect(s.turn).toBe(players[1].id);
  });
});

describe("Trivia", () => {
  test("right answers score 500 + speed bonus, wrong ones score 0; reveal when all answered", () => {
    const { as, host, room, players } = setup("trivia", ["Ann", "Ben"]);
    host({ type: "start" });
    const s = room.state as TriviaState;
    const q = seededShuffle(TRIVIA, s.seed)[s.i];
    as(0, { type: "answer", choice: q.a });
    expect(() => as(0, { type: "answer", choice: q.a })).toThrow("already answered");
    as(1, { type: "answer", choice: (q.a + 1) % 4 });
    expect(s.status).toBe("reveal");
    expect(s.lastPoints[players[0].id]).toBeGreaterThanOrEqual(500);
    expect(s.lastPoints[players[0].id]).toBeLessThanOrEqual(1000);
    expect(s.lastPoints[players[1].id]).toBe(0);
    expect(room.drinks).toHaveLength(0); // drinking mode off by default
  });
});

describe("Never Have I Ever", () => {
  test("answers stay hidden until everyone's in, then the guilty drink", () => {
    const { as, host, room, players, view } = setup("never-have-i-ever", ["Ann", "Ben"]);
    host({ type: "start" });
    as(0, { type: "answer", have: true });
    expect((view(1).game as { guilty: string[] }).guilty).toEqual([]);
    as(1, { type: "answer", have: false });
    expect((view(1).game as { guilty: string[] }).guilty).toEqual([players[0].id]);
    expect(room.drinks.map((d) => d.playerId)).toEqual([players[0].id]);
  });
});

describe("Truth or Drink", () => {
  test("only the asked player responds; dodging costs sips", () => {
    const { as, host, room, players } = setup("truth-or-drink", ["Ann", "Ben"]);
    host({ type: "start" });
    expect(() => as(1, { type: "respond", choice: "drink" })).toThrow("not your question");
    as(0, { type: "respond", choice: "drink" });
    expect(room.drinks[0]).toMatchObject({ playerId: players[0].id, amount: 2 });
  });
});
