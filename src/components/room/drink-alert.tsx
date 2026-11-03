"use client";

import { useEffect, useRef, useState } from "react";
import { type RoomView, roomAction } from "@/lib/rooms/client";
import { Avatar } from "./avatar";

/**
 * Full-screen "Drink!" for every unconfirmed drink aimed at this player.
 * It stays until they tap "Done" — and the game won't deal a new card until
 * everyone who has to drink has done so.
 */
export function DrinkAlert({ room, token }: { room: RoomView; token: string }) {
  const mine = room.pendingDrinks.filter((d) => d.playerId === room.me);
  const [sent, setSent] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const lastCount = useRef(0);

  // buzz when a new drink lands
  useEffect(() => {
    if (mine.length > lastCount.current) navigator.vibrate?.([200, 80, 200]);
    lastCount.current = mine.length;
  }, [mine.length]);

  const queue = mine.filter((d) => !sent.has(d.id));
  const d = queue[0];
  if (!d) return null;

  return (
    <div
      role="alertdialog"
      aria-label="You have to drink"
      className="pop fixed inset-0 z-50 flex flex-col items-center justify-center bg-miss p-8 text-center text-paper"
    >
      <p className="font-hand text-[22vw] font-bold leading-none sm:text-9xl">Drink!</p>
      <p className="mt-4 text-3xl font-bold">
        {d.amount === 0 ? "The whole King's cup" : d.amount === 1 ? "1 sip" : `${d.amount} sips`}
      </p>
      <p className="mt-4 max-w-md text-lg">{d.reason}</p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setSent((s) => new Set(s).add(d.id));
          const res = await roomAction(room.code, { type: "ackDrink", token, ids: [d.id] });
          if (!res.ok) setSent((s) => ((s = new Set(s)), s.delete(d.id), s));
          setBusy(false);
        }}
        className="mt-10 w-full max-w-xs rounded-2xl bg-paper py-5 text-2xl font-bold text-miss shadow-lg transition active:scale-95 disabled:opacity-60"
      >
        Done — I drank
      </button>
      <p className="mt-4 text-sm opacity-80">
        The next card waits until you tap Done{queue.length > 1 ? ` · ${queue.length - 1} more after this` : ""}
      </p>
    </div>
  );
}

/** "Waiting for Ben and Cat to drink…" with a host override. Renders nothing when nobody's pending. */
export function WaitingForDrinks({
  room,
  hostToken,
  big = false,
}: {
  room: RoomView;
  hostToken: string | null;
  big?: boolean;
}) {
  const people = room.waitingOn.map((id) => room.players.find((p) => p.id === id)).filter((p) => !!p);
  if (!people.length) return null;
  const names = people.map((p) => (p.id === room.me ? "you" : p.name));
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

  return (
    <div className={`pop flex flex-wrap items-center gap-3 rounded-2xl border-2 border-miss/40 bg-miss/10 px-4 py-3 ${big ? "text-2xl" : ""}`}>
      <span className="flex -space-x-2">
        {people.map((p) => (
          <Avatar key={p.id} player={p} size={big ? 48 : 32} ring="ring-paper" />
        ))}
      </span>
      <p className="flex-1">
        Waiting for <strong>{list}</strong> to drink…
        <span className={`block text-faint ${big ? "text-base" : "text-xs"}`}>The next card unlocks once everyone taps Done.</span>
      </p>
      {room.isHost && hostToken && (
        <button
          onClick={() => roomAction(room.code, { type: "ackAll", hostToken })}
          className="rounded-md border-2 border-ink/30 px-3 py-1 text-sm hover:border-ink"
        >
          Stop waiting
        </button>
      )}
    </div>
  );
}
