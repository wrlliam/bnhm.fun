import { newSeed, seededShuffle } from "@/lib/cards";
import { SPOTLIGHT, type SpotQ } from "@/lib/spotlight";
import { type Actor, GameError, type GameModule, isOnline, type Room } from "../core";

export const ROUND_CHOICES = [10, 20, 30];

/** Question pool for a pack. "mix" draws from every pack except Family and Spicy. */
function pool(pack: string): SpotQ[] {
  if (pack === "mix") return Object.entries(SPOTLIGHT).filter(([k]) => k !== "family" && k !== "spicy").flatMap(([, qs]) => qs);
  return SPOTLIGHT[pack] ?? SPOTLIGHT.friends;
}

export type SpotState = {
  status: "lobby" | "question" | "reveal" | "finished";
  pack: string;
  anonymous: boolean;
  /** How many questions this game uses, drawn at random from the pack. */
  rounds: number;
  seed: string;
  i: number;
  /** For "pick" questions: the two players in the spotlight. */
  pair: [string, string] | null;
  votes: Record<string, string>; // voterId → "yes" | "no" | playerId
};

type R = Room<SpotState>;
const deck = (s: SpotState): SpotQ[] => seededShuffle(pool(s.pack), s.seed).slice(0, s.rounds);
const total = (s: SpotState) => Math.min(s.rounds, pool(s.pack).length);

function ask(room: R) {
  const s = room.state;
  const q = deck(s)[s.i];
  const prev = s.pair;
  s.votes = {};
  s.status = "question";
  s.pair = null;
  if (q.t === "pick") {
    const ids = room.players.map((p) => p.id);
    // a fresh random pair, avoiding last round's pair where possible
    let a: string, b: string;
    let tries = 0;
    do {
      const shuffled = seededShuffle(ids, `${s.seed}:${s.i}:${tries}`);
      [a, b] = [shuffled[0], shuffled[1]];
      tries++;
    } while (prev && tries < 5 && prev.includes(a) && prev.includes(b));
    s.pair = [a, b];
  }
}

function maybeReveal(room: R) {
  const s = room.state;
  if (s.status !== "question") return;
  const online = room.players.filter((p) => isOnline(room, p.id));
  if (online.length >= 2 && online.every((p) => p.id in s.votes)) s.status = "reveal";
}

function view(room: R, viewer: Actor) {
  const s = room.state;
  const q = s.status === "lobby" || s.status === "finished" ? null : deck(s)[s.i];
  const options = q ? (q.t === "yesno" ? ["yes", "no"] : (s.pair ?? [])) : [];
  const counted = Object.values(s.votes);
  const results =
    s.status === "reveal"
      ? options.map((o) => {
          const voters = Object.entries(s.votes).filter(([, v]) => v === o).map(([k]) => k);
          return {
            option: o,
            count: voters.length,
            pct: counted.length ? Math.round((voters.length / counted.length) * 100) : 0,
            // anonymous mode keeps the numbers but hides who voted which way
            voters: s.anonymous ? [] : voters,
          };
        })
      : [];
  return {
    status: s.status,
    pack: s.pack,
    anonymous: s.anonymous,
    rounds: s.rounds,
    poolSize: pool(s.pack).length,
    number: s.i + 1,
    total: total(s),
    type: q?.t ?? null,
    question: q?.q ?? null,
    options,
    voted: Object.keys(s.votes),
    myVote: viewer.player ? (s.votes[viewer.player.id] ?? null) : null,
    results,
  };
}
export type SpotView = ReturnType<typeof view>;

export const spotlight: GameModule<SpotState> = {
  kind: "spotlight",
  title: "Spotlight",
  minPlayers: 3,
  init: () => ({ status: "lobby", pack: "friends", anonymous: false, rounds: 20, seed: newSeed(), i: 0, pair: null, votes: {} }),
  onLeave(room, id) {
    const s = room.state;
    delete s.votes[id];
    for (const [voter, v] of Object.entries(s.votes)) if (v === id) delete s.votes[voter];
    if (s.pair?.includes(id) && s.status === "question") ask(room); // re-deal the pair
    maybeReveal(room);
  },
  act(room: R, actor, a) {
    const s = room.state;
    switch (a.type) {
      case "settings": {
        if (!actor.isHost) throw new GameError("Only the host can change settings", 403);
        if (typeof a.pack === "string" && (a.pack in SPOTLIGHT || a.pack === "mix") && s.status === "lobby") s.pack = a.pack;
        if (ROUND_CHOICES.includes(Number(a.rounds)) && s.status === "lobby") s.rounds = Number(a.rounds);
        if (a.anonymous !== undefined) s.anonymous = !!a.anonymous;
        return;
      }
      case "start": {
        if (!actor.isHost) throw new GameError("Only the host can start", 403);
        if (room.players.length < 2) throw new GameError("Need at least 2 players");
        room.state = { ...spotlight.init(), pack: s.pack, anonymous: s.anonymous, rounds: s.rounds };
        ask(room);
        return;
      }
      case "vote": {
        if (!actor.player) throw new GameError("Join the room first", 403);
        if (s.status !== "question") throw new GameError("Voting is closed");
        const q = deck(s)[s.i];
        const choice = String(a.choice ?? "");
        const valid = q.t === "yesno" ? ["yes", "no"] : (s.pair ?? []);
        if (!valid.includes(choice)) throw new GameError("Pick one of the options");
        s.votes[actor.player.id] = choice;
        maybeReveal(room);
        return;
      }
      case "reveal": {
        if (!actor.isHost) throw new GameError("Only the host can reveal early", 403);
        if (s.status === "question") s.status = "reveal";
        return;
      }
      case "next": {
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status !== "reveal") throw new GameError("Reveal first");
        if (s.i + 1 >= total(s)) {
          s.status = "finished";
          return;
        }
        s.i++;
        ask(room);
        return;
      }
      default:
        throw new GameError("Unknown action");
    }
  },
  view,
};

