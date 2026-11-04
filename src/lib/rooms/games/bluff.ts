import { newSeed, seededShuffle } from "@/lib/cards";
import { BLUFF_FACTS } from "@/lib/party-content";
import { type Actor, cancelTimer, GameError, type GameModule, isOnline, type Room, schedule } from "../core";

export const ROUNDS = 6;
const WRITE_SECONDS = 60;
const PICK_SECONDS = 30;
const TRUTH_POINTS = 1000;
const FOOL_POINTS = 500;

export type BluffState = {
  status: "lobby" | "writing" | "choosing" | "reveal" | "finished";
  seed: string;
  i: number;
  lies: Record<string, string>; // playerId → their fake answer
  picks: Record<string, string>; // playerId → chosen option text (normalized key)
  scores: Record<string, number>;
  last: Record<string, number>;
  deadline: number | null;
};

type R = Room<BluffState>;
const facts = (s: BluffState) => seededShuffle(BLUFF_FACTS, s.seed).slice(0, ROUNDS);
export const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
const isTruth = (fact: (typeof BLUFF_FACTS)[number], text: string) => [fact.a, ...(fact.accept ?? [])].some((x) => norm(x) === norm(text));

/** Unique answers on offer: the truth plus every distinct lie, in a stable shuffled order. */
function options(s: BluffState) {
  const fact = facts(s)[s.i];
  const seen = new Map<string, string>();
  seen.set(norm(fact.a), fact.a);
  for (const lie of Object.values(s.lies)) if (!seen.has(norm(lie))) seen.set(norm(lie), lie);
  return seededShuffle([...seen.entries()], `${s.seed}:${s.i}`).map(([key, text]) => ({ key, text }));
}

function startWriting(room: R) {
  const s = room.state;
  s.status = "writing";
  s.lies = {};
  s.picks = {};
  s.deadline = Date.now() + WRITE_SECONDS * 1000;
  const i = s.i;
  schedule(room, "phase", WRITE_SECONDS * 1000, () => room.state.status === "writing" && room.state.i === i && startChoosing(room));
}

function startChoosing(room: R) {
  const s = room.state;
  cancelTimer(room, "phase");
  s.status = "choosing";
  s.deadline = Date.now() + PICK_SECONDS * 1000;
  const i = s.i;
  schedule(room, "phase", PICK_SECONDS * 1000, () => room.state.status === "choosing" && room.state.i === i && reveal(room));
}

function reveal(room: R) {
  const s = room.state;
  cancelTimer(room, "phase");
  const truth = norm(facts(s)[s.i].a);
  s.last = {};
  const add = (id: string, pts: number) => {
    s.last[id] = (s.last[id] ?? 0) + pts;
    s.scores[id] = (s.scores[id] ?? 0) + pts;
  };
  for (const [picker, key] of Object.entries(s.picks)) {
    if (key === truth) add(picker, TRUTH_POINTS);
    // everyone who wrote this lie gets points for fooling the picker
    for (const [liar, lie] of Object.entries(s.lies)) if (liar !== picker && norm(lie) === key) add(liar, FOOL_POINTS);
  }
  s.status = "reveal";
  s.deadline = null;
}

function maybeAdvance(room: R) {
  const s = room.state;
  const online = room.players.filter((p) => isOnline(room, p.id));
  if (s.status === "writing" && online.length && online.every((p) => p.id in s.lies)) startChoosing(room);
  else if (s.status === "choosing" && online.length && online.every((p) => p.id in s.picks)) reveal(room);
}

function view(room: R, viewer: Actor) {
  const s = room.state;
  const me = viewer.player?.id;
  const fact = s.status === "lobby" ? null : facts(s)[Math.min(s.i, ROUNDS - 1)];
  const opts = s.status === "choosing" || s.status === "reveal" ? options(s) : [];
  return {
    status: s.status,
    number: s.i + 1,
    total: ROUNDS,
    question: fact?.q ?? null,
    deadline: s.deadline,
    wrote: Object.keys(s.lies),
    picked: Object.keys(s.picks),
    myLie: me ? (s.lies[me] ?? null) : null,
    myPick: me ? (s.picks[me] ?? null) : null,
    /** Options to choose from; your own lie is flagged so you can't pick it. */
    options: opts.map((o) => ({
      key: o.key,
      text: o.text,
      mine: !!me && s.lies[me] !== undefined && norm(s.lies[me]) === o.key,
      // the reveal: who wrote it, who fell for it, and whether it's the truth
      truth: s.status === "reveal" ? o.key === norm(fact!.a) : null,
      authors: s.status === "reveal" ? Object.entries(s.lies).filter(([, l]) => norm(l) === o.key).map(([k]) => k) : [],
      pickedBy: s.status === "reveal" ? Object.entries(s.picks).filter(([, k]) => k === o.key).map(([id]) => id) : [],
    })),
    scores: s.scores,
    last: s.status === "reveal" ? s.last : {},
  };
}
export type BluffView = ReturnType<typeof view>;

export const bluff: GameModule<BluffState> = {
  kind: "bluff",
  title: "Bluff",
  minPlayers: 3,
  init: () => ({ status: "lobby", seed: newSeed(), i: 0, lies: {}, picks: {}, scores: {}, last: {}, deadline: null }),
  onLeave(room, id) {
    delete room.state.lies[id];
    delete room.state.picks[id];
    maybeAdvance(room);
  },
  restore(room) {
    const s = room.state;
    if (s.deadline && s.status === "writing") schedule(room, "phase", s.deadline - Date.now(), () => room.state.status === "writing" && startChoosing(room));
    if (s.deadline && s.status === "choosing") schedule(room, "phase", s.deadline - Date.now(), () => room.state.status === "choosing" && reveal(room));
  },
  act(room: R, actor, a) {
    const s = room.state;
    switch (a.type) {
      case "start":
        if (!actor.isHost) throw new GameError("Only the host can start", 403);
        if (room.players.length < 2) throw new GameError("Need at least 2 players");
        room.state = bluff.init();
        startWriting(room);
        return;
      case "lie": {
        const me = actor.player;
        if (!me) throw new GameError("Join the room first", 403);
        if (s.status !== "writing") throw new GameError("Writing time is over");
        const text = String(a.text ?? "").replace(/\s+/g, " ").trim().slice(0, 50);
        if (!norm(text)) throw new GameError("Write a fake answer first");
        if (isTruth(facts(s)[s.i], text)) throw new GameError("That's actually the real answer. Write something false!");
        s.lies[me.id] = text;
        maybeAdvance(room);
        return;
      }
      case "pick": {
        const me = actor.player;
        if (!me) throw new GameError("Join the room first", 403);
        if (s.status !== "choosing") throw new GameError("Not choosing right now");
        const key = String(a.key ?? "");
        if (!options(s).some((o) => o.key === key)) throw new GameError("Pick one of the answers");
        if (s.lies[me.id] !== undefined && norm(s.lies[me.id]) === key) throw new GameError("That's your own lie");
        s.picks[me.id] = key;
        maybeAdvance(room);
        return;
      }
      case "skip":
        if (!actor.isHost) throw new GameError("Only the host can skip", 403);
        if (s.status === "writing") startChoosing(room);
        else if (s.status === "choosing") reveal(room);
        return;
      case "next":
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status !== "reveal") throw new GameError("Wait for the reveal");
        if (s.i + 1 >= ROUNDS) s.status = "finished";
        else {
          s.i++;
          startWriting(room);
        }
        return;
      default:
        throw new GameError("Unknown action");
    }
  },
  view,
};
