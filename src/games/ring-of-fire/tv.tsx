"use client";

import { useState } from "react";
import { PlayingCard } from "@/components/playing-card";
import { Avatar } from "@/components/room/avatar";
import { WaitingForDrinks } from "@/components/room/drink-alert";
import { act, BigButton } from "@/components/room/room-shell";
import { CardSettings, Chooser, CurrentCard, drinkTotals, game, nameOf, PairsEditor, type RofProps, RuleVote, TableInfo } from "./shared";

/** Big-screen view. With the host token it doubles as the admin panel. */
export function RofTv({ room, hostToken }: RofProps) {
  const g = game(room);
  const totals = drinkTotals(room);
  const admin = room.isHost;
  const [showSettings, setShowSettings] = useState(false);
  const [showPairs, setShowPairs] = useState(false);

  return (
    <div className="grid min-h-0 flex-1 gap-10 lg:grid-cols-[1fr_340px]">
      <section className="min-w-0">
        {g.status === "lobby" ? (
          <div>
            <h2 className="font-hand text-8xl font-bold">Ring of Fire</h2>
            <p className="mt-4 max-w-2xl text-2xl">
              Join on your phone with the code in the corner. On your turn, draw on your phone — the card appears here
              and everyone&rsquo;s phone explains it. Your phone buzzes when you have to drink.
            </p>
            {g.disabled.length > 0 && (
              <p className="mt-4 text-xl text-faint">Cards turned off: {g.disabled.join(", ")}</p>
            )}
            {admin && (
              <div className="mt-8 flex flex-wrap items-start gap-6">
                <BigButton
                  className="px-10 py-4 text-xl"
                  disabled={room.players.length < 2}
                  onClick={() => act(room, null, hostToken, { type: "start" })}
                >
                  Start game ({room.players.length} players)
                </BigButton>
                <div className="max-w-md space-y-6">
                  <CardSettings room={room} hostToken={hostToken} />
                  <div>
                    <p className="text-sm font-medium">Drinking partners (optional)</p>
                    <PairsEditor room={room} hostToken={hostToken} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <WaitingForDrinks room={room} hostToken={hostToken} big />
            {g.status === "playing" && !g.current?.pending && room.waitingOn.length === 0 && (
              <div className="flex items-center gap-4 text-3xl">
                {g.turnPlayerId && <Avatar player={room.players.find((p) => p.id === g.turnPlayerId)!} size={64} ring="ring-hit" />}
                <span>
                  <strong className="font-hand text-6xl">{nameOf(room, g.turnPlayerId)}</strong>, draw on your phone
                </span>
              </div>
            )}
            {g.current ? (
              <CurrentCard room={room} big />
            ) : (
              <div className="flex items-center gap-6">
                <PlayingCard card={{ rank: "A", suit: { key: "S", symbol: "♠", red: false } }} hidden size="lg" />
                <p className="font-hand text-6xl text-faint">{g.left} cards in the ring</p>
              </div>
            )}
            <RuleVote room={room} token={null} hostToken={hostToken} big />
            {admin && g.current?.pending && !g.vote && (
              <div className="max-w-2xl">
                <p className="text-faint">Admin: choose for {nameOf(room, g.current.by)}</p>
                <Chooser key={g.drawnCount} room={room} token={null} hostToken={hostToken} />
              </div>
            )}
            {g.status === "finished" && <h2 className="font-hand text-7xl font-bold">Deck finished!</h2>}
            <TableInfo room={room} big hostToken={admin ? hostToken : null} />
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <div>
          <h3 className="text-lg text-faint">Players · sips</h3>
          <ul className="mt-2 space-y-2">
            {room.players.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${g.turnPlayerId === p.id ? "bg-hit/10" : ""}`}
              >
                <Avatar player={p} size={44} dim={!p.online} ring={g.turnPlayerId === p.id ? "ring-hit" : undefined} />
                <span className="font-hand text-3xl font-bold">{p.name}</span>
                <span className="ml-auto font-mono text-xl">{totals.get(p.id) ?? 0}</span>
                {admin && (
                  <span className="flex gap-1">
                    <button
                      title={`Make ${p.name} drink`}
                      onClick={() => act(room, null, hostToken, { type: "penalty", playerId: p.id })}
                      className="rounded border border-miss/40 px-1.5 text-xs text-miss hover:bg-miss hover:text-paper"
                    >
                      drink
                    </button>
                    <button
                      title={`Remove ${p.name}`}
                      onClick={() => confirm(`Remove ${p.name}?`) && act(room, null, hostToken, { type: "kick", playerId: p.id })}
                      className="rounded border border-faint/40 px-1.5 text-xs text-faint hover:bg-ink hover:text-paper"
                    >
                      remove
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {g.log.length > 0 && (
          <div>
            <h3 className="text-lg text-faint">What&rsquo;s happened</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {[...g.log].reverse().slice(0, 8).map((l) => (
                <li key={l.id} className="pop">
                  {l.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {admin && g.status !== "lobby" && (
          <div className="space-y-3 rounded-xl border-2 border-dashed border-ink/30 p-4 text-sm">
            <p className="font-medium">Admin</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => act(room, null, hostToken, { type: "draw" })}
                disabled={!!g.current?.pending || g.status !== "playing" || room.waitingOn.length > 0}
                className="rounded border-2 border-ink px-2 py-1 hover:bg-ink hover:text-paper disabled:opacity-40"
              >
                Draw for {nameOf(room, g.turnPlayerId)}
              </button>
              <button
                onClick={() => act(room, null, hostToken, { type: "skip" })}
                className="rounded border-2 border-ink px-2 py-1 hover:bg-ink hover:text-paper"
              >
                Skip turn
              </button>
              <button
                onClick={() => setShowPairs((s) => !s)}
                className="rounded border-2 border-ink px-2 py-1 hover:bg-ink hover:text-paper"
              >
                Partners
              </button>
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="rounded border-2 border-ink px-2 py-1 hover:bg-ink hover:text-paper"
              >
                Cards on/off
              </button>
              <button
                onClick={() => confirm("End this game and go back to the lobby?") && act(room, null, hostToken, { type: "reset" })}
                className="rounded border-2 border-miss/50 px-2 py-1 text-miss hover:bg-miss hover:text-paper"
              >
                Reset
              </button>
            </div>
            {showSettings && <CardSettings room={room} hostToken={hostToken} compact />}
            {showPairs && <PairsEditor room={room} hostToken={hostToken} />}
            <p className="text-xs text-faint">“drink” next to a name makes that player drink (rule broken, etc). Their mates drink too.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
