import type { GameKind, GameModule } from "./core";
import { hangman } from "./games/hangman";
import { higherLower } from "./games/higher-lower";
import { mostLikelyTo } from "./games/most-likely-to";
import { neverHaveIEver } from "./games/never-have-i-ever";
import { ringOfFire } from "./games/ring-of-fire";
import { trivia } from "./games/trivia";
import { truthOrDrink } from "./games/truth-or-drink";

export const GAMES: Record<GameKind, GameModule<unknown>> = {
  hangman: hangman as GameModule<unknown>,
  "ring-of-fire": ringOfFire as GameModule<unknown>,
  "most-likely-to": mostLikelyTo as GameModule<unknown>,
  "never-have-i-ever": neverHaveIEver as GameModule<unknown>,
  "higher-lower": higherLower as GameModule<unknown>,
  "truth-or-drink": truthOrDrink as GameModule<unknown>,
  trivia: trivia as GameModule<unknown>,
};

export function isGameKind(k: unknown): k is GameKind {
  return typeof k === "string" && k in GAMES;
}

export type { HangmanView as HangmanGameView } from "./games/hangman";
export type { HlView as HlGameView } from "./games/higher-lower";
export type { MostLikelyToView as MltGameView } from "./games/most-likely-to";
export type { NhieView as NhieGameView } from "./games/never-have-i-ever";
export type { RingOfFireView as RofGameView } from "./games/ring-of-fire";
export type { TodView as TodGameView } from "./games/truth-or-drink";
export type { TriviaView as TriviaGameView } from "./games/trivia";
