import { ODD_ONE_OUT } from "@/lib/party-content";
import { type Actor, GameError, type GameModule, isOnline, type Room } from "../core";
import { norm } from "./bluff";

export type OddState = {
  status: "lobby" | "clues" | "voting" | "guess" | "reveal";
  round: number;
  category: string;
  word: string;
  odd: string | null; // the faker
  order: string[]; // who says their word when
  votes: Record<string, string>;
  accused: string | null;
  guess: string | null;
  winner: "group" | "odd" | null;
  scores: Record<string, number>;
  lastOdd: string | null;
};

type R = Room<OddState>;
const pickRandom = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function newRound(room: R) {
  const s = room.state;
  const pack = pickRandom(ODD_ONE_OUT);
  const ids = room.players.map((p) => p.id);
  // don't make the same person the faker twice in a row
  const candidates = ids.length > 2 ? ids.filter((id) => id !== s.lastOdd) : ids;
  const odd = pickRandom(candidates);
  const start = Math.floor(Math.random() * ids.length);
  Object.assign(s, {
    status: "clues",
    round: s.round + 1,
    category: pack.category,
    word: pickRandom(pack.words),
    odd,
    lastOdd: odd,
    order: [...ids.slice(start), ...ids.slice(0, start)],
    votes: {},
    accused: null,
    guess: null,
    winner: null,
  });
}

function tally(room: R) {
  const s = room.state;
  const counts = new Map<string, number>();
  for (const v of Object.values(s.votes)) counts.set(v, (counts.get(v) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  // a tie for top means nobody is caught
  const caught = sorted.length && (sorted.length === 1 || sorted[0][1] > sorted[1][1]) ? sorted[0][0] : null;
  s.accused = caught;
  if (caught && caught === s.odd) s.status = "guess";
  else finish(room, "odd");
}

function finish(room: R, winner: "group" | "odd") {
  const s = room.state;
  s.winner = winner;
  s.status = "reveal";
  if (winner === "odd" && s.odd) s.scores[s.odd] = (s.scores[s.odd] ?? 0) + 3;
  if (winner === "group") {
    for (const p of room.players) {
      if (p.id === s.odd) continue;
      s.scores[p.id] = (s.scores[p.id] ?? 0) + (s.votes[p.id] === s.odd ? 2 : 1);
    }
  }
}

function view(room: R, viewer: Actor) {
  const s = room.state;
  const me = viewer.player?.id;
  const revealed = s.status === "reveal";
  const iAmOdd = !!me && me === s.odd;
  return {
    status: s.status,
    round: s.round,
    category: s.status === "lobby" ? null : s.category,
    /** The secret word, never sent to the faker until the reveal. */
    word: s.status === "lobby" ? null : revealed || !iAmOdd ? s.word : null,
    iAmOdd: s.status !== "lobby" && iAmOdd,
    order: s.order,
    voted: Object.keys(s.votes),
    myVote: me ? (s.votes[me] ?? null) : null,
    votes: revealed ? s.votes : {},
    accused: s.status === "guess" || revealed ? s.accused : null,
    odd: revealed ? s.odd : null,
    guess: revealed ? s.guess : null,
    winner: s.winner,
    scores: s.scores,
  };
}
export type OddView = ReturnType<typeof view>;

export const oddOneOut: GameModule<OddState> = {
  kind: "odd-one-out",
  title: "Odd One Out",
  minPlayers: 3,
  init: () => ({
    status: "lobby",
    round: 0,
    category: "",
    word: "",
    odd: null,
    order: [],
    votes: {},
    accused: null,
    guess: null,
    winner: null,
    scores: {},
    lastOdd: null,
  }),
  onLeave(room, id) {
    const s = room.state;
    s.order = s.order.filter((x) => x !== id);
    delete s.votes[id];
    if (s.odd === id && s.status !== "lobby" && s.status !== "reveal") finish(room, "group");
  },
  act(room: R, actor, a) {
    const s = room.state;
    switch (a.type) {
      case "start":
        if (!actor.isHost) throw new GameError("Only the host can start", 403);
        if (room.players.length < 3) throw new GameError("Need at least 3 players");
        newRound(room);
        return;
      case "toVote":
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status !== "clues") throw new GameError("Not now");
        s.status = "voting";
        return;
      case "vote": {
        const me = actor.player;
        if (!me) throw new GameError("Join the room first", 403);
        if (s.status !== "voting") throw new GameError("Voting is closed");
        const target = String(a.playerId ?? "");
        if (target === me.id) throw new GameError("You can't vote for yourself");
        if (!room.players.some((p) => p.id === target)) throw new GameError("Pick a player");
        s.votes[me.id] = target;
        const online = room.players.filter((p) => isOnline(room, p.id));
        if (online.every((p) => p.id in s.votes)) tally(room);
        return;
      }
      case "closeVote":
        if (!actor.isHost) throw new GameError("Only the host can close the vote", 403);
        if (s.status === "voting") tally(room);
        return;
      case "guess": {
        if (s.status !== "guess") throw new GameError("No guess needed");
        if (actor.player?.id !== s.odd && !actor.isHost) throw new GameError("Only the odd one out can guess", 403);
        const text = String(a.text ?? "").trim().slice(0, 40);
        if (!text) throw new GameError("Type your guess");
        s.guess = text;
        finish(room, norm(text) === norm(s.word) ? "odd" : "group");
        return;
      }
      case "next":
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status !== "reveal") throw new GameError("Finish this round first");
        newRound(room);
        return;
      default:
        throw new GameError("Unknown action");
    }
  },
  view,
};
