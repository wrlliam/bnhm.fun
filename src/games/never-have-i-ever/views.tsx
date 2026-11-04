"use client";

import { WaitingForDrinks } from "@/components/room/drink-alert";
import { Avatar } from "@/components/room/avatar";
import { GameLobby } from "@/components/room/game-bits";
import { act, BigButton, RoomShell } from "@/components/room/room-shell";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import type { NhieGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };
const nhie = (room: RoomView) => room.game as NhieGameView;

export function NhiePlayer({ room, token, hostToken, status }: Props) {
  const g = nhie(room);
  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken}>
      {g.status === "lobby" && (
        <GameLobby
          room={room}
          token={token}
          hostToken={hostToken}
          howItWorks="each card says “Never have I ever…”. Tap whether you have or haven't. Answers stay hidden until everyone's in, then anyone who has gets a drink alert."
        />
      )}
      {(g.status === "answering" || g.status === "reveal") && (
        <div key={g.number} className="pop space-y-5">
          <p className="text-sm text-faint">
            Card {g.number} of {g.total}
          </p>
          <h2 className="font-hand text-5xl font-bold leading-tight">
            <span className="text-faint">Never have I ever</span> {g.prompt}
          </h2>
          {g.status === "answering" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    [true, "I have"],
                    [false, "Never"],
                  ] as const
                ).map(([have, label]) => (
                  <button
                    key={label}
                    onClick={() => act(room, token, null, { type: "answer", have })}
                    className={`rounded-2xl border-2 py-6 text-xl font-bold transition ${
                      g.myAnswer === have ? (have ? "border-miss bg-miss text-paper" : "border-hit bg-hit text-paper") : "border-ink/30 hover:border-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-faint">
                {g.answered.length} of {room.players.filter((p) => p.online).length} answered · you can change your mind until everyone has
              </p>
              {room.isHost && (
                <button onClick={() => act(room, token, hostToken, { type: "reveal" })} className="text-sm underline underline-offset-4">
                  Reveal now
                </button>
              )}
            </>
          ) : (
            <>
              <Guilty room={room} />
              <WaitingForDrinks room={room} hostToken={hostToken} />
              <BigButton disabled={room.waitingOn.length > 0} onClick={() => act(room, token, hostToken, { type: "next" })}>
                Next card
              </BigButton>
            </>
          )}
        </div>
      )}
      {g.status === "finished" && <h2 className="font-hand text-5xl font-bold">That&rsquo;s every card</h2>}
    </RoomShell>
  );
}

function Guilty({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = nhie(room);
  const guilty = room.players.filter((p) => g.guilty.includes(p.id));
  if (!guilty.length) return <p className={big ? "text-4xl" : "text-xl"}>Nobody has. A table of saints</p>;
  return (
    <div>
      <p className={`text-faint ${big ? "text-2xl" : ""}`}>Guilty — drink up:</p>
      <div className="mt-2 flex flex-wrap gap-4">
        {guilty.map((p) => (
          <span key={p.id} className="pop flex flex-col items-center gap-1">
            <Avatar player={p} size={big ? 96 : 56} ring="ring-miss" />
            <span className={`font-hand font-bold ${big ? "text-4xl" : "text-2xl"}`}>{p.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function NhieTv({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = nhie(room);
  const answered = new Set(g.answered);
  if (g.status === "lobby")
    return (
      <div>
        <h2 className="font-hand text-8xl font-bold">Never Have I Ever</h2>
        <p className="mt-4 max-w-2xl text-2xl">Join on your phone. Answer in secret; the guilty are revealed together.</p>
      </div>
    );
  if (g.status === "finished") return <h2 className="font-hand text-8xl font-bold">That&rsquo;s every card</h2>;
  return (
    <div key={g.number} className="pop space-y-10">
      <h2 className="font-hand text-8xl font-bold leading-tight">
        <span className="text-faint">Never have I ever</span> {g.prompt}
      </h2>
      {g.status === "answering" ? (
        <div className="flex flex-wrap gap-6">
          {room.players.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2">
              <Avatar player={p} size={80} dim={!answered.has(p.id)} ring={answered.has(p.id) ? "ring-hit" : undefined} />
              <span className="font-hand text-2xl">{p.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <Guilty room={room} big />
          <WaitingForDrinks room={room} hostToken={hostToken} big />
        </>
      )}
    </div>
  );
}
