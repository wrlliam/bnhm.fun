import type { GameKind, GameModule } from "./core";
import { hangman } from "./games/hangman";
import { mostLikelyTo } from "./games/most-likely-to";
import { ringOfFire } from "./games/ring-of-fire";

export const GAMES: Record<GameKind, GameModule<unknown>> = {
  hangman: hangman as GameModule<unknown>,
  "ring-of-fire": ringOfFire as GameModule<unknown>,
  "most-likely-to": mostLikelyTo as GameModule<unknown>,
};

export function isGameKind(k: unknown): k is GameKind {
  return typeof k === "string" && k in GAMES;
}

export type { HangmanView as HangmanGameView } from "./games/hangman";
export type { MostLikelyToView as MltGameView } from "./games/most-likely-to";
export type { RingOfFireView as RofGameView } from "./games/ring-of-fire";
