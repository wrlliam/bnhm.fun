"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminLogin } from "@/components/room/admin-access";
import { Avatar } from "@/components/room/avatar";
import { HangmanTv } from "@/games/hangman/tv";
import { MltTv } from "@/games/most-likely-to/tv";
import { RofTv } from "@/games/ring-of-fire/tv";
import { useRoomStream, useRoomTokens } from "@/lib/rooms/client";

/**
 * Big-screen display for a room. Anyone can open it (e.g. on a smart TV browser);
 * in the host's own browser it also shows admin controls.
 */
export function TvClient() {
  const code = useParams<{ code: string }>().code.toUpperCase();
  const { host, ready } = useRoomTokens(code);
  // the TV is a display, not a player: never send a player token
  const { room, status } = useRoomStream(code, { host, enabled: ready });
  const [login, setLogin] = useState(false);
  // only rendered after the stream connects (client-side), so `location` is safe here
  const origin = typeof window === "undefined" ? "" : location.host;

  if (status === "notfound") {
    return <main className="flex flex-1 items-center justify-center font-hand text-6xl">Room {code} not found</main>;
  }
  if (!room) return <main className="flex flex-1 items-center justify-center font-hand text-5xl text-faint">Connecting…</main>;

  const props = { room, token: null, hostToken: host ?? null };
  return (
    <main className="flex min-h-screen flex-col px-10 py-8 pl-24">
      <header className="mb-8 flex items-start justify-between gap-6">
        <div className="flex -space-x-3">
          {room.players.map((p) => (
            <Avatar key={p.id} player={p} size={48} dim={!p.online} ring="ring-paper" />
          ))}
        </div>
        <div className="text-right">
          <p className="text-lg text-faint">
            Join at <span className="font-medium text-ink">{origin}</span> with code
          </p>
          <p className="font-mono text-6xl font-bold tracking-[0.3em]">{room.code}</p>
          {status !== "live" && <p className="text-sm text-miss">Reconnecting…</p>}
          {room.isHost ? (
            <p className="text-xs text-faint">Admin controls on</p>
          ) : login ? (
            <div className="mt-2 flex justify-end">
              <AdminLogin code={room.code} onDone={() => setLogin(false)} />
            </div>
          ) : (
            <button onClick={() => setLogin(true)} className="text-xs text-faint underline underline-offset-4 hover:text-ink">
              Admin login
            </button>
          )}
        </div>
      </header>
      {room.kind === "ring-of-fire" && <RofTv {...props} />}
      {room.kind === "most-likely-to" && <MltTv {...props} />}
      {room.kind === "hangman" && <HangmanTv {...props} />}
    </main>
  );
}
