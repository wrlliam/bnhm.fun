"use client";

import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { type Card, SUITS } from "@/lib/cards";
import { GameShell, GameToolbar, PlayerSetup, useDeckGame } from "../shared";

// The four Aces are the horses. Seven cards are laid face down along the track.
// Each card drawn moves the horse of its suit forward one step. When every horse has
// passed a track card, it flips, and the horse of that suit falls back one step.
// First horse past the end (step FINISH) wins.
const TRACK = 7;
const FINISH = TRACK + 1;

type SuitKey = (typeof SUITS)[number]["key"];
const suitOf = (k: SuitKey) => SUITS.find((s) => s.key === k)!;
const SUIT_NAMES: Record<SuitKey, string> = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };

export default function HorseRacePage() {
  return (
    <GameShell title="Horse Race">
      <Suspense>
        <HorseRace />
      </Suspense>
    </GameShell>
  );
}

function HorseRace() {
  const game = useDeckGame();

  if (!game.seed) {
    return (
      <PlayerSetup
        onStart={game.start}
        intro={
          <>
            The four Aces race each other. Before the start, everyone bets a number of sips on a suit (say it out
            loud). Each card drawn moves that suit&rsquo;s horse forward. When the winner crosses the line, everyone
            who backed it hands out double their bet — everyone else drinks theirs.
          </>
        }
      />
    );
  }

  const noAces = game.deck.filter((c) => c.rank !== "A");
  const track = noAces.slice(0, TRACK);
  const pile = noAces.slice(TRACK);
  const draws = Math.min(game.moves.replace(/[^.]/g, "").length, pile.length);

  // replay
  const pos: Record<SuitKey, number> = { S: 0, H: 0, D: 0, C: 0 };
  let revealed = 0;
  let winner: SuitKey | null = null;
  let lastDraw: Card | null = null;
  let knockedBack: Card[] = [];
  for (let i = 0; i < draws && !winner; i++) {
    const card = pile[i];
    lastDraw = card;
    knockedBack = [];
    pos[card.suit.key]++;
    if (pos[card.suit.key] >= FINISH) {
      winner = card.suit.key;
      break;
    }
    while (revealed < TRACK && SUITS.every((s) => pos[s.key] >= revealed + 1)) {
      const t = track[revealed];
      pos[t.suit.key] = Math.max(0, pos[t.suit.key] - 1);
      knockedBack.push(t);
      revealed++;
    }
  }

  const leader = [...SUITS].sort((a, b) => pos[b.key] - pos[a.key])[0];
  const outOfCards = !winner && draws >= pile.length;

  return (
    <div>
      <GameToolbar game={game} left={pile.length - draws} />

      {/* track */}
      <div className="mt-8 overflow-x-auto">
        <div className="grid w-max grid-cols-[4rem_repeat(9,3.5rem)] items-center gap-1.5">
          <span className="text-xs text-faint">Track</span>
          <span className="text-center text-xs text-faint">Start</span>
          {track.map((c, i) => (
            <div key={i} className="flex justify-center">
              <MiniCard card={c} hidden={i >= revealed} />
            </div>
          ))}
          <span className="text-center text-xs font-bold">Finish</span>

          {SUITS.map((s) => (
            <Lane key={s.key} suit={s.key} at={pos[s.key]} winner={winner === s.key} />
          ))}
        </div>
      </div>

      <div className="mt-8 max-w-xl">
        {winner ? (
          <div className="pop">
            <h2 className={`font-hand text-6xl font-bold ${suitOf(winner).red ? "text-miss" : ""}`}>
              {suitOf(winner).symbol} {SUIT_NAMES[winner]} win!
            </h2>
            <p className="mt-2 text-lg">
              Everyone who bet on {SUIT_NAMES[winner].toLowerCase()} hands out <strong>double</strong> their bet.
              Everyone else drinks the sips they bet.
            </p>
          </div>
        ) : lastDraw ? (
          <div key={draws} className="pop">
            <div className="flex items-center gap-4">
              <PlayingCard card={lastDraw} />
              <div>
                <h2 className="font-hand text-4xl font-bold">
                  {lastDraw.suit.symbol} {SUIT_NAMES[lastDraw.suit.key]} move up to {pos[lastDraw.suit.key]}
                </h2>
                {knockedBack.map((t) => (
                  <p key={t.rank + t.suit.key} className="text-miss">
                    Track card flipped: {t.rank}
                    {t.suit.symbol} — {SUIT_NAMES[t.suit.key]} fall back one.
                  </p>
                ))}
                <p className="mt-1 text-sm text-faint">
                  {pos[leader.key] > 0 && `${leader.symbol} ${SUIT_NAMES[leader.key]} lead at step ${pos[leader.key]}. `}
                  A track card flips when every horse has reached it.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-hand text-5xl font-bold">Place your bets</h2>
            <p className="mt-2">
              Everyone picks a suit and says how many sips they&rsquo;re betting (1–5 is sensible). Then hit{" "}
              <strong>Draw</strong>. Each card moves its suit&rsquo;s horse one step. When all four horses have passed
              a face-down track card, it flips and that suit&rsquo;s horse goes back one.
            </p>
          </>
        )}

        {outOfCards && <p className="mt-4 font-hand text-3xl">Out of cards — {SUIT_NAMES[leader.key]} win on points.</p>}

        <button
          onClick={() => game.push(".")}
          disabled={!!winner || outOfCards}
          className="mt-6 rounded-md bg-ink px-6 py-3 font-medium text-paper transition hover:bg-ink/90 disabled:opacity-40"
        >
          {winner ? "Race over" : draws === 0 ? "And they're off — draw" : "Draw next card"}
        </button>
      </div>
    </div>
  );
}

function Lane({ suit, at, winner }: { suit: SuitKey; at: number; winner: boolean }) {
  const s = suitOf(suit);
  return (
    <>
      <span className={`font-hand text-2xl font-bold ${s.red ? "text-miss" : ""}`}>
        {s.symbol} {at}
      </span>
      {Array.from({ length: FINISH + 1 }, (_, step) => (
        <div
          key={step}
          className={`flex h-16 items-center justify-center rounded-md ${
            step === FINISH ? "bg-hit/10" : "border border-dashed border-faint/30"
          }`}
        >
          {step === at && (
            <div className={`pop ${winner ? "ring-4 ring-hit rounded-lg" : ""}`}>
              <MiniCard card={{ rank: "A", suit: s }} />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function MiniCard({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  if (hidden) return <div className="h-14 w-10 rounded-md border border-white/30 bg-card-back shadow" />;
  return (
    <div
      className={`flex h-14 w-10 flex-col items-center justify-center rounded-md border border-black/15 bg-[#fdfcf8] text-sm font-bold leading-none shadow ${
        card.suit.red ? "text-[#c62d2d]" : "text-[#1b1b22]"
      }`}
    >
      <span>{card.rank}</span>
      <span>{card.suit.symbol}</span>
    </div>
  );
}
