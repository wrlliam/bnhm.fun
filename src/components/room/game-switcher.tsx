"use client";

import { useState } from "react";
import { Emblem } from "@/components/emblem";
import { CATEGORIES, GAMES_CATALOG } from "@/lib/catalog";
import type { RoomView } from "@/lib/rooms/client";
import { act } from "./room-shell";

/** Host: switch the whole room to another game. Players stay; nobody rejoins. */
export function GameSwitcher({ room, compact = false }: { room: RoomView; compact?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {CATEGORIES.map((c) => (
        <div key={c.id}>
          <p className="text-xs font-medium text-faint">{c.title}</p>
          <div className={`mt-2 grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {GAMES_CATALOG.filter((g) => g.category === c.id).map((g) => {
              const current = g.kind === room.kind;
              const tooFew = room.players.length < g.minPlayers;
              return (
                <button
                  key={g.kind}
                  disabled={busy !== null || tooFew}
                  onClick={async () => {
                    setBusy(g.kind);
                    await act(room, null, null, { type: "switchGame", kind: g.kind });
                    setBusy(null);
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-40 ${
                    current ? "border-hit bg-hit/10" : "border-ink/10 hover:bg-ink/5"
                  }`}
                >
                  <Emblem rank={g.emblem.rank} suit={g.emblem.suit} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {g.name}
                      {current && <span className="ml-2 text-xs text-hit">playing now</span>}
                    </span>
                    <span className="block truncate text-xs text-faint">
                      {tooFew ? `Needs ${g.minPlayers}+ players` : g.tagline}
                    </span>
                  </span>
                  {busy === g.kind && <span className="text-xs text-faint">…</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Shown to everyone when a game ends: the host picks what's next, others see it's coming. */
export function WhatsNext({ room }: { room: RoomView }) {
  if (!room.isHost) {
    return (
      <div className="pop rounded-2xl bg-ink/5 p-4 text-center">
        <p className="font-medium">That&rsquo;s the end of this game</p>
        <p className="text-sm text-faint">The host is picking what&rsquo;s next. Stay in the room.</p>
      </div>
    );
  }
  return (
    <div className="pop space-y-4 rounded-2xl border border-ink/10 bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">What&rsquo;s next?</p>
        <button onClick={() => act(room, null, null, { type: "start" })} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
          Play again
        </button>
      </div>
      <p className="text-sm text-faint">Or switch the whole room to another game. Everyone stays in.</p>
      <GameSwitcher room={room} />
    </div>
  );
}
