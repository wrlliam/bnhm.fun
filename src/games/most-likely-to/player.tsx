"use client";

import { AdminAccess } from "@/components/room/admin-access";
import { Avatar } from "@/components/room/avatar";
import { WhoIsHere } from "@/games/ring-of-fire/player";
import { WaitingForDrinks } from "@/components/room/drink-alert";
import { act, BigButton, openTv, RoomShell } from "@/components/room/room-shell";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import type { MltGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };

export const mlt = (room: RoomView) => room.game as MltGameView;

export function Results({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = mlt(room);
  const max = Math.max(1, ...g.results.map((r) => r.votes));
  if (!g.results.length) return <p className="text-faint">Nobody voted.</p>;
  return (
    <ul className={`space-y-3 ${big ? "text-2xl" : ""}`}>
      {g.results.map((r, i) => {
        const p = room.players.find((x) => x.id === r.playerId);
        if (!p) return null;
        return (
          <li key={r.playerId} className="pop flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
            <Avatar player={p} size={big ? 56 : 36} />
            <div className="flex-1">
              <p className="font-hand text-3xl font-bold leading-none">
                {p.name}
                {p.id === room.me && " (you)"}
              </p>
              <div className="mt-1 h-3 rounded-full bg-ink/10">
                <div className="h-3 rounded-full bg-miss" style={{ width: `${(r.votes / max) * 100}%` }} />
              </div>
            </div>
            <span className="font-mono">
              {r.votes} {r.votes === 1 ? "sip" : "sips"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function MltPlayer({ room, token, hostToken, status }: Props) {
  const g = mlt(room);
  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken}>
      {g.status === "lobby" && (
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
              <BigButton
                className="w-full py-4 text-lg"
                disabled={room.players.length < 2}
                onClick={() => act(room, token, hostToken, { type: "start" })}
              >
                {room.players.length < 2 ? "Waiting for at least 2 players" : `Start with ${room.players.length} players`}
              </BigButton>
              <button
                onClick={() => openTv(room.code)}
                className="w-full rounded-md border-2 border-ink py-3 font-medium transition hover:bg-ink hover:text-paper"
              >
                Open the TV screen
              </button>
              <AdminAccess room={room} hostToken={hostToken} />
            </div>
          )}
          <p className="text-sm text-faint">
            How it works: a card appears, you secretly tap who it fits best, and when everyone has voted your phone
            tells you how many sips you owe — one per vote.
          </p>
        </div>
      )}

      {(g.status === "voting" || g.status === "reveal") && (
        <div key={g.number} className="pop">
          <p className="text-sm text-faint">
            Card {g.number} of {g.total}
          </p>
          <h2 className="font-hand text-5xl font-bold leading-tight">
            <span className="text-faint">Who&rsquo;s most likely to</span> {g.prompt}
          </h2>

          {g.status === "voting" && (
            <>
              <p className="mt-4 text-sm">
                {g.myVote
                  ? "Vote locked in — you can change it until everyone's voted."
                  : "Tap who fits best. Votes are secret until the reveal. You can vote for yourself."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {room.players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => act(room, token, null, { type: "vote", playerId: p.id })}
                    className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left transition ${
                      g.myVote === p.id ? "border-hit bg-hit/10" : "border-ink/20 hover:border-ink"
                    }`}
                  >
                    <Avatar player={p} size={40} />
                    <span className="font-hand text-2xl font-bold">{p.id === room.me ? "Me" : p.name}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm text-faint">
                {g.voted.length} of {room.players.filter((p) => p.online).length} voted
              </p>
              {room.isHost && (
                <button
                  onClick={() => act(room, token, hostToken, { type: "reveal" })}
                  className="mt-2 text-sm underline underline-offset-4"
                >
                  Reveal now (don&rsquo;t wait for everyone)
                </button>
              )}
            </>
          )}

          {g.status === "reveal" && (
            <div className="mt-6">
              <Results room={room} />
              <p className="mt-4 text-sm text-faint">Everyone drinks one sip per vote they got.</p>
              <div className="mt-6">
                <WaitingForDrinks room={room} hostToken={hostToken} />
              </div>
              <BigButton
                className="mt-4"
                disabled={room.waitingOn.length > 0}
                onClick={() => act(room, token, hostToken, { type: "next" })}
              >
                Next card
              </BigButton>
            </div>
          )}
        </div>
      )}

      {g.status === "finished" && <h2 className="font-hand text-5xl font-bold">That&rsquo;s every card!</h2>}
    </RoomShell>
  );
}
