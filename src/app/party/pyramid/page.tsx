"use client";

import { Suspense, useState } from "react";
import { PlayingCard } from "@/components/playing-card";
import type { Card } from "@/lib/cards";
import { GameShell, GameToolbar, PlayerSetup, useDeckGame } from "../shared";

// Everyone is dealt HAND_SIZE cards. The next 15 form a pyramid: 5 on the bottom row
// down to 1 at the top. Flip them bottom-left first. When a card flips, anyone holding
// the same rank gives out drinks equal to that row's number (1 at the bottom, 5 at the top).
const HAND_SIZE = 4;
const ROWS = [5, 4, 3, 2, 1]; // cards per row, bottom → top
const MAX = Math.floor((52 - 15) / HAND_SIZE); // 9 players

const label = (c: Card) => `${c.rank}${c.suit.symbol}`;

function rowOf(flipIndex: number) {
  let n = flipIndex;
  for (let r = 0; r < ROWS.length; r++) {
    if (n < ROWS[r]) return r + 1;
    n -= ROWS[r];
  }
  return ROWS.length;
}

export default function PyramidPage() {
  return (
    <GameShell title="Pyramid">
      <Suspense>
        <Pyramid />
      </Suspense>
    </GameShell>
  );
}

function Pyramid() {
  const game = useDeckGame();
  const { deck } = game;
  const players = game.players.slice(0, MAX);
  const [showHands, setShowHands] = useState(false);

  if (!game.seed || players.length < 2) {
    return (
      <PlayerSetup
        onStart={game.start}
        minPlayers={2}
        maxPlayers={MAX}
        intro={
          <>
            Everyone gets {HAND_SIZE} cards to memorise. Then 15 cards are laid out in a pyramid and flipped one at a
            time from the bottom. If you hold a card with the same rank as the one flipped, you give out drinks — 1 on
            the bottom row, rising to 5 at the top.
          </>
        }
      />
    );
  }

  const hands = players.map((_, p) => deck.slice(p * HAND_SIZE, (p + 1) * HAND_SIZE));
  const pyramid = deck.slice(players.length * HAND_SIZE, players.length * HAND_SIZE + 15);
  const flipped = Math.min(game.moves.replace(/[^.]/g, "").length, 15);
  const current = flipped > 0 ? pyramid[flipped - 1] : null;
  const row = flipped > 0 ? rowOf(flipped - 1) : 1;
  const matches = current
    ? players.flatMap((name, p) =>
        hands[p].filter((c) => c.rank === current.rank).map((c) => ({ name, card: c })),
      )
    : [];

  // lay out rows top → bottom for display, remembering each card's flip index
  const layout: { card: Card; index: number }[][] = [];
  let start = 0;
  ROWS.forEach((count) => {
    layout.unshift(pyramid.slice(start, start + count).map((card, k) => ({ card, index: start + k })));
    start += count;
  });

  return (
    <div>
      <GameToolbar game={game} left={15 - flipped} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[auto_1fr]">
        <div className="space-y-2">
          {layout.map((cards, r) => (
            <div key={r} className="flex items-center justify-center gap-2">
              <span className="w-16 text-right text-xs text-faint">
                {ROWS.length - r} {ROWS.length - r === 1 ? "drink" : "drinks"}
              </span>
              {cards.map(({ card, index }) => (
                <div
                  key={index}
                  className={`${index === flipped - 1 ? "pop" : ""} ${
                    index < flipped - 1 ? "opacity-60" : ""
                  }`}
                >
                  <PlayingCard card={card} hidden={index >= flipped} size="sm" />
                </div>
              ))}
              <span className="w-16" />
            </div>
          ))}
        </div>

        <div>
          {flipped === 0 ? (
            <>
              <h2 className="font-hand text-5xl font-bold">Memorise your hands</h2>
              <p className="mt-2 max-w-md">
                Pass the phone round. Each player taps <em>Show hands</em>, looks at their own {HAND_SIZE} cards, and
                hides them again. Then start flipping the pyramid from the bottom row.
              </p>
            </>
          ) : (
            <div key={flipped} className="pop">
              <p className="text-faint">
                Row {row} · worth {row} {row === 1 ? "drink" : "drinks"}
              </p>
              <h2 className="font-hand text-5xl font-bold">{label(current!)} flipped</h2>
              {matches.length ? (
                <ul className="mt-3 space-y-1 text-lg">
                  {matches.map((m) => (
                    <li key={label(m.card)}>
                      <strong>{m.name}</strong> has {label(m.card)} → gives out {row}{" "}
                      {row === 1 ? "drink" : "drinks"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-lg">Nobody holds a {current!.rank}. Everyone&rsquo;s safe this time.</p>
              )}
              <p className="mt-3 max-w-md text-sm text-faint">
                Anyone holding a card of the same rank gives that many drinks to whoever they like — split them up or
                give them all to one person. Higher rows are worth more, so the top card is worth 5.
              </p>
            </div>
          )}

          <button
            onClick={() => game.push(".")}
            disabled={flipped >= 15}
            className="mt-8 rounded-md bg-ink px-6 py-3 font-medium text-paper transition hover:bg-ink/90 disabled:opacity-40"
          >
            {flipped >= 15 ? "Pyramid finished" : flipped === 0 ? "Flip the first card" : "Flip next card"}
          </button>
          {flipped >= 15 && (
            <p className="mt-3 max-w-md text-sm">
              Final round: everyone reveals their hand. Anyone who can&rsquo;t remember all {HAND_SIZE} of their
              cards drinks one for each card they forget.
            </p>
          )}

          <div className="mt-10">
            <button
              onClick={() => setShowHands((s) => !s)}
              className="text-sm font-medium underline underline-offset-4"
            >
              {showHands ? "Hide hands" : "Show hands"}
            </button>
            {showHands && (
              <ul className="mt-4 space-y-4">
                {players.map((name, p) => (
                  <li key={name + p}>
                    <p className="font-hand text-2xl font-bold">{name}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {hands[p].map((c) => (
                        <div
                          key={label(c)}
                          className={current && c.rank === current.rank ? "rounded-lg ring-4 ring-hit" : ""}
                        >
                          <PlayingCard card={c} />
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
