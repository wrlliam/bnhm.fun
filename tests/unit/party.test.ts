import { beforeEach, describe, expect, test } from "bun:test";
import { seededShuffle } from "@/lib/cards";
import { entries, MINI_PUZZLES } from "@/lib/minigrid";
import { BLUFF_FACTS } from "@/lib/party-content";
import { createPuzzle, getPuzzle, publicPuzzle, score, submitResult } from "@/lib/puzzles";
import type { BluffState } from "@/lib/rooms/games/bluff";
import type { OddState } from "@/lib/rooms/games/odd-one-out";
import type { PunchState } from "@/lib/rooms/games/punchline";
import type { SpotState } from "@/lib/rooms/games/spotlight";
import { perform } from "@/lib/rooms/server";
import { SPOTLIGHT } from "@/lib/spotlight";
import { reset, setup } from "./helpers";

beforeEach(reset);

describe("Spotlight", () => {
  test("every pack has more than 30 questions, and the round count is honoured", () => {
    for (const [pack, qs] of Object.entries(SPOTLIGHT)) expect(qs.length, pack).toBeGreaterThan(30);
    const { host, room } = setup("spotlight", ["Ann", "Bea", "Cat"]);
    host({ type: "settings", pack: "work", rounds: 10 });
    host({ type: "start" });
    expect((room.state as SpotState).rounds).toBe(10);
  });

  test("anonymous mode reveals percentages but not who voted", () => {
    const { as, host, room, view } = setup("spotlight", ["Ann", "Bea", "Cat"]);
    host({ type: "settings", anonymous: true });
    host({ type: "start" });
    const options = (view(0).game as { options: string[] }).options;
    as(0, { type: "vote", choice: options[0] });
    as(1, { type: "vote", choice: options[0] });
    as(2, { type: "vote", choice: options[1] });
    expect((room.state as SpotState).status).toBe("reveal");
    const results = (view(0).game as { results: { pct: number; voters: string[] }[] }).results;
    expect(results.map((r) => r.pct)).toEqual([67, 33]);
    expect(results.every((r) => r.voters.length === 0)).toBe(true);
  });

  test("a pick question puts two real players in the spotlight", () => {
    const { host, room, players } = setup("spotlight", ["Ann", "Bea", "Cat"]);
    host({ type: "settings", rounds: 30 });
    host({ type: "start" });
    const s = room.state as SpotState;
    for (let i = 0; i < 30 && !s.pair; i++) {
      host({ type: "reveal" });
      host({ type: "next" });
    }
    expect(s.pair).not.toBeNull();
    const [a, b] = s.pair!;
    expect(a).not.toBe(b);
    for (const id of [a, b]) expect(players.map((p) => p.id)).toContain(id);
  });
});

describe("Punchline", () => {
  test("everyone answers two prompts; authors can't vote on their own face-off", () => {
    const { as, host, room, players } = setup("punchline", ["Ann", "Bea", "Cat"]);
    host({ type: "start" });
    const s = room.state as PunchState;
    for (const [i, p] of players.entries()) {
      const mine = s.prompts.filter((x) => x.players.includes(p.id));
      expect(mine).toHaveLength(2);
      for (const m of mine) as(i, { type: "answer", promptId: m.id, text: `answer from ${p.name}` });
    }
    expect(s.status).toBe("voting");
    const face = s.prompts[s.face];
    const author = players.findIndex((p) => p.id === face.players[0]);
    expect(() => as(author, { type: "vote", author: face.players[0] })).toThrow("own face-off");
    const voter = players.findIndex((p) => !face.players.includes(p.id));
    as(voter, { type: "vote", author: face.players[1] });
    expect(s.status).toBe("reveal");
    // the only voter backed one answer: 100 points + clean-sweep bonus
    expect(s.last[face.players[1]]).toBe(200);
  });
});

describe("Bluff", () => {
  test("typing the real answer is refused; finding the truth and fooling people both score", () => {
    const { as, host, room, players } = setup("bluff", ["Ann", "Bea", "Cat"]);
    host({ type: "start" });
    const s = room.state as BluffState;
    const fact = seededShuffle(BLUFF_FACTS, s.seed)[0];
    expect(() => as(0, { type: "lie", text: fact.a.toUpperCase() })).toThrow("real answer");
    as(0, { type: "lie", text: "zzlie one" });
    as(1, { type: "lie", text: "zzlie two" });
    as(2, { type: "lie", text: "zzlie three" });
    expect(s.status).toBe("choosing");
    const truthKey = fact.a.toLowerCase().replace(/[^a-z0-9]/g, "");
    expect(() => as(0, { type: "pick", key: "zzlieone" })).toThrow("your own lie");
    as(0, { type: "pick", key: truthKey });
    as(1, { type: "pick", key: "zzlieone" });
    as(2, { type: "pick", key: "zzlieone" });
    expect(s.status).toBe("reveal");
    expect(s.last[players[0].id]).toBe(1000 + 2 * 500);
  });
});

describe("Odd One Out", () => {
  test("only the faker is denied the word; catching them gives one guess", () => {
    const { as, host, room, players, view } = setup("odd-one-out", ["Ann", "Bea", "Cat"]);
    host({ type: "start" });
    const s = room.state as OddState;
    const oddIdx = players.findIndex((p) => p.id === s.odd);
    for (let i = 0; i < 3; i++) {
      const g = view(i).game as { word: string | null; iAmOdd: boolean };
      expect(g.iAmOdd).toBe(i === oddIdx);
      expect(g.word).toBe(i === oddIdx ? null : s.word);
    }
    as(0, { type: "toVote" });
    for (let i = 0; i < 3; i++) {
      const target = i === oddIdx ? players[(i + 1) % 3].id : s.odd!;
      as(i, { type: "vote", playerId: target });
    }
    expect(s.status).toBe("guess");
    as(oddIdx, { type: "guess", text: s.word.toLowerCase() });
    expect(s.winner).toBe("odd");
  });
});

describe("switching games", () => {
  test("the host can switch the room to another game and everyone stays in", () => {
    const { code, room } = setup("trivia", ["Ann", "Bea", "Cat"]);
    perform(code, { type: "switchGame", kind: "spotlight", hostToken: room.hostToken });
    expect(room.kind).toBe("spotlight");
    expect(room.players).toHaveLength(3);
    expect(() => perform(code, { type: "switchGame", kind: "nope", hostToken: room.hostToken })).toThrow("Unknown game");
  });
});

describe("Six Tries", () => {
  test("scores letters like the classic rules, including repeated letters", () => {
    expect(score("CRANE", "CRANE")).toBe("ggggg");
    expect(score("SLATE", "CRANE")).toBe("xxgxg");
    expect(score("EERIE", "SPEED")).toBe("yyxxx"); // only two E's to find
    expect(score("LLAMA", "HELLO")).toBe("yyxxx");
  });

  test("the word stays secret, results are re-scored, unfinished games are refused", async () => {
    const p = await createPuzzle("plate", "Will");
    expect(JSON.stringify(publicPuzzle(await getPuzzle(p.id)))).not.toContain("PLATE");
    await expect(submitResult(p.id, "Ann", ["CRANE"])).rejects.toThrow("tries left");
    const done = await submitResult(p.id, "Ann", ["CRANE", "PLATE", "STORM"]);
    expect(done.word).toBe("PLATE");
    expect(done.result).toMatchObject({ solved: true, tries: 2 });
  });
});

describe("Mini Grid", () => {
  test("every entry in every puzzle is clued, and every clue is used", () => {
    for (const p of MINI_PUZZLES) {
      const e = entries(p);
      expect(e.every((x) => x.clue !== "?"), `puzzle ${p.id}`).toBe(true);
      expect(e.filter((x) => x.dir === "across").length).toBe(Object.keys(p.across).length);
      expect(e.filter((x) => x.dir === "down").length).toBe(Object.keys(p.down).length);
    }
  });
});
