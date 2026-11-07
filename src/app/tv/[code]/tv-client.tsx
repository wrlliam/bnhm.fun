"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BackIcon } from "@/components/icons";
import { useState } from "react";
import { AdminLogin } from "@/components/room/admin-access";
import { JoinQr } from "@/components/room/join-qr";
import { FloatingReactions } from "@/components/room/reactions";
import { Recap } from "@/components/room/recap";
import { Avatar } from "@/components/room/avatar";
import { BluffTv } from "@/games/bluff/views";
import { HangmanTv } from "@/games/hangman/tv";
import { OddTv } from "@/games/odd-one-out/views";
import { PunchTv } from "@/games/punchline/views";
import { SpotTv } from "@/games/spotlight/views";
import { HlTv } from "@/games/higher-lower/views";
import { NhieTv } from "@/games/never-have-i-ever/views";
import { TriviaTv } from "@/games/trivia/views";
import { TodTv } from "@/games/truth-or-drink/views";
import { TvStartBar } from "./tv-start-bar";
import { MltTv } from "@/games/most-likely-to/tv";
import { RofTv } from "@/games/ring-of-fire/tv";
import { PubTv } from "@/games/pub-crawl/views";
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
        <div>
          <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-faint transition-colors hover:text-ink">
            <BackIcon />
            All games
          </Link>
          <div className="flex -space-x-3">
            {room.players.map((p) => (
              <Avatar key={p.id} player={p} size={48} dim={!p.online} ring="ring-paper" />
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg text-faint">
            Join at <span className="font-medium text-ink">{origin}</span> with code
          </p>
          <div className="flex items-center justify-end gap-5">
            <p className="font-mono text-6xl font-bold tracking-[0.3em]">{room.code}</p>
            <JoinQr code={room.code} size={112} />
          </div>
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
      <FloatingReactions room={room} />
      {room.showRecap && (
        <div className="pop fixed inset-0 z-30 overflow-y-auto bg-paper/95 px-16 py-12 backdrop-blur">
          <h2 className="font-hand text-8xl font-bold">Game recap</h2>
          <div className="mt-8 max-w-5xl">
            <Recap room={room} big />
          </div>
        </div>
      )}
      {room.kind === "ring-of-fire" && <RofTv {...props} />}
      {room.kind === "most-likely-to" && <MltTv {...props} />}
      {room.kind === "never-have-i-ever" && <NhieTv {...props} />}
      {room.kind === "higher-lower" && <HlTv {...props} />}
      {room.kind === "truth-or-drink" && <TodTv {...props} />}
      {room.kind === "trivia" && <TriviaTv {...props} />}
      {room.kind === "spotlight" && <SpotTv room={room} />}
      {room.kind === "punchline" && <PunchTv room={room} />}
      {room.kind === "bluff" && <BluffTv room={room} />}
      {room.kind === "odd-one-out" && <OddTv room={room} />}
      {room.kind === "pub-crawl" && <PubTv {...props} />}
      {room.isHost && <TvStartBar room={room} />}
      {room.kind === "hangman" && <HangmanTv {...props} />}
    </main>
  );
}
