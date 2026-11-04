"use client";

import { useEffect, useState } from "react";
import { WhoIsHere } from "@/games/ring-of-fire/player";
import type { RoomView } from "@/lib/rooms/client";
import { Avatar } from "./avatar";
import { act, BigButton, openTv } from "./room-shell";

/** Standard lobby: who's here, host Start + TV buttons, and a one-line how-it-works. */
export function GameLobby({
  room,
  token,
  hostToken,
  howItWorks,
  minPlayers = 2,
  children,
}: {
  room: RoomView;
  token: string | null;
  hostToken: string | null;
  howItWorks: React.ReactNode;
  minPlayers?: number;
  children?: React.ReactNode;
}) {
  const enough = room.players.length >= minPlayers;
  return (
    <div className="pop space-y-6">
      <div>
        <h2 className="font-hand text-5xl font-bold">You&rsquo;re in!</h2>
        <p className="mt-1 text-faint">
          {room.isHost ? "Start when everyone has joined." : "Waiting for the host to start the game."}
        </p>
      </div>
      <WhoIsHere room={room} />
      {room.isHost && (
        <div className="space-y-3">
          <BigButton className="w-full py-4 text-lg" disabled={!enough} onClick={() => act(room, token, hostToken, { type: "start" })}>
            {enough ? `Start with ${room.players.length} ${room.players.length === 1 ? "player" : "players"}` : `Waiting for at least ${minPlayers} players`}
          </BigButton>
          <button
            onClick={() => openTv(room.code)}
            className="w-full rounded-md border-2 border-ink py-3 font-medium transition hover:bg-ink hover:text-paper"
          >
            Open the TV screen
          </button>
          {children}
        </div>
      )}
      <p className="text-sm text-faint">How it works: {howItWorks}</p>
    </div>
  );
}

/** Seconds left until `deadline`, ticking. Turns red in the last 5 s. */
export function Countdown({ deadline, big = false }: { deadline: number | null; big?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono font-bold tabular-nums ${
        left <= 5 ? "bg-miss text-paper" : "bg-ink/10"
      } ${big ? "text-4xl" : "text-sm"}`}
      aria-live="off"
    >
      ⏱ {left}s
    </span>
  );
}

/** Host control: per-turn time limit. */
export function TurnTimerSetting({ room, value }: { room: RoomView; value: number }) {
  return (
    <div>
      <p className="text-sm font-medium">Turn timer</p>
      <p className="text-xs text-faint">If the clock runs out, that player&rsquo;s turn is skipped. It pauses while people are drinking.</p>
      <div className="mt-2 flex gap-1 rounded-xl bg-ink/5 p-1">
        {[0, 15, 30, 60].map((s) => (
          <button
            key={s}
            onClick={() => act(room, null, null, { type: room.kind === "ring-of-fire" ? "timer" : "settings", turnSeconds: s })}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${value === s ? "bg-surface shadow-sm" : "text-faint"}`}
          >
            {s === 0 ? "Off" : `${s}s`}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tap-a-player grid used by several games. */
export function PlayerPicker({
  room,
  onPick,
  exclude = [],
  selected,
}: {
  room: RoomView;
  onPick: (id: string) => void;
  exclude?: string[];
  selected?: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {room.players
        .filter((p) => !exclude.includes(p.id))
        .map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left transition ${
              selected === p.id ? "border-hit bg-hit/10" : "border-ink/20 hover:border-ink"
            }`}
          >
            <Avatar player={p} size={36} />
            <span className="font-hand text-2xl font-bold">{p.id === room.me ? "Me" : p.name}</span>
          </button>
        ))}
    </div>
  );
}
