"use client";

import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { RULES } from "@/lib/ring-of-fire";
import { GameShell, GameToolbar, PlayerSetup, useDeckGame } from "../shared";

export default function RingOfFirePage() {
  return (
    <GameShell title="Ring of Fire">
      <Suspense>
        <RingOfFire />
      </Suspense>
    </GameShell>
  );
}

function RingOfFire() {
  const game = useDeckGame();
  const { deck, players } = game;
  const moves = game.moves.slice(0, 52);

  if (!game.seed) {
    return (
      <PlayerSetup
        onStart={game.start}
        intro={
          <>
            Spread the deck in a ring around a cup. Take turns drawing a card and follow its rule. Whoever draws the{" "}
            <strong className="text-ink">fourth King</strong> drinks the King&rsquo;s cup.
          </>
        }
      />
    );
  }

  const drawn = moves.length;
  const card = drawn > 0 ? deck[drawn - 1] : null;
  const history = deck.slice(0, drawn);
  const kings = history.filter((c) => c.rank === "K").length;
  const whoDrew = (n: number) => (players.length ? players[n % players.length] : null);
  const lastQueen = history.findLastIndex((c) => c.rank === "Q");
  const questionMaster = lastQueen >= 0 ? whoDrew(lastQueen) : null;
  const rule = card && RULES[card.rank];
  const finalKing = card?.rank === "K" && kings === 4;
  const done = drawn >= deck.length;

  return (
    <div>
      <GameToolbar game={game} left={deck.length - drawn} />

      <div className="mt-8 grid items-center gap-10 sm:grid-cols-[auto_1fr]">
        <button
          onClick={() => !done && game.push(".")}
          disabled={done}
          className="group justify-self-center outline-none"
          aria-label="Draw a card"
        >
          {card ? (
            <div key={drawn} className="pop">
              <PlayingCard card={card} size="lg" />
            </div>
          ) : (
            <PlayingCard card={deck[0]} hidden size="lg" />
          )}
        </button>

        <div>
          {rule ? (
            <div key={drawn} className="pop">
              {whoDrew(drawn - 1) && <p className="text-faint">{whoDrew(drawn - 1)} drew</p>}
              <h2 className={`font-hand text-6xl font-bold ${finalKing ? "text-miss" : ""}`}>
                {finalKing ? "Drink the King's cup!" : rule.name}
              </h2>
              {finalKing ? (
                <p className="mt-2 max-w-md text-lg">
                  That&rsquo;s the fourth King.{" "}
                  {whoDrew(drawn - 1) ? `${whoDrew(drawn - 1)} drinks` : "You drink"} everything in the middle cup.
                  Game over, or keep drawing for fun.
                </p>
              ) : (
                <>
                  <p className="mt-2 max-w-md text-lg">{rule.text}</p>
                  <ol className="mt-4 max-w-md list-decimal space-y-1 pl-5 text-sm">
                    {rule.how.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {rule.example && (
                    <p className="mt-3 max-w-md text-sm text-faint">
                      <span className="font-medium text-ink">Example: </span>
                      {rule.example}
                    </p>
                  )}
                  {card?.rank === "K" && (
                    <p className="mt-3 text-sm font-medium text-miss">
                      {4 - kings} more {4 - kings === 1 ? "King" : "Kings"} until someone drinks the cup.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <h2 className="font-hand text-5xl font-bold">Tap the deck to draw</h2>
          )}

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <p>
              <span className="text-faint">Kings drawn </span>
              <span className="align-middle text-xl tracking-wider">
                {"♚".repeat(kings)}
                <span className="text-faint/40">{"♚".repeat(Math.max(0, 4 - kings))}</span>
              </span>
            </p>
            {questionMaster && (
              <p>
                <span className="text-faint">Question master </span>
                {questionMaster}
              </p>
            )}
            {players.length > 0 && !done && (
              <p>
                <span className="text-faint">Next up </span>
                <strong>{whoDrew(drawn)}</strong>
              </p>
            )}
          </div>

          <button
            onClick={() => game.push(".")}
            disabled={done}
            className="mt-8 rounded-md bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-40"
          >
            {done ? "Deck finished" : card ? "Draw next card" : "Draw first card"}
          </button>
        </div>
      </div>

      <details className="mt-14 max-w-2xl">
        <summary className="cursor-pointer text-sm font-medium">All the rules</summary>
        <dl className="mt-3 grid grid-cols-[3rem_1fr] gap-x-3 gap-y-2 text-sm">
          {Object.entries(RULES).map(([rank, r]) => (
            <div key={rank} className="contents">
              <dt className="font-mono font-bold">{rank}</dt>
              <dd>
                <strong>{r.name}</strong> — {r.text}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
