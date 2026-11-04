"use client";

import { Avatar } from "@/components/room/avatar";
import { WaitingForDrinks } from "@/components/room/drink-alert";
import { GameLobby } from "@/components/room/game-bits";
import { act, BigButton, RoomShell } from "@/components/room/room-shell";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import type { TodGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };
const tod = (room: RoomView) => room.game as TodGameView;
const who = (room: RoomView, id: string | null) => room.players.find((p) => p.id === id);

export function TodPlayer({ room, token, hostToken, status }: Props) {
  const g = tod(room);
  const asked = who(room, g.turnPlayerId);
  const mine = g.turnPlayerId === room.me;
  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken}>
      {g.status === "lobby" && (
        <GameLobby
          room={room}
          token={token}
          hostToken={hostToken}
          howItWorks={`take turns. You get a question on your phone and it shows on the TV. Answer it honestly, or tap Drink to dodge it (${g.skipSips} sips).`}
        />
      )}
      {(g.status === "asking" || g.status === "answered") && (
        <div key={g.number} className="pop space-y-5">
          <p className="flex items-center gap-2 text-faint">
            {asked && <Avatar player={asked} size={28} />}
            {mine ? "Your question" : `${asked?.name ?? "Someone"}'s question`}
          </p>
          <h2 className="font-hand text-5xl font-bold leading-tight">{g.question}</h2>
          {g.status === "asking" && mine && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => act(room, token, null, { type: "respond", choice: "answer" })}
                className="rounded-2xl border-2 border-hit bg-hit py-6 text-xl font-bold text-paper"
              >
                I&rsquo;ll answer
              </button>
              <button
                onClick={() => act(room, token, null, { type: "respond", choice: "drink" })}
                className="rounded-2xl border-2 border-miss bg-miss py-6 text-xl font-bold text-paper"
              >
                Drink ({g.skipSips})
              </button>
            </div>
          )}
          {g.status === "asking" && !mine && <p className="text-lg">Waiting for {asked?.name} to answer or drink…</p>}
          {g.status === "answered" && (
            <>
              <p className="text-xl font-medium">
                {g.outcome === "answer" ? `${asked?.name} is answering — listen up!` : `${asked?.name} dodged it and drinks ${g.skipSips}.`}
              </p>
              <WaitingForDrinks room={room} hostToken={hostToken} />
              <BigButton disabled={room.waitingOn.length > 0} onClick={() => act(room, token, hostToken, { type: "next" })}>
                Next question
              </BigButton>
            </>
          )}
          {room.isHost && g.status === "asking" && (
            <button onClick={() => act(room, token, hostToken, { type: "next" })} className="text-sm underline underline-offset-4">
              Skip this question (host)
            </button>
          )}
        </div>
      )}
      {g.status === "finished" && <h2 className="font-hand text-5xl font-bold">That&rsquo;s every question</h2>}
    </RoomShell>
  );
}

export function TodTv({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = tod(room);
  const asked = who(room, g.turnPlayerId);
  if (g.status === "lobby")
    return (
      <div>
        <h2 className="font-hand text-8xl font-bold">Truth or Drink</h2>
        <p className="mt-4 max-w-2xl text-2xl">Join on your phone. On your turn: answer honestly, or drink to dodge.</p>
      </div>
    );
  if (g.status === "finished") return <h2 className="font-hand text-8xl font-bold">That&rsquo;s every question</h2>;
  return (
    <div key={g.number} className="pop space-y-8">
      <div className="flex items-center gap-5">
        {asked && <Avatar player={asked} size={96} ring="ring-hit" />}
        <p className="font-hand text-6xl font-bold">{asked?.name}</p>
      </div>
      <h2 className="font-hand text-8xl font-bold leading-tight">{g.question}</h2>
      {g.status === "answered" && (
        <p className={`text-4xl font-bold ${g.outcome === "drink" ? "text-miss" : "text-hit"}`}>
          {g.outcome === "answer" ? "Answering…" : `Dodged! Drink ${g.skipSips}.`}
        </p>
      )}
      <WaitingForDrinks room={room} hostToken={hostToken} big />
    </div>
  );
}
