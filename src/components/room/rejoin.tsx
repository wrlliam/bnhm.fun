"use client";

import { useState } from "react";
import { type RoomView, roomAction, saveToken } from "@/lib/rooms/client";
import { Avatar } from "./avatar";

/** On the join screen: reclaim your existing seat from a new device using your PIN. */
export function RejoinForm({ room }: { room: RoomView }) {
  const [who, setWho] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const candidates = room.players.filter((p) => !p.online);
  if (!candidates.length) return null;

  return (
    <details className="mt-8 w-full max-w-sm text-left">
      <summary className="cursor-pointer text-sm font-medium">Already in this room on another phone? Rejoin</summary>
      <p className="mt-2 text-xs text-faint">
        Pick yourself and enter your 4-digit PIN. It&rsquo;s in the Menu on your old phone, or the host can see it.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {candidates.map((p) => (
          <button
            key={p.id}
            onClick={() => setWho(p.id)}
            className={`flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 ${who === p.id ? "border-hit bg-hit/10" : "border-ink/20"}`}
          >
            <Avatar player={p} size={26} />
            <span className="font-hand text-xl">{p.name}</span>
          </button>
        ))}
      </div>
      {who && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const res = await roomAction(room.code, { type: "rejoin", playerId: who, pin, token: null });
            if (!res.ok) return setError(res.error);
            saveToken(room.code, res.token as string);
          }}
        >
          <input
            autoFocus
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="PIN"
            className="w-28 rounded-md border-2 border-ink/25 transition-colors focus:border-ink bg-paper px-3 py-2 text-center font-mono text-2xl tracking-[0.3em] outline-none"
          />
          <button disabled={pin.length !== 4} className="rounded-md bg-ink px-4 font-medium text-paper disabled:opacity-40">
            Rejoin
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-miss">{error}</p>}
    </details>
  );
}
