import { newSeed, seededShuffle } from "@/lib/cards";
import { PUNCHLINE_PROMPTS } from "@/lib/party-content";
import { type Actor, cancelTimer, GameError, type GameModule, isOnline, type Room, schedule } from "../core";

export const ROUNDS = 2;
const WRITE_SECONDS = 90;
const VOTE_SECONDS = 25;
const NO_ANSWER = "(no answer)";

type Prompt = { id: number; text: string; players: [string, string]; answers: Record<string, string> };

export type PunchState = {
  status: "lobby" | "writing" | "voting" | "reveal" | "scores" | "finished";
  seed: string;
  round: number;
  used: number;
  prompts: Prompt[];
  face: number; // index into prompts during voting/reveal
  votes: Record<string, string>; // voterId → author id
  scores: Record<string, number>;
  /** Points from the last face-off, for the reveal. */
  last: Record<string, number>;
  deadline: number | null;
};

type R = Room<PunchState>;

/** Deal prompts: n players → n prompts, prompt k goes to players k and k+1, so everyone answers two. */
function deal(room: R) {
  const s = room.state;
  const order = seededShuffle(
    room.players.map((p) => p.id),
    `${s.seed}:${s.round}`,
  );
  const texts = seededShuffle(PUNCHLINE_PROMPTS, s.seed).slice(s.used, s.used + order.length);
  s.used += order.length;
  s.prompts = order.map((id, k) => ({
    id: k,
    text: texts[k] ?? PUNCHLINE_PROMPTS[k % PUNCHLINE_PROMPTS.length],
    players: [id, order[(k + 1) % order.length]],
    answers: {},
  }));
  s.status = "writing";
  s.face = 0;
  s.deadline = Date.now() + WRITE_SECONDS * 1000;
  schedule(room, "phase", WRITE_SECONDS * 1000, () => room.state.status === "writing" && startVoting(room));
}

function allAnswered(room: R) {
  return room.state.prompts.every((p) => p.players.every((id) => p.answers[id] || !room.players.some((x) => x.id === id)));
}

function startVoting(room: R) {
  const s = room.state;
  cancelTimer(room, "phase");
  for (const p of s.prompts) for (const id of p.players) p.answers[id] ??= NO_ANSWER;
  s.face = 0;
  openFace(room);
}

function openFace(room: R) {
  const s = room.state;
  s.status = "voting";
  s.votes = {};
  s.deadline = Date.now() + VOTE_SECONDS * 1000;
  const face = s.face;
  schedule(room, "phase", VOTE_SECONDS * 1000, () => room.state.status === "voting" && room.state.face === face && reveal(room));
}

/** Everyone except the two authors votes. */
function voters(room: R) {
  const p = room.state.prompts[room.state.face];
  return room.players.filter((x) => !p.players.includes(x.id));
}

function maybeReveal(room: R) {
  const s = room.state;
  const eligible = voters(room).filter((p) => isOnline(room, p.id));
  if (s.status === "voting" && eligible.length && eligible.every((p) => p.id in s.votes)) reveal(room);
}

function reveal(room: R) {
  const s = room.state;
  cancelTimer(room, "phase");
  const p = s.prompts[s.face];
  const per = 100 * s.round;
  const counts = Object.fromEntries(p.players.map((id) => [id, Object.values(s.votes).filter((v) => v === id).length]));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  s.last = {};
  for (const id of p.players) {
    let pts = counts[id] * per;
    if (total > 0 && counts[id] === total && p.answers[id] !== NO_ANSWER) pts += per; // clean sweep bonus
    if (p.answers[id] === NO_ANSWER) pts = 0;
    s.last[id] = pts;
    s.scores[id] = (s.scores[id] ?? 0) + pts;
  }
  s.status = "reveal";
  s.deadline = null;
}

function view(room: R, viewer: Actor) {
  const s = room.state;
  const me = viewer.player?.id;
  const face = s.prompts[s.face];
  const showFace = (s.status === "voting" || s.status === "reveal") && face;
  // answers are shown in a fixed but name-independent order
  const faceAnswers = showFace
    ? seededShuffle(face.players, `${s.seed}:${s.round}:${s.face}`).map((id) => ({
        id,
        text: face.answers[id] ?? NO_ANSWER,
        votes: s.status === "reveal" ? Object.entries(s.votes).filter(([, v]) => v === id).map(([k]) => k) : [],
        points: s.status === "reveal" ? (s.last[id] ?? 0) : 0,
        // authors stay secret until the reveal
        author: s.status === "reveal" ? id : null,
      }))
    : [];
  return {
    status: s.status,
    round: s.round,
    rounds: ROUNDS,
    deadline: s.deadline,
    /** My prompts still to answer (writing phase only). */
    myPrompts:
      s.status === "writing" && me
        ? s.prompts.filter((p) => p.players.includes(me) && !p.answers[me]).map((p) => ({ id: p.id, text: p.text }))
        : [],
    myDone: s.status === "writing" && me ? s.prompts.filter((p) => p.players.includes(me)).every((p) => p.answers[me]) : false,
    written: s.status === "writing" ? room.players.filter((x) => s.prompts.filter((p) => p.players.includes(x.id)).every((p) => p.answers[x.id])).map((x) => x.id) : [],
    face: showFace ? { number: s.face + 1, of: s.prompts.length, text: face.text, answers: faceAnswers, isMine: !!me && face.players.includes(me) } : null,
    voted: Object.keys(s.votes),
    myVote: me ? (s.votes[me] ?? null) : null,
    scores: s.scores,
  };
}
export type PunchView = ReturnType<typeof view>;

export const punchline: GameModule<PunchState> = {
  kind: "punchline",
  title: "Punchline",
  minPlayers: 3,
  init: () => ({ status: "lobby", seed: newSeed(), round: 1, used: 0, prompts: [], face: 0, votes: {}, scores: {}, last: {}, deadline: null }),
  onLeave(room) {
    if (room.state.status === "writing" && allAnswered(room)) startVoting(room);
    maybeReveal(room);
  },
  restore(room) {
    const s = room.state;
    if (s.deadline && s.status === "writing") schedule(room, "phase", s.deadline - Date.now(), () => room.state.status === "writing" && startVoting(room));
    if (s.deadline && s.status === "voting") schedule(room, "phase", s.deadline - Date.now(), () => room.state.status === "voting" && reveal(room));
  },
  act(room: R, actor, a) {
    const s = room.state;
    switch (a.type) {
      case "start": {
        if (!actor.isHost) throw new GameError("Only the host can start", 403);
        if (room.players.length < 3) throw new GameError("Need at least 3 players");
        room.state = punchline.init();
        deal(room);
        return;
      }
      case "answer": {
        const me = actor.player;
        if (!me) throw new GameError("Join the room first", 403);
        if (s.status !== "writing") throw new GameError("Writing time is over");
        const p = s.prompts.find((x) => x.id === Number(a.promptId));
        if (!p || !p.players.includes(me.id)) throw new GameError("That's not your prompt");
        const text = String(a.text ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
        if (!text) throw new GameError("Write something first");
        p.answers[me.id] = text;
        if (allAnswered(room)) startVoting(room);
        return;
      }
      case "vote": {
        const me = actor.player;
        if (!me) throw new GameError("Join the room first", 403);
        if (s.status !== "voting") throw new GameError("Voting is closed");
        const p = s.prompts[s.face];
        if (p.players.includes(me.id)) throw new GameError("You can't vote on your own face-off");
        const pick = String(a.author ?? "");
        if (!p.players.includes(pick)) throw new GameError("Pick one of the answers");
        s.votes[me.id] = pick;
        maybeReveal(room);
        return;
      }
      case "skip": {
        if (!actor.isHost) throw new GameError("Only the host can skip", 403);
        if (s.status === "writing") startVoting(room);
        else if (s.status === "voting") reveal(room);
        return;
      }
      case "next": {
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status === "reveal") {
          if (s.face + 1 < s.prompts.length) {
            s.face++;
            openFace(room);
          } else s.status = "scores";
          return;
        }
        if (s.status === "scores") {
          if (s.round >= ROUNDS) s.status = "finished";
          else {
            s.round++;
            deal(room);
          }
          return;
        }
        throw new GameError("Nothing to move on to yet");
      }
      default:
        throw new GameError("Unknown action");
    }
  },
  view,
};
