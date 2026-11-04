import { type Card, newSeed, rankValue, shuffle } from "@/lib/cards";
import {
  type Actor,
  addDrink,
  cancelTimer,
  GameError,
  type GameModule,
  nextInOrder,
  playerName,
  requireDrinksDone,
  type Room,
  schedule,
  waitingOn,
} from "../core";

export const EQUAL_BONUS = 3;
const SAID = { H: "higher", L: "lower", E: "equal" } as const;
type Move = keyof typeof SAID;

export type HlState = {
  status: "lobby" | "playing" | "finished";
  seed: string;
  i: number; // index of the face-up card
  order: string[];
  turn: string | null;
  streak: number;
  best: number;
  /** Correct "equal" call: this player must pick who drinks EQUAL_BONUS. */
  bonusFrom: string | null;
  last: null | { by: string; move: Move; prev: Card; card: Card; correct: boolean; drinks: number };
  /** Turn timer: seconds per turn (0 = off) and when the current turn runs out. */
  turnSeconds: number;
  deadline: number | null;
};

type R = Room<HlState>;

/** (Re)start the turn timer for whoever's up. Expiry = a wrong guess (the streak drinks). */
export function armTurnTimer(room: R) {
  const s = room.state;
  cancelTimer(room, "turn");
  s.deadline = null;
  if (!s.turnSeconds || s.status !== "playing" || s.bonusFrom) return;
  s.deadline = Date.now() + s.turnSeconds * 1000;
  const who = s.turn;
  schedule(room, "turn", s.turnSeconds * 1000, () => {
    if (room.state.turn !== who || room.state.status !== "playing") return;
    if (waitingOn(room).length) return armTurnTimer(room); // wait for drinks, then restart the clock
    const sips = room.state.streak + 1;
    if (who) addDrink(room, who, sips, `Too slow! The clock ran out on your turn.`);
    Object.assign(room.state, { streak: 0, turn: nextInOrder(room.state.order, who), last: null });
    armTurnTimer(room);
  });
}

function view(room: R) {
  const s = room.state;
  const deck = shuffle(s.seed);
  return {
    status: s.status,
    card: s.status === "lobby" ? null : deck[s.i],
    left: 51 - s.i,
    turnPlayerId: s.turn,
    streak: s.streak,
    best: s.best,
    bonusFrom: s.bonusFrom,
    last: s.last,
    turnSeconds: s.turnSeconds,
    deadline: s.deadline,
  };
}
export type HlView = ReturnType<typeof view>;

export const higherLower: GameModule<HlState> = {
  kind: "higher-lower",
  title: "Higher or Lower",
  minPlayers: 2,
  init: () => ({
    status: "lobby",
    seed: newSeed(),
    i: 0,
    order: [],
    turn: null,
    streak: 0,
    best: 0,
    bonusFrom: null,
    last: null,
    turnSeconds: 0,
    deadline: null,
  }),
  onJoin(room, p) {
    if (room.state.status !== "lobby") room.state.order.push(p.id);
  },
  onLeave(room, id) {
    const s = room.state;
    if (s.bonusFrom === id) s.bonusFrom = null;
    if (s.turn === id) {
      s.turn = nextInOrder(s.order, id);
      s.streak = 0;
    }
    s.order = s.order.filter((x) => x !== id);
    if (!s.order.length) s.turn = null;
    armTurnTimer(room);
  },
  act(room: R, actor: Actor, a) {
    const s = room.state;
    switch (a.type) {
      case "settings": {
        if (!actor.isHost) throw new GameError("Only the host can change settings", 403);
        s.turnSeconds = [0, 15, 30, 60].includes(Number(a.turnSeconds)) ? Number(a.turnSeconds) : 0;
        armTurnTimer(room);
        return;
      }
      case "start": {
        if (!actor.isHost) throw new GameError("Only the host can start", 403);
        for (const d of room.drinks) d.acked = true;
        const order = room.players.map((p) => p.id);
        room.state = { ...higherLower.init(), turnSeconds: s.turnSeconds, status: "playing", order, turn: order[0] };
        armTurnTimer(room);
        return;
      }
      case "guess": {
        if (s.status !== "playing") throw new GameError("The game hasn't started");
        if (actor.player?.id !== s.turn && !actor.isHost) throw new GameError("It's not your turn", 403);
        if (s.bonusFrom) throw new GameError(`${playerName(room, s.bonusFrom)} is handing out drinks first`);
        requireDrinksDone(room);
        const move = String(a.move) as Move;
        if (!(move in SAID)) throw new GameError("Higher, lower or equal?");
        const deck = shuffle(s.seed);
        const prev = deck[s.i];
        const card = deck[s.i + 1];
        const pv = rankValue(prev);
        const cv = rankValue(card);
        const correct = move === "H" ? cv > pv : move === "L" ? cv < pv : cv === pv;
        const by = s.turn!;
        s.i++;
        if (correct) {
          s.streak++;
          s.best = Math.max(s.best, s.streak);
          s.last = { by, move, prev, card, correct, drinks: 0 };
          if (move === "E") s.bonusFrom = by;
        } else {
          const drinks = s.streak + 1;
          addDrink(room, by, drinks, `You said ${SAID[move]}, it was ${card.rank}${card.suit.symbol} after ${prev.rank}${prev.suit.symbol}.`);
          s.last = { by, move, prev, card, correct, drinks };
          s.streak = 0;
          s.turn = nextInOrder(s.order, by);
        }
        if (s.i >= 51) s.status = "finished";
        armTurnTimer(room);
        return;
      }
      case "bonus": {
        if (!s.bonusFrom) throw new GameError("No drinks to hand out");
        if (actor.player?.id !== s.bonusFrom && !actor.isHost) throw new GameError("Not yours to give", 403);
        const target = String(a.playerId ?? "");
        if (!room.players.some((p) => p.id === target)) throw new GameError("Pick a player");
        addDrink(room, target, EQUAL_BONUS, `${playerName(room, s.bonusFrom)} nailed an equal call and picked you.`);
        s.bonusFrom = null;
        armTurnTimer(room);
        return;
      }
      default:
        throw new GameError("Unknown action");
    }
  },
  view,
  restore: (room) => armTurnTimer(room),
};
