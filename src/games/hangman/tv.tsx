"use client";

import { Avatar } from "@/components/room/avatar";
import { act, BigButton } from "@/components/room/room-shell";
import { Stickman } from "@/components/stickman";
import type { RoomView } from "@/lib/rooms/client";
import { GuessToast, hm, Word } from "./player";

export function HangmanTv({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = hm(room);
  const finished = g.status === "won" || g.status === "lost";
  return (
    <div className="grid flex-1 gap-10 lg:grid-cols-[1fr_300px]">
      <GuessToast room={room} />
      <section>
        {g.status === "lobby" && (
          <>
            <h2 className="font-hand text-8xl font-bold">Hangman</h2>
            <p className="mt-4 text-2xl">Join on your phone. Each round someone picks a word; everyone else guesses.</p>
          </>
        )}
        {g.status === "choosing" && <h2 className="font-hand text-7xl font-bold">{g.setterName} is picking a word…</h2>}
        {(g.status === "playing" || finished) && (
          <div className="grid items-center gap-10 xl:grid-cols-[360px_1fr]">
            <div key={g.wrong.length} className={g.wrong.length ? "shake" : ""}>
              <Stickman wrong={g.wrong.length} lost={g.status === "lost"} />
            </div>
            <div>
              <p className="text-2xl text-faint">{g.setterName}&rsquo;s word</p>
              <Word room={room} big />
              {g.wrong.length > 0 && (
                <p className="mt-8 font-mono text-4xl tracking-widest text-miss line-through">{g.wrong.join(" ")}</p>
              )}
              {finished && (
                <h2 className={`pop mt-8 font-hand text-8xl font-bold ${g.status === "won" ? "text-hit" : "text-miss"}`}>
                  {g.status === "won" ? "Solved!" : `Hanged — ${g.word}`}
                </h2>
              )}
            </div>
          </div>
        )}
        {room.isHost && (g.status === "lobby" || finished) && (
          <BigButton className="mt-10 px-10 py-4 text-xl" onClick={() => act(room, null, hostToken, { type: "start" })}>
            {g.status === "lobby" ? "Start first round" : "Next round"}
          </BigButton>
        )}
      </section>
      <aside>
        <h3 className="text-lg text-faint">Scores</h3>
        <ul className="mt-2 space-y-2">
          {[...room.players]
            .sort((a, b) => (g.scores[b.id] ?? 0) - (g.scores[a.id] ?? 0))
            .map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar player={p} size={44} dim={!p.online} ring={p.id === g.setterId ? "ring-ink" : undefined} />
                <span className="font-hand text-3xl font-bold">{p.name}</span>
                <span className="ml-auto font-mono text-xl">{g.scores[p.id] ?? 0}</span>
              </li>
            ))}
        </ul>
      </aside>
    </div>
  );
}
