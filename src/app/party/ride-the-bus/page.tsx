"use client";

import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { type Card, rankValue, SUITS } from "@/lib/cards";
import { GameShell, GameToolbar, PlayerSetup, useDeckGame } from "../shared";

// Each run is up to 4 cards. Move codes:
//   stage 0  R/B  red or black
//   stage 1  H/L  higher or lower than card 1
//   stage 2  I/O  inside or outside cards 1 & 2
//   stage 3  s/h/d/c  suit
// Wrong at stage n = drink n+1 and start again from stage 0. Clear all 4 = off the bus.

const STAGES = [
  { title: "Red or black?", options: [{ m: "R", label: "Red" }, { m: "B", label: "Black" }] },
  { title: "Higher or lower?", options: [{ m: "H", label: "↑ Higher" }, { m: "L", label: "↓ Lower" }] },
  { title: "Inside or outside?", options: [{ m: "I", label: "Inside" }, { m: "O", label: "Outside" }] },
  {
    title: "Which suit?",
    options: SUITS.map((s) => ({ m: s.key.toLowerCase(), label: s.symbol, red: s.red })),
  },
] as const;

function isCorrect(stage: number, move: string, card: Card, run: Card[]) {
  const v = rankValue(card);
  switch (stage) {
    case 0:
      return move === (card.suit.red ? "R" : "B");
    case 1: {
      const a = rankValue(run[0]);
      return move === "H" ? v > a : v < a;
    }
    case 2: {
      const lo = Math.min(rankValue(run[0]), rankValue(run[1]));
      const hi = Math.max(rankValue(run[0]), rankValue(run[1]));
      return move === "I" ? v > lo && v < hi : v < lo || v > hi;
    }
    default:
      return move === card.suit.key.toLowerCase();
  }
}

const label = (c: Card) => `${c.rank}${c.suit.symbol}`;
const SUIT_NAMES: Record<string, string> = { S: "spades", H: "hearts", D: "diamonds", C: "clubs" };

/** What the player is being asked right now, using the cards already on the table. */
function explainStage(stage: number, run: Card[]): string {
  switch (stage) {
    case 0:
      return "Guess the colour of the next card. Hearts ♥ and diamonds ♦ are red; spades ♠ and clubs ♣ are black. Miss = drink 1.";
    case 1:
      return `Will the next card be higher or lower than your ${label(run[0])}? Aces count as 1, Jacks 11, Queens 12, Kings 13. The same rank counts as wrong. Miss = drink 2.`;
    case 2: {
      const [a, b] = [...run.slice(0, 2)].sort((x, y) => rankValue(x) - rankValue(y));
      if (rankValue(a) === rankValue(b)) {
        return `Your two cards are both ${a.rank}s, so nothing can be inside them. Pick outside: anything except another ${a.rank} wins. Miss = drink 3.`;
      }
      return `Inside means strictly between ${label(a)} and ${label(b)}. Outside means lower than ${a.rank} or higher than ${b.rank}. Matching either card counts as wrong. Miss = drink 3.`;
    }
    default:
      return "Name the suit of the next card. It's a 1-in-4 shot. Get it right and you're off the bus. Miss = drink 4.";
  }
}

/** Why a guess was right or wrong. */
function explainResult(stage: number, card: Card, run: Card[]): string {
  const v = rankValue(card);
  switch (stage) {
    case 0:
      return `It was ${label(card)}, which is ${card.suit.red ? "red" : "black"}.`;
    case 1: {
      const a = rankValue(run[0]);
      const rel = v === a ? "the same rank as" : v > a ? "higher than" : "lower than";
      return `It was ${label(card)}, ${rel} ${label(run[0])}.`;
    }
    case 2: {
      const [lo, hi] = [rankValue(run[0]), rankValue(run[1])].sort((x, y) => x - y);
      const where = v === lo || v === hi ? "matching one of the edges" : v > lo && v < hi ? "inside" : "outside";
      return `It was ${label(card)}, ${where} (${label(run[0])} and ${label(run[1])}).`;
    }
    default:
      return `It was ${label(card)}: ${SUIT_NAMES[card.suit.key]}.`;
  }
}

export default function RideTheBusPage() {
  return (
    <GameShell title="Ride the Bus">
      <Suspense>
        <RideTheBus />
      </Suspense>
    </GameShell>
  );
}

function RideTheBus() {
  const game = useDeckGame();
  const { deck, players } = game;
  const moves = game.moves.replace(/[^RBHLIOshdc]/g, "").slice(0, 52);

  if (!game.seed) {
    return (
      <PlayerSetup
        onStart={game.start}
        intro={
          <>
            Get four calls right in a row: red or black, higher or lower, inside or outside, then the suit. Miss one
            and you drink (1, 2, 3 or 4 depending on how far you got) and start over. Ties count as wrong.
          </>
        }
      />
    );
  }

  // replay
  let stage = 0;
  let run: Card[] = [];
  let turn = 0;
  let totalDrinks = 0;
  let last: { correct: boolean; drinks: number; who: string | null; offBus: boolean; why: string } | null = null;
  const name = (t: number) => (players.length ? players[t % players.length] : null);

  for (let k = 0; k < moves.length; k++) {
    const card = deck[k];
    const correct = isCorrect(stage, moves[k], card, run);
    const why = explainResult(stage, card, run);
    run = [...run, card];
    if (correct && stage === 3) {
      last = { correct, drinks: 0, who: name(turn), offBus: true, why };
      stage = 0;
      run = [];
      turn++;
    } else if (correct) {
      last = { correct, drinks: 0, who: name(turn), offBus: false, why };
      stage++;
    } else {
      last = { correct, drinks: stage + 1, who: name(turn), offBus: false, why };
      totalDrinks += stage + 1;
      stage = 0;
      run = [];
    }
  }

  // cards to show: the current run, or the card that just ended it
  const shown = run.length > 0 ? run : moves.length > 0 ? [deck[moves.length - 1]] : [];
  const done = moves.length >= deck.length;
  const s = STAGES[stage];
  const who = name(turn);

  return (
    <div>
      <GameToolbar game={game} left={deck.length - moves.length} />

      <div className="mt-8 flex min-h-36 flex-wrap items-end gap-3">
        {shown.map((c, i) => (
          <div key={`${moves.length}-${i}`} className={i === shown.length - 1 ? "pop" : ""}>
            <PlayingCard card={c} />
          </div>
        ))}
        {Array.from({ length: Math.max(0, 4 - shown.length) }, (_, i) => (
          <div key={`empty-${i}`} className="h-28 w-20 rounded-lg border-2 border-dashed border-faint/40" />
        ))}
      </div>

      <div className="mt-6 min-h-20">
        {last && (
          <div key={moves.length} className="pop">
            {last.offBus ? (
              <h2 className="font-hand text-5xl font-bold text-hit">
                {last.who ? `${last.who} is off the bus!` : "Off the bus"}
              </h2>
            ) : last.correct ? (
              <h2 className="font-hand text-4xl font-bold text-hit">Correct</h2>
            ) : (
              <h2 className="font-hand text-5xl font-bold text-miss">
                Wrong — {last.who ? `${last.who} drinks` : "drink"} {last.drinks}. Back to the start.
              </h2>
            )}
            <p className="mt-1 text-faint">
              {last.why}
              {last.offBus && (last.who && players.length > 1 ? ` Pass the phone to ${who}.` : " Start a new run.")}
            </p>
          </div>
        )}
      </div>

      {done ? (
        <p className="mt-6 font-hand text-3xl">Out of cards — reshuffle with “New deck”.</p>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-faint">
            {who && (
              <>
                <strong className="text-ink">{who}</strong> ·{" "}
              </>
            )}
            Step {stage + 1} of 4
          </p>
          <h3 className="mt-1 font-hand text-4xl font-bold">{s.title}</h3>
          <p className="mt-1 max-w-lg text-sm">{explainStage(stage, run)}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {s.options.map((o) => (
              <button
                key={o.m}
                onClick={() => game.push(o.m)}
                className={`min-w-24 rounded-md border-2 border-ink px-5 py-3 font-medium transition-colors hover:bg-ink hover:text-paper ${
                  "red" in o ? `text-2xl ${o.red ? "text-miss" : ""}` : ""
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-10 text-sm text-faint">
        Drinks this game: <span className="font-mono text-ink">{totalDrinks}</span>
      </p>
    </div>
  );
}
