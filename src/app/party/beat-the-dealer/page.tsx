"use client";

import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { type Card, RANKS, rankValue } from "@/lib/cards";
import { GameShell, GameToolbar, PlayerSetup, useDeckGame } from "../shared";

// Moves are rank guesses encoded as letters: a = Ace, b = 2, … m = King.
// Each card takes one or two guesses. Rules:
//   right first time  → dealer drinks FIRST_HIT
//   right second time → dealer drinks SECOND_HIT
//   wrong twice       → guesser drinks the difference between their 2nd guess and the card
// Three misses in a row and the dealer passes the deck to the next player.
const CODES = "abcdefghijklm";
const FIRST_HIT = 4;
const SECOND_HIT = 2;
const MISSES_TO_PASS = 3;

const label = (c: Card) => `${c.rank}${c.suit.symbol}`;
const rankName = (v: number) => RANKS[v - 1];

type Result =
  | { kind: "first" | "second"; card: Card; guesser: string; dealer: string; drinks: number }
  | { kind: "miss"; card: Card; guesser: string; dealer: string; drinks: number; guess: number; passedTo: string | null };

export default function BeatTheDealerPage() {
  return (
    <GameShell title="Beat the Dealer">
      <Suspense>
        <BeatTheDealer />
      </Suspense>
    </GameShell>
  );
}

function BeatTheDealer() {
  const game = useDeckGame();
  const { deck, players } = game;
  const moves = game.moves.replace(/[^a-m]/g, "").slice(0, 104);

  if (!game.seed || players.length < 2) {
    return (
      <PlayerSetup
        onStart={game.start}
        minPlayers={2}
        intro={
          <>
            One player is the dealer. Everyone else takes turns guessing the rank of the dealer&rsquo;s next card.
            Get it first time and the dealer drinks {FIRST_HIT}. Miss, and you&rsquo;re told higher or lower for one
            more go — right then, the dealer drinks {SECOND_HIT}; wrong again, and you drink the difference.
            {` ${MISSES_TO_PASS}`} misses in a row and the dealer passes the deck on.
          </>
        }
      />
    );
  }

  // replay
  let c = 0;
  let firstGuess: number | null = null;
  let dealer = 0;
  let guesser = 1;
  let misses = 0;
  let last: Result | null = null;
  const nextGuesser = (from: number) => {
    let g = (from + 1) % players.length;
    if (g === dealer) g = (g + 1) % players.length;
    return g;
  };

  for (const m of moves) {
    if (c >= deck.length) break;
    const card = deck[c];
    const v = rankValue(card);
    const r = CODES.indexOf(m) + 1;
    const base = { card, guesser: players[guesser], dealer: players[dealer] };

    if (firstGuess === null) {
      if (r === v) {
        last = { kind: "first", drinks: FIRST_HIT, ...base };
        misses = 0;
      } else {
        firstGuess = r;
        continue;
      }
    } else if (r === v) {
      last = { kind: "second", drinks: SECOND_HIT, ...base };
      misses = 0;
    } else {
      misses++;
      let passedTo: string | null = null;
      if (misses >= MISSES_TO_PASS) {
        dealer = (dealer + 1) % players.length;
        passedTo = players[dealer];
        misses = 0;
      }
      last = { kind: "miss", drinks: Math.abs(r - v), guess: r, passedTo, ...base };
    }
    // card resolved
    c++;
    firstGuess = null;
    guesser = nextGuesser(guesser);
  }

  const done = c >= deck.length;
  const seen = deck.slice(0, c);
  const gone = (v: number) => seen.filter((x) => rankValue(x) === v).length;
  const current = deck[c];
  const hint = firstGuess !== null && current ? (rankValue(current) > firstGuess ? "higher" : "lower") : null;

  return (
    <div>
      <GameToolbar game={game} left={deck.length - c} />

      <div className="mt-8 grid items-start gap-10 sm:grid-cols-[auto_1fr]">
        <div className="flex items-end gap-3 justify-self-center">
          {last && (
            <div key={`last-${c}`} className="pop">
              <PlayingCard card={last.card} />
            </div>
          )}
          {!done && <PlayingCard card={current} hidden size="lg" />}
        </div>

        <div>
          {last && firstGuess === null && <ResultBanner r={last} key={c} />}

          {done ? (
            <p className="mt-6 font-hand text-3xl">Deck finished — reshuffle with “New deck”.</p>
          ) : (
            <div className="mt-6">
              <p className="text-sm text-faint">
                Dealer <strong className="text-ink">{players[dealer]}</strong> · Guessing{" "}
                <strong className="text-ink">{players[guesser]}</strong> · Misses in a row {misses}/{MISSES_TO_PASS}
              </p>
              {hint ? (
                <>
                  <h3 className="mt-1 font-hand text-4xl font-bold">
                    Not a {rankName(firstGuess!)} — it&rsquo;s <span className="text-miss">{hint}</span>. One more go.
                  </h3>
                  <p className="mt-1 max-w-lg text-sm">
                    Guess again. Right this time and {players[dealer]} drinks {SECOND_HIT}. Wrong and{" "}
                    {players[guesser]} drinks the gap between the guess and the real card (e.g. guess 5, card 9 =
                    4 drinks).
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-1 font-hand text-4xl font-bold">
                    {players[guesser]}, what&rsquo;s {players[dealer]}&rsquo;s card?
                  </h3>
                  <p className="mt-1 max-w-lg text-sm">
                    Guess the rank (suit doesn&rsquo;t matter). Right first time and {players[dealer]} drinks{" "}
                    {FIRST_HIT}. Wrong, and you&rsquo;ll be told higher or lower for a second guess. Use the counts
                    below — ranks that are all gone can&rsquo;t come up.
                  </p>
                </>
              )}

              <div className="mt-5 grid max-w-xl grid-cols-7 gap-2 sm:grid-cols-13">
                {RANKS.map((rank, i) => {
                  const v = i + 1;
                  const g = gone(v);
                  const ruledOut =
                    g >= 4 ||
                    (firstGuess !== null && (v === firstGuess || (hint === "higher" ? v < firstGuess : v > firstGuess)));
                  return (
                    <button
                      key={rank}
                      onClick={() => game.push(CODES[i])}
                      disabled={g >= 4}
                      className={`flex flex-col items-center rounded-md border-2 py-2 font-mono font-bold transition-colors ${
                        ruledOut
                          ? "border-faint/30 text-faint/50"
                          : "border-ink hover:bg-ink hover:text-paper"
                      }`}
                    >
                      {rank}
                      <span className="text-[10px] font-normal opacity-70">{g}/4 out</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultBanner({ r }: { r: Result }) {
  if (r.kind === "miss") {
    return (
      <div className="pop">
        <h2 className="font-hand text-5xl font-bold text-miss">
          {r.guesser} drinks {r.drinks}
        </h2>
        <p className="mt-1 text-faint">
          The card was {label(r.card)}. Second guess was {rankName(r.guess)}, which is {r.drinks} away.
          {r.passedTo && ` That's ${MISSES_TO_PASS} misses in a row — ${r.dealer} survives and passes the deck to ${r.passedTo}.`}
        </p>
      </div>
    );
  }
  return (
    <div className="pop">
      <h2 className="font-hand text-5xl font-bold text-hit">
        {r.dealer} drinks {r.drinks}
      </h2>
      <p className="mt-1 text-faint">
        The card was {label(r.card)} — {r.guesser} got it {r.kind === "first" ? "first time" : "on the second guess"}.
      </p>
    </div>
  );
}
