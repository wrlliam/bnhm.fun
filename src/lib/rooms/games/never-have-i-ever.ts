import { newSeed, seededShuffle } from "@/lib/cards";
import { NEVER_HAVE_I_EVER } from "@/lib/prompts";
import { type Actor, addDrink, GameError, type GameModule, isOnline, requireDrinksDone, type Room } from "../core";

export type NhieState = {
  status: "lobby" | "answering" | "reveal" | "finished";
  seed: string;
  i: number;
  answers: Record<string, boolean>; // playerId → "I have"
};

type R = Room<NhieState>;
const prompts = (s: NhieState) => seededShuffle(NEVER_HAVE_I_EVER, s.seed);

function reveal(room: R) {
  const s = room.state;
  const prompt = prompts(s)[s.i];
  for (const [id, have] of Object.entries(s.answers)) {
    if (have) addDrink(room, id, 1, `You have ${prompt}.`);
  }
  s.status = "reveal";
}

function maybeReveal(room: R) {
  const s = room.state;
  if (s.status !== "answering") return;
  const online = room.players.filter((p) => isOnline(room, p.id));
  if (online.length >= 2 && online.every((p) => p.id in s.answers)) reveal(room);
}

function view(room: R, viewer: Actor) {
  const s = room.state;
  return {
    status: s.status,
    prompt: s.status === "lobby" ? null : prompts(s)[s.i],
    number: s.i + 1,
    total: NEVER_HAVE_I_EVER.length,
    answered: Object.keys(s.answers),
    myAnswer: viewer.player ? (s.answers[viewer.player.id] ?? null) : null,
    /** Only after the reveal, so nobody copies anyone. */
    guilty: s.status === "reveal" ? Object.entries(s.answers).filter(([, v]) => v).map(([k]) => k) : [],
  };
}
export type NhieView = ReturnType<typeof view>;

export const neverHaveIEver: GameModule<NhieState> = {
  kind: "never-have-i-ever",
  title: "Never Have I Ever",
  minPlayers: 2,
  init: () => ({ status: "lobby", seed: newSeed(), i: 0, answers: {} }),
  onLeave(room, id) {
    delete room.state.answers[id];
    maybeReveal(room);
  },
  act(room: R, actor, a) {
    const s = room.state;
    switch (a.type) {
      case "start":
        if (!actor.isHost) throw new GameError("Only the host can start", 403);
        for (const d of room.drinks) d.acked = true;
        room.state = { ...neverHaveIEver.init(), status: "answering" };
        return;
      case "answer":
        if (!actor.player) throw new GameError("Join the room first", 403);
        if (s.status !== "answering") throw new GameError("Not answering right now");
        s.answers[actor.player.id] = !!a.have;
        maybeReveal(room);
        return;
      case "reveal":
        if (!actor.isHost) throw new GameError("Only the host can reveal early", 403);
        if (s.status !== "answering") throw new GameError("Nothing to reveal");
        reveal(room);
        return;
      case "next":
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status !== "reveal") throw new GameError("Reveal first");
        requireDrinksDone(room);
        if (s.i + 1 >= NEVER_HAVE_I_EVER.length) s.status = "finished";
        else Object.assign(s, { i: s.i + 1, answers: {}, status: "answering" });
        return;
      default:
        throw new GameError("Unknown action");
    }
  },
  view,
};
