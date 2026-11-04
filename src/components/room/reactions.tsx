"use client";

import { useState } from "react";
import { REACTIONS } from "@/lib/rooms/constants";
import { type RoomView, roomAction } from "@/lib/rooms/client";
import { Avatar } from "./avatar";

/** Row of quick reactions on a player's phone. They float up on the TV. */
export function ReactionBar({ room }: { room: RoomView }) {
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap justify-center gap-1.5" aria-label="Send a reaction to the TV">
      {REACTIONS.map((e) => (
        <button
          key={e}
          onClick={async () => {
            setLast(e);
            await roomAction(room.code, { type: "react", emoji: e });
            setTimeout(() => setLast(null), 400);
          }}
          className={`size-11 rounded-full bg-ink/5 text-2xl transition-[transform,background-color,border-color,color,opacity] active:scale-90 ${last === e ? "scale-110 bg-hit/20" : "hover:bg-ink/10"}`}
          aria-label={`React ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

/** TV overlay: recent reactions drift up from the bottom with the sender's face. */
export function FloatingReactions({ room }: { room: RoomView }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[70vh] overflow-hidden" aria-hidden>
      {room.reactions.map((r) => {
        const p = room.players.find((x) => x.id === r.playerId);
        // deterministic horizontal position per reaction
        const left = 8 + ((r.id * 37) % 84);
        return (
          <div key={r.id} className="float-up absolute bottom-0 flex flex-col items-center" style={{ left: `${left}%` }}>
            <span className="text-7xl drop-shadow-lg">{r.emoji}</span>
            {p && <Avatar player={p} size={32} ring="ring-paper" />}
          </div>
        );
      })}
    </div>
  );
}
