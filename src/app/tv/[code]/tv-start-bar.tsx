"use client";

import { act, BigButton } from "@/components/room/room-shell";
import type { RoomView } from "@/lib/rooms/client";

// Ring of Fire, Most Likely To and Hangman have their own TV controls.
const NEEDS_BAR = new Set([
  "never-have-i-ever",
  "higher-lower",
  "truth-or-drink",
  "trivia",
  "spotlight",
  "punchline",
  "bluff",
  "odd-one-out",
]);

/** Host-only start / play-again bar on the TV for games whose TV view is display-only. */
export function TvStartBar({ room }: { room: RoomView }) {
  const status = (room.game as { status?: string }).status;
  if (!room.isHost || !NEEDS_BAR.has(room.kind) || (status !== "lobby" && status !== "finished")) return null;
  const min = room.kind === "trivia" ? 1 : ["spotlight", "punchline", "bluff", "odd-one-out"].includes(room.kind) ? 3 : 2;
  return (
    <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2">
      <BigButton
        className="px-10 py-4 text-xl shadow-xl"
        disabled={room.players.length < min}
        onClick={() => act(room, null, null, { type: "start" })}
      >
        {status === "lobby" ? `Start game (${room.players.length} players)` : "Play again"}
      </BigButton>
    </div>
  );
}
