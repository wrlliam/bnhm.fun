"use client";

import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { type Card, rankValue } from "@/lib/cards";
import { GameShell, GameToolbar, PlayerSetup, useDeckGame } from "../shared";

const cardLabel = (c: Card) => `${c.rank}${c.suit.symbol}`;

// Moves are "H" (higher), "L" (lower) or "E" (equal / same rank). Card k+1 is revealed after move k.
// A wrong guess = drink one per card in the streak, and the turn passes on.
// Calling "equal" correctly is rare (~6%), so it also lets you hand out EQUAL_BONUS drinks.
const EQUAL_BONUS = 3;
const SAID = { H: "higher", L: "lower", E: "equal" } as const;

export default function HigherLowerPage() {
  return (
    <GameShell title="Higher or Lower">
      <Suspense>
        <HigherLower />
      </Suspense>
    </GameShell>
  );
}

function HigherLower() {
  const game = useDeckGame();
  const { deck, players } = game;
  const moves = game.moves.replace(/[^HLE]/g, "").slice(0, 51);

  if (!game.seed) {
    return (
      <PlayerSetup
        onStart={game.start}
        intro={
          <>
            Guess whether the next card is higher, lower or equal (same rank) to the current one. Aces are low. Keep a
            streak going — get one wrong and you drink one for every card in the streak, then pass the deck on. If
            you call higher or lower and it&rsquo;s the same rank, that&rsquo;s wrong. Nail an equal call and you
            hand out {EQUAL_BONUS} drinks.
          </>
        }
      />
    );
  }

  // replay all moves to derive streak, turn and the last result
  let streak = 0;
  let turn = 0;
  let best = 0;
  let last: { correct: boolean; drinks: number; who: string | null; why: string; bonus: boolean } | null = null;
  const name = (t: number) => (players.length ? players[t % players.length] : null);
  for (let k = 0; k < moves.length; k++) {
    const prev = rankValue(deck[k]);
    const next = rankValue(deck[k + 1]);
    const move = moves[k] as keyof typeof SAID;
    const correct = move === "H" ? next > prev : move === "L" ? next < prev : next === prev;
    const bonus = correct && move === "E";
    const rel = next === prev ? "the same rank as" : next > prev ? "higher than" : "lower than";
    const tieNote = next === prev && move !== "E" ? " — a tie, which only an equal call wins" : "";
    const why = `You said ${SAID[move]}. ${cardLabel(deck[k + 1])} is ${rel} ${cardLabel(deck[k])}${tieNote}.`;
    if (correct) {
      streak++;
      best = Math.max(best, streak);
      last = { correct, drinks: 0, who: name(turn), why, bonus };
    } else {
      last = { correct, drinks: streak + 1, who: name(turn), why, bonus };
      streak = 0;
      turn++;
    }
  }

  const current = deck[moves.length];
  const previous = moves.length > 0 ? deck[moves.length - 1] : null;
  const done = moves.length >= deck.length - 1;

  return (
    <div>
      <GameToolbar game={game} left={deck.length - moves.length - 1} />

      <div className="mt-8 grid items-center gap-10 sm:grid-cols-[auto_1fr]">
        <div className="flex items-end gap-3 justify-self-center">
          {previous && (
            <div className="opacity-50">
              <PlayingCard card={previous} />
            </div>
          )}
          <div key={moves.length} className="pop">
            <PlayingCard card={current} size="lg" />
          </div>
        </div>

        <div>
          {last && (
            <div key={moves.length} className="pop">
              {last.correct ? (
                <>
                  <h2 className="font-hand text-5xl font-bold text-hit">
                    {last.bonus
                      ? `Called it! ${last.who ?? "You"} hands out ${EQUAL_BONUS}`
                      : "Nice — keep going"}
                  </h2>
                  <p className="mt-1 text-faint">
                    {last.why} {last.bonus && `Equal calls are rare, so give ${EQUAL_BONUS} drinks to anyone you like. `}
                    Streak is now {streak}: miss the next one and you drink {streak + 1}.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-hand text-5xl font-bold text-miss">
                    Wrong! {last.who ? `${last.who} drinks` : "Drink"} {last.drinks}
                  </h2>
                  <p className="mt-1 text-faint">
                    {last.why}{" "}
                    {last.drinks === 1
                      ? "No streak, so just 1 drink."
                      : `You'd built a ${last.drinks - 1}-card streak, so that's ${last.drinks - 1} + 1 drinks.`}
                    {name(turn) && players.length > 1 ? ` Pass the phone to ${name(turn)}.` : ""}
                  </p>
                </>
              )}
            </div>
          )}
          {!last && <h2 className="font-hand text-5xl font-bold">Higher, lower or equal?</h2>}
          {!done && (
            <p className="mt-4 max-w-lg text-sm">
              Will the next card be higher, lower or the same rank as {cardLabel(current)}? Aces count as 1, Jacks
              11, Queens 12, Kings 13. If it turns out the same rank, only <strong>Equal</strong> wins — and a
              correct equal call lets you hand out {EQUAL_BONUS} drinks.{" "}
              {rankValue(current) === 1
                ? "Nothing is lower than an Ace, so higher is the safe call."
                : rankValue(current) === 13
                  ? "Nothing is higher than a King, so lower is the safe call."
                  : ""}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {name(turn) && (
              <p>
                <span className="text-faint">Guessing </span>
                <strong>{name(turn)}</strong>
              </p>
            )}
            <p>
              <span className="text-faint">Streak </span>
              <span className="font-mono">{streak}</span>
            </p>
            <p>
              <span className="text-faint">Best </span>
              <span className="font-mono">{best}</span>
            </p>
          </div>

          {done ? (
            <p className="mt-8 font-hand text-3xl">Deck finished</p>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => game.push("H")}
                className="rounded-md bg-ink px-8 py-3 font-medium text-paper transition-colors hover:bg-ink/90"
              >
                ↑ Higher
              </button>
              <button
                onClick={() => game.push("L")}
                className="rounded-md border-2 border-ink px-8 py-3 font-medium transition-colors hover:bg-ink hover:text-paper"
              >
                ↓ Lower
              </button>
              <button
                onClick={() => game.push("E")}
                className="rounded-md border-2 border-dashed border-ink px-6 py-3 font-medium transition-colors hover:bg-ink hover:text-paper"
              >
                = Equal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
