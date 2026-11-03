import { type Actor, GameError, type GameModule, type Room, playerName } from "../core";

export const MAX_WRONG = 6;

type Status = "lobby" | "choosing" | "playing" | "won" | "lost";

export type HangmanState = {
  setterId: string | null;
  word: string;
  guessed: string[];
  wrong: string[];
  status: Status;
  lastEvent: { id: number; playerName: string; letter: string; hit: boolean } | null;
  eventCounter: number;
  scores: Record<string, number>;
};

type R = Room<HangmanState>;

function need(actor: Actor) {
  if (!actor.player) throw new GameError("Join the room first", 403);
  return actor.player;
}

function view(room: R, viewer: Actor) {
  const s = room.state;
  const finished = s.status === "won" || s.status === "lost";
  const isSetter = !!viewer.player && viewer.player.id === s.setterId;
  return {
    status: s.status,
    setterId: s.setterId,
    setterName: s.setterId ? playerName(room, s.setterId) : null,
    masked: [...s.word].map((c) => (c === " " ? " " : s.guessed.includes(c) || finished ? c : null)),
    word: finished || isSetter ? s.word : null,
    guessed: s.guessed,
    wrong: s.wrong,
    lastEvent: s.lastEvent,
    scores: s.scores,
    maxWrong: MAX_WRONG,
  };
}

export type HangmanView = ReturnType<typeof view>;

export const hangman: GameModule<HangmanState> = {
  kind: "hangman",
  title: "Hangman",
  minPlayers: 2,

  init: () => ({
    setterId: null,
    word: "",
    guessed: [],
    wrong: [],
    status: "lobby",
    lastEvent: null,
    eventCounter: 0,
    scores: {},
  }),

  onLeave(room, playerId) {
    const s = room.state;
    delete s.scores[playerId];
    if (s.setterId === playerId && (s.status === "choosing" || s.status === "playing")) {
      s.status = "lobby";
      s.word = "";
    }
  },

  act(room: R, actor, action) {
    const s = room.state;
    switch (action.type) {
      case "start": {
        if (!actor.player && !actor.isHost) throw new GameError("Join the room first", 403);
        if (s.status === "choosing" || s.status === "playing") throw new GameError("Round already in progress");
        if (room.players.length < 2) throw new GameError("Need at least 2 players");
        const idx = room.players.findIndex((p) => p.id === s.setterId);
        s.setterId = room.players[(idx + 1) % room.players.length].id;
        Object.assign(s, { word: "", guessed: [], wrong: [], lastEvent: null, status: "choosing" });
        return;
      }
      case "setWord": {
        const me = need(actor);
        if (s.status !== "choosing") throw new GameError("Not choosing a word right now");
        if (s.setterId !== me.id) throw new GameError("It's not your turn to pick", 403);
        const word = String(action.word ?? "")
          .trim()
          .toUpperCase()
          .replace(/\s+/g, " ");
        if (!/^[A-Z ]+$/.test(word)) throw new GameError("Letters and spaces only");
        if (word.replace(/ /g, "").length < 2 || word.length > 30) throw new GameError("Word must be 2–30 characters");
        s.word = word;
        s.status = "playing";
        return;
      }
      case "guess": {
        const me = need(actor);
        if (s.status !== "playing") throw new GameError("No round in progress");
        if (s.setterId === me.id) throw new GameError("You picked the word — no guessing!");
        const letter = String(action.letter ?? "")
          .trim()
          .toUpperCase();
        if (!/^[A-Z]$/.test(letter)) throw new GameError("Guess a single letter");
        if (s.guessed.includes(letter)) throw new GameError(`${letter} was already guessed`);
        s.guessed.push(letter);
        const hit = s.word.includes(letter);
        if (!hit) s.wrong.push(letter);
        else s.scores[me.id] = (s.scores[me.id] ?? 0) + 1;
        s.lastEvent = { id: ++s.eventCounter, playerName: me.name, letter, hit };
        if ([...s.word].every((c) => c === " " || s.guessed.includes(c))) s.status = "won";
        else if (s.wrong.length >= MAX_WRONG) {
          s.status = "lost";
          if (s.setterId) s.scores[s.setterId] = (s.scores[s.setterId] ?? 0) + 3;
        }
        return;
      }
      default:
        throw new GameError("Unknown action");
    }
  },

  view,
};

