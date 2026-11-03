"use client";

import { useMemo } from "react";
import { seededShuffle } from "@/lib/cards";
import { GameToolbar, PlayerSetup, useDeckGame } from "./shared";

/** A shuffled deck of text prompts. The seed in the URL fixes the order. */
export function PromptGame({
  prompts,
  intro,
  prefix,
  rule,
}: {
  prompts: readonly string[];
  intro: React.ReactNode;
  prefix?: string;
  rule: string;
}) {
  const game = useDeckGame();
  const order = useMemo(() => (game.seed ? seededShuffle(prompts, game.seed) : []), [prompts, game.seed]);
  const i = Math.min(game.moves.replace(/[^.]/g, "").length, prompts.length);

  if (!game.seed) return <PlayerSetup onStart={game.start} intro={intro} />;

  const done = i >= order.length;
  const reader = game.players.length ? game.players[i % game.players.length] : null;

  return (
    <div>
      <GameToolbar game={game} left={order.length - i} />

      <div className="mt-10 max-w-2xl">
        {done ? (
          <h2 className="font-hand text-5xl font-bold">That&rsquo;s every card. Hit “New deck” to go again.</h2>
        ) : (
          <div key={i} className="pop rounded-2xl border-2 border-ink bg-surface p-8 shadow-sm">
            {reader && <p className="text-sm text-faint">{reader} reads</p>}
            <p className="mt-2 font-hand text-5xl font-bold leading-tight">
              {prefix && <span className="text-faint">{prefix} </span>}
              {order[i]}
            </p>
          </div>
        )}
        <p className="mt-4 text-sm text-faint">{rule}</p>
        <button
          onClick={() => game.push(".")}
          disabled={done}
          className="mt-6 rounded-md bg-ink px-6 py-3 font-medium text-paper transition hover:bg-ink/90 disabled:opacity-40"
        >
          Next card
        </button>
      </div>
    </div>
  );
}
