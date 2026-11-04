import { newSeed, seededShuffle } from "@/lib/cards";
import { TRUTH_OR_DRINK } from "@/lib/prompts";
import {
  type Actor,
  addDrink,
  GameError,
  type GameModule,
  nextInOrder,
  playerName,
  requireDrinksDone,
  type Room,
} from "../core";

/** Sips for dodging a question: enough that answering is tempting. */
export const SKIP_SIPS = 2;

export type TodState = {
  status: "lobby" | "asking" | "answered" | "finished";
  seed: string;
  i: number;
  order: string[];
  turn: string | null;
  outcome: "answer" | "drink" | null;
};

type R = Room<TodState>;
const questions = (s: TodState) => seededShuffle(TRUTH_OR_DRINK, s.seed);

function view(room: R) {
  const s = room.state;
  return {
    status: s.status,
    question: s.status === "lobby" || s.status === "finished" ? null : questions(s)[s.i],
    number: s.i + 1,
    total: TRUTH_OR_DRINK.length,
    turnPlayerId: s.turn,
    outcome: s.outcome,
    skipSips: SKIP_SIPS,
  };
}
export type TodView = ReturnType<typeof view>;

export const truthOrDrink: GameModule<TodState> = {
  kind: "truth-or-drink",
  title: "Truth or Drink",
  minPlayers: 2,
  init: () => ({ status: "lobby", seed: newSeed(), i: 0, order: [], turn: null, outcome: null }),
  onJoin(room, p) {
    if (room.state.status !== "lobby") room.state.order.push(p.id);
  },
  onLeave(room, id) {
    const s = room.state;
    if (s.turn === id) {
      s.turn = nextInOrder(s.order, id);
      s.status = "asking";
      s.outcome = null;
    }
    s.order = s.order.filter((x) => x !== id);
    if (!s.order.length) s.turn = null;
  },
  act(room: R, actor: Actor, a) {
    const s = room.state;
    switch (a.type) {
      case "start": {
        if (!actor.isHost) throw new GameError("Only the host can start", 403);
        for (const d of room.drinks) d.acked = true;
        const order = room.players.map((p) => p.id);
        room.state = { ...truthOrDrink.init(), status: "asking", order, turn: order[0] };
        return;
      }
      case "respond": {
        if (s.status !== "asking") throw new GameError("No question waiting");
        if (actor.player?.id !== s.turn && !actor.isHost) throw new GameError("It's not your question", 403);
        if (a.choice === "drink") {
          addDrink(room, s.turn!, SKIP_SIPS, `You dodged the question: “${questions(s)[s.i]}”`);
          s.outcome = "drink";
        } else s.outcome = "answer";
        s.status = "answered";
        return;
      }
      case "next": {
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status !== "answered" && !actor.isHost) throw new GameError(`${playerName(room, s.turn ?? "")} hasn't answered yet`);
        requireDrinksDone(room);
        if (s.i + 1 >= TRUTH_OR_DRINK.length) {
          s.status = "finished";
          return;
        }
        Object.assign(s, { i: s.i + 1, turn: nextInOrder(s.order, s.turn), status: "asking", outcome: null });
        return;
      }
      default:
        throw new GameError("Unknown action");
    }
  },
  view,
};
