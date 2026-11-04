import { newSeed, seededShuffle } from "@/lib/cards";
import { TRIVIA } from "@/lib/trivia";
import {
  type Actor,
  addDrink,
  cancelTimer,
  GameError,
  type GameModule,
  isOnline,
  requireDrinksDone,
  type Room,
  schedule,
} from "../core";

export const ROUNDS = 10;
const SECONDS = 20;

export type TriviaState = {
  status: "lobby" | "question" | "reveal" | "finished";
  seed: string;
  i: number;
  deadline: number | null;
  answers: Record<string, { choice: number; at: number }>;
  scores: Record<string, number>;
  /** Points scored on the last revealed question, for the "+750" pop. */
  lastPoints: Record<string, number>;
  drinkOnWrong: boolean;
};

type R = Room<TriviaState>;
const questions = (s: TriviaState) => seededShuffle(TRIVIA, s.seed).slice(0, ROUNDS);

function ask(room: R) {
  const s = room.state;
  s.status = "question";
  s.answers = {};
  s.deadline = Date.now() + SECONDS * 1000;
  schedule(room, "question", SECONDS * 1000 + 300, () => room.state.status === "question" && reveal(room));
}

/** Score: 500 for a right answer + up to 500 for speed. Wrong/no answer: 0 (and maybe a sip). */
function reveal(room: R) {
  const s = room.state;
  cancelTimer(room, "question");
  const q = questions(s)[s.i];
  const start = (s.deadline ?? Date.now()) - SECONDS * 1000;
  s.lastPoints = {};
  for (const p of room.players) {
    const ans = s.answers[p.id];
    const right = ans?.choice === q.a;
    const speed = ans ? Math.max(0, 1 - (ans.at - start) / (SECONDS * 1000)) : 0;
    const pts = right ? 500 + Math.round(500 * speed) : 0;
    s.lastPoints[p.id] = pts;
    s.scores[p.id] = (s.scores[p.id] ?? 0) + pts;
    if (!right && s.drinkOnWrong) addDrink(room, p.id, 1, ans ? `Wrong! It was “${q.options[q.a]}”.` : "Out of time!");
  }
  s.status = "reveal";
  s.deadline = null;
}

function maybeReveal(room: R) {
  const s = room.state;
  const online = room.players.filter((p) => isOnline(room, p.id));
  if (s.status === "question" && online.length && online.every((p) => p.id in s.answers)) reveal(room);
}

function view(room: R, viewer: Actor) {
  const s = room.state;
  const q = s.status === "lobby" ? null : questions(s)[Math.min(s.i, ROUNDS - 1)];
  const revealed = s.status === "reveal" || s.status === "finished";
  return {
    status: s.status,
    number: s.i + 1,
    total: ROUNDS,
    question: q ? q.q : null,
    options: q ? q.options : null,
    correct: revealed && q ? q.a : null,
    deadline: s.deadline,
    answered: Object.keys(s.answers),
    myAnswer: viewer.player ? (s.answers[viewer.player.id]?.choice ?? null) : null,
    /** Everyone's picks, only once revealed. */
    picks: revealed ? Object.fromEntries(Object.entries(s.answers).map(([k, v]) => [k, v.choice])) : {},
    scores: s.scores,
    lastPoints: revealed ? s.lastPoints : {},
    drinkOnWrong: s.drinkOnWrong,
  };
}
export type TriviaView = ReturnType<typeof view>;

export const trivia: GameModule<TriviaState> = {
  kind: "trivia",
  title: "Trivia",
  minPlayers: 1,
  init: () => ({
    status: "lobby",
    seed: newSeed(),
    i: 0,
    deadline: null,
    answers: {},
    scores: {},
    lastPoints: {},
    drinkOnWrong: false,
  }),
  onLeave(room, id) {
    delete room.state.answers[id];
    maybeReveal(room);
  },
  act(room: R, actor, a) {
    const s = room.state;
    switch (a.type) {
      case "settings":
        if (!actor.isHost) throw new GameError("Only the host can change settings", 403);
        s.drinkOnWrong = !!a.drinkOnWrong;
        return;
      case "start":
        if (!actor.isHost) throw new GameError("Only the host can start", 403);
        for (const d of room.drinks) d.acked = true;
        room.state = { ...trivia.init(), drinkOnWrong: s.drinkOnWrong };
        ask(room);
        return;
      case "answer": {
        if (!actor.player) throw new GameError("Join the room first", 403);
        if (s.status !== "question") throw new GameError("Too late — answers are locked");
        if (actor.player.id in s.answers) throw new GameError("You've already answered");
        const choice = Number(a.choice);
        if (![0, 1, 2, 3].includes(choice)) throw new GameError("Pick an answer");
        s.answers[actor.player.id] = { choice, at: Date.now() };
        maybeReveal(room);
        return;
      }
      case "reveal":
        if (!actor.isHost) throw new GameError("Only the host can reveal early", 403);
        if (s.status !== "question") throw new GameError("Nothing to reveal");
        reveal(room);
        return;
      case "next":
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status !== "reveal") throw new GameError("Reveal first");
        requireDrinksDone(room);
        if (s.i + 1 >= ROUNDS) {
          s.status = "finished";
          return;
        }
        s.i++;
        ask(room);
        return;
      default:
        throw new GameError("Unknown action");
    }
  },
  view,
  restore(room) {
    const s = room.state;
    if (s.status === "question" && s.deadline) {
      schedule(room, "question", s.deadline - Date.now() + 300, () => room.state.status === "question" && reveal(room));
    }
  },
};
