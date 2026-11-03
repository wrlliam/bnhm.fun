"use client";

import { Avatar } from "@/components/room/avatar";
import { WaitingForDrinks } from "@/components/room/drink-alert";
import { act, BigButton } from "@/components/room/room-shell";
import type { RoomView } from "@/lib/rooms/client";
import { mlt, Results } from "./player";

export function MltTv({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = mlt(room);
  const voted = new Set(g.voted);
  const admin = room.isHost;

  return (
    <div className="flex-1">
      {g.status === "lobby" && (
        <div>
          <h2 className="font-hand text-8xl font-bold">Most Likely To</h2>
          <p className="mt-4 max-w-2xl text-2xl">
            Join on your phone. Each round, vote in secret for who fits the card best. You drink one sip for every vote
            you get.
          </p>
          {admin && (
            <BigButton
              className="mt-8 px-10 py-4 text-xl"
              disabled={room.players.length < 2}
              onClick={() => act(room, null, hostToken, { type: "start" })}
            >
              Start game ({room.players.length} players)
            </BigButton>
          )}
        </div>
      )}

      {(g.status === "voting" || g.status === "reveal") && (
        <div key={g.number} className="pop">
          <p className="text-xl text-faint">
            Card {g.number} of {g.total}
          </p>
          <h2 className="font-hand text-8xl font-bold leading-tight">
            <span className="text-faint">Who&rsquo;s most likely to</span> {g.prompt}
          </h2>

          {g.status === "voting" ? (
            <>
              <p className="mt-6 text-2xl">Vote on your phone.</p>
              <div className="mt-6 flex flex-wrap gap-6">
                {room.players.map((p) => (
                  <div key={p.id} className="flex flex-col items-center gap-2">
                    <Avatar player={p} size={80} dim={!voted.has(p.id)} ring={voted.has(p.id) ? "ring-hit" : undefined} />
                    <span className="font-hand text-2xl">{p.name}</span>
                    <span className={`text-sm ${voted.has(p.id) ? "text-hit" : "text-faint"}`}>
                      {voted.has(p.id) ? "voted" : "thinking…"}
                    </span>
                  </div>
                ))}
              </div>
              {admin && (
                <BigButton className="mt-8" onClick={() => act(room, null, hostToken, { type: "reveal" })}>
                  Reveal now
                </BigButton>
              )}
            </>
          ) : (
            <div className="mt-8 max-w-3xl">
              <Results room={room} big />
              <div className="mt-8">
                <WaitingForDrinks room={room} hostToken={hostToken} big />
              </div>
              {admin && (
                <BigButton
                  className="mt-6 px-10 py-4 text-xl"
                  disabled={room.waitingOn.length > 0}
                  onClick={() => act(room, null, hostToken, { type: "next" })}
                >
                  Next card
                </BigButton>
              )}
            </div>
          )}
        </div>
      )}

      {g.status === "finished" && <h2 className="font-hand text-8xl font-bold">That&rsquo;s every card!</h2>}
    </div>
  );
}
