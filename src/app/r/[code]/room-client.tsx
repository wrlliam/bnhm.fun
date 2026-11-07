"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/room/avatar";
import { DrinkAlert } from "@/components/room/drink-alert";
import { JoinForm } from "@/components/room/join-form";
import { RejoinForm } from "@/components/room/rejoin";
import { RoomNav } from "@/components/room/room-nav";
import { Centered, RoomShell } from "@/components/room/room-shell";
import { BluffPlayer } from "@/games/bluff/views";
import { HangmanPlayer } from "@/games/hangman/player";
import { OddPlayer } from "@/games/odd-one-out/views";
import { PunchPlayer } from "@/games/punchline/views";
import { SpotPlayer } from "@/games/spotlight/views";
import { HlPlayer } from "@/games/higher-lower/views";
import { NhiePlayer } from "@/games/never-have-i-ever/views";
import { TriviaPlayer } from "@/games/trivia/views";
import { TodPlayer } from "@/games/truth-or-drink/views";
import { MltPlayer } from "@/games/most-likely-to/player";
import { RofPlayer } from "@/games/ring-of-fire/player";
import { PubPlayer } from "@/games/pub-crawl/views";
import { useRoomStream, useRoomTokens } from "@/lib/rooms/client";

export function RoomClient() {
  const code = useParams<{ code: string }>().code.toUpperCase();
  const { token, host, ready } = useRoomTokens(code);
  const { room, status } = useRoomStream(code, { token, host, enabled: ready });

  if (status === "notfound") {
    return (
      <Centered>
        <h1 className="font-hand text-5xl font-bold">No room “{code}”</h1>
        <p className="mt-2 text-faint">It may have ended, or the code is wrong.</p>
        <Link href="/" className="mt-6 underline underline-offset-4">
          Back home
        </Link>
      </Centered>
    );
  }

  if (!room) {
    return (
      <Centered>
        <p className="font-hand text-3xl text-faint">Connecting…</p>
      </Centered>
    );
  }

  // not in the room yet (or removed by the host): show the join form
  if (!token || !room.me || status === "gone") {
    return (
      <>
        <div className="mx-auto w-full max-w-xl px-5 pt-5 sm:pl-20">
          <RoomNav code={code} kind={room.kind} />
        </div>
        <Centered>
          {status === "gone" && <p className="mb-6 text-sm text-miss">You were removed from the room. You can join again.</p>}
          <JoinForm
            code={code}
            hostToken={host}
            title={
              <>
                Join {room.title}
                <span className="ml-3 font-mono text-3xl tracking-widest">{code}</span>
            </>
          }
        />
        <RejoinForm room={room} />
        {room.players.length > 0 && (
          <div className="mt-10 w-full max-w-sm text-left">
            <p className="text-sm text-faint">Already here</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {room.players.map((p) => (
                <span key={p.id} className="flex items-center gap-2 rounded-full bg-ink/5 py-1 pl-1 pr-3">
                  <Avatar player={p} size={28} />
                  <span className="font-hand text-xl">{p.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Centered>
      </>
    );
  }

  const props = { room, token, hostToken: host ?? null };
  return (
    <>
      {room.kind === "ring-of-fire" && <RofPlayer {...props} status={status} />}
      {room.kind === "most-likely-to" && <MltPlayer {...props} status={status} />}
      {room.kind === "never-have-i-ever" && <NhiePlayer {...props} status={status} />}
      {room.kind === "higher-lower" && <HlPlayer {...props} status={status} />}
      {room.kind === "truth-or-drink" && <TodPlayer {...props} status={status} />}
      {room.kind === "trivia" && <TriviaPlayer {...props} status={status} />}
      {room.kind === "spotlight" && <SpotPlayer {...props} status={status} />}
      {room.kind === "punchline" && <PunchPlayer {...props} status={status} />}
      {room.kind === "bluff" && <BluffPlayer {...props} status={status} />}
      {room.kind === "odd-one-out" && <OddPlayer {...props} status={status} />}
      {room.kind === "pub-crawl" && <PubPlayer {...props} status={status} />}
      {room.kind === "hangman" && (
        <RoomShell room={room} status={status} token={token} hostToken={host}>
          <HangmanPlayer {...props} />
        </RoomShell>
      )}
      <DrinkAlert room={room} token={token} />
    </>
  );
}
