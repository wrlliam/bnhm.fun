import { newSeed, seededShuffle } from "@/lib/cards";
import { MOST_LIKELY_TO } from "@/lib/prompts";
import { type Actor, addDrink, isOnline, requireDrinksDone, GameError, type GameModule, type Room } from "../core";

export type MltState = {
  status: "lobby" | "voting" | "reveal" | "finished";
  seed: string;
  i: number;
  votes: Record<string, string>; // voterId → targetId
  results: { playerId: string; votes: number }[];
};

type R = Room<MltState>;

const prompts = (s: MltState) => seededShuffle(MOST_LIKELY_TO, s.seed);

function reveal(room: R) {
  const s = room.state;
  const counts = new Map<string, number>();
  for (const target of Object.values(s.votes)) counts.set(target, (counts.get(target) ?? 0) + 1);
  s.results = [...counts.entries()]
    .map(([playerId, votes]) => ({ playerId, votes }))
    .sort((a, b) => b.votes - a.votes);
  const prompt = prompts(s)[s.i];
  for (const r of s.results) {
    addDrink(room, r.playerId, r.votes, `${r.votes} ${r.votes === 1 ? "person thinks" : "people think"} you're most likely to ${prompt}`);
  }
  s.status = "reveal";
}

/** Reveal automatically once every connected player has voted. */
function maybeReveal(room: R) {
  const s = room.state;
  if (s.status !== "voting") return;
  const voters = room.players.filter((p) => isOnline(room, p.id));
  if (voters.length >= 2 && voters.every((p) => s.votes[p.id])) reveal(room);
}

function view(room: R, viewer: Actor) {
  const s = room.state;
  return {
    status: s.status,
    prompt: s.status === "lobby" ? null : prompts(s)[s.i],
    number: s.i + 1,
    total: MOST_LIKELY_TO.length,
    voted: Object.keys(s.votes),
    myVote: viewer.player ? (s.votes[viewer.player.id] ?? null) : null,
    results: s.status === "reveal" ? s.results : [],
  };
}

export type MostLikelyToView = ReturnType<typeof view>;

export const mostLikelyTo: GameModule<MltState> = {
  kind: "most-likely-to",
  title: "Most Likely To",
  minPlayers: 3,

  init: () => ({ status: "lobby", seed: newSeed(), i: 0, votes: {}, results: [] }),

  onLeave(room, playerId) {
    delete room.state.votes[playerId];
    for (const [voter, target] of Object.entries(room.state.votes)) {
      if (target === playerId) delete room.state.votes[voter];
    }
    maybeReveal(room);
  },

  act(room: R, actor, action) {
    const s = room.state;
    switch (action.type) {
      case "start": {
        if (!actor.isHost) throw new GameError("Only the host can start", 403);
        if (room.players.length < 2) throw new GameError("Need at least 2 players");
        for (const d of room.drinks) d.acked = true; // fresh game, fresh slate
        room.state = { ...mostLikelyTo.init(), status: "voting" };
        return;
      }
      case "vote": {
        if (!actor.player) throw new GameError("Join the room first", 403);
        if (s.status !== "voting") throw new GameError("Voting is closed");
        const target = String(action.playerId ?? "");
        if (!room.players.some((p) => p.id === target)) throw new GameError("No such player");
        s.votes[actor.player.id] = target;
        maybeReveal(room);
        return;
      }
      case "reveal": {
        if (!actor.isHost) throw new GameError("Only the host can reveal early", 403);
        if (s.status !== "voting") throw new GameError("Not voting");
        reveal(room);
        return;
      }
      case "next": {
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status !== "reveal") throw new GameError("Reveal the votes first");
        requireDrinksDone(room);
        if (s.i + 1 >= MOST_LIKELY_TO.length) {
          s.status = "finished";
          return;
        }
        s.i++;
        s.votes = {};
        s.results = [];
        s.status = "voting";
        return;
      }
      default:
        throw new GameError("Unknown action");
    }
  },

  view,
};
