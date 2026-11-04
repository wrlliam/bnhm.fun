"use client";

import { useState } from "react";
import { Avatar } from "@/components/room/avatar";
import { Countdown, GameLobby } from "@/components/room/game-bits";
import { CountUp, Podium } from "@/components/room/reveal";
import { act, BigButton, RoomShell } from "@/components/room/room-shell";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import type { PunchGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };
const pl = (room: RoomView) => room.game as PunchGameView;
const who = (room: RoomView, id: string | null) => room.players.find((p) => p.id === id);

function WriteCard({ room, token, prompt }: { room: RoomView; token: string; prompt: { id: number; text: string } }) {
  const [text, setText] = useState("");
  return (
    <form
      className="pop rounded-2xl border border-ink/15 bg-surface p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await act(room, token, null, { type: "answer", promptId: prompt.id, text })) setText("");
      }}
    >
      <p className="font-hand text-3xl font-bold leading-tight">{prompt.text}</p>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={80}
          placeholder="Your funniest answer"
          className="w-0 flex-1 rounded-xl border-2 border-ink/20 bg-paper px-3 py-2 outline-none focus:border-ink"
        />
        <button disabled={!text.trim()} className="rounded-xl bg-ink px-4 font-medium text-paper disabled:opacity-40">
          Send
        </button>
      </div>
    </form>
  );
}

/** The face-off: two answers side by side. Tap to vote; at the reveal, bars and authors. */
function FaceOff({ room, token, big = false }: { room: RoomView; token: string | null; big?: boolean }) {
  const g = pl(room);
  const f = g.face!;
  const revealed = g.status === "reveal";
  const total = f.answers.reduce((n, a) => n + a.votes.length, 0);
  const canVote = !big && g.status === "voting" && !f.isMine && !!room.me;
  return (
    <div className={`grid gap-3 ${big ? "grid-cols-2 gap-8" : "grid-cols-1 sm:grid-cols-2"}`}>
      {f.answers.map((a, i) => {
        const pct = total ? Math.round((a.votes.length / total) * 100) : 0;
        const won = revealed && a.votes.length > 0 && a.votes.length === Math.max(...f.answers.map((x) => x.votes.length));
        const sweep = revealed && total > 0 && a.votes.length === total;
        const author = who(room, a.author);
        const mine = g.myVote === a.id;
        return (
          <button
            key={a.id}
            disabled={!canVote}
            onClick={() => act(room, token, null, { type: "vote", author: a.id })}
            className={`pop relative flex flex-col justify-between gap-4 overflow-hidden rounded-3xl border-2 p-5 text-left transition-[transform,border-color] ${
              canVote ? "active:scale-[0.98] hover:border-ink" : ""
            } ${won ? "border-hit" : mine ? "border-hit" : "border-ink/15"} bg-surface ${big ? "min-h-64 p-8" : "min-h-36"}`}
            style={{ animationDelay: `${i * 160}ms` }}
          >
            {revealed && (
              <span className="bar-grow absolute inset-y-0 left-0 bg-hit/12" style={{ width: `${pct}%`, animationDelay: "200ms" }} aria-hidden />
            )}
            <span className={`relative font-hand font-bold leading-tight ${big ? "text-6xl" : "text-3xl"}`}>{a.text}</span>
            {revealed ? (
              <span className="relative flex items-center gap-3">
                {author && <Avatar player={author} size={big ? 48 : 30} />}
                <span className={big ? "text-2xl" : ""}>{author?.name}</span>
                <span className={`ml-auto font-mono font-bold ${big ? "text-4xl" : "text-xl"}`}>
                  <CountUp to={pct} suffix="%" />
                </span>
                {a.points > 0 && <span className="cheer font-mono text-hit">+{a.points}</span>}
              </span>
            ) : (
              mine && <span className="relative text-sm text-hit">Your vote</span>
            )}
            {sweep && <span className="cheer relative font-hand text-3xl font-bold text-hit">Clean sweep</span>}
          </button>
        );
      })}
    </div>
  );
}

export function PunchPlayer({ room, token, hostToken, status }: Props) {
  const g = pl(room);
  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken}>
      {g.status === "lobby" && (
        <GameLobby
          room={room}
          token={token}
          hostToken={hostToken}
          minPlayers={3}
          howItWorks="you get two prompts to answer on your phone. Then answers face off in pairs, with no names, and everyone else votes for the funniest. Two rounds, and round two scores double."
        />
      )}

      {g.status === "writing" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-faint">
              Round {g.round} of {g.rounds} · write your answers
            </p>
            <Countdown deadline={g.deadline} />
          </div>
          {g.myPrompts.map((p) => (
            <WriteCard key={p.id} room={room} token={token} prompt={p} />
          ))}
          {g.myDone && <p className="pop rounded-2xl bg-ink/5 p-4 text-center">Done. Waiting for everyone else to finish writing</p>}
        </div>
      )}

      {(g.status === "voting" || g.status === "reveal") && g.face && (
        <div key={`${g.round}-${g.face.number}`} className="space-y-5">
          <div className="flex items-center justify-between text-sm text-faint">
            <span>
              Face-off {g.face.number} of {g.face.of}
            </span>
            {g.status === "voting" && <Countdown deadline={g.deadline} />}
          </div>
          <h2 className="pop font-hand text-5xl font-bold leading-tight">{g.face.text}</h2>
          {g.status === "voting" && g.face.isMine && <p className="text-faint">One of these is yours. Sit back while everyone votes</p>}
          <FaceOff room={room} token={token} />
          {g.status === "reveal" && (
            <BigButton onClick={() => act(room, token, hostToken, { type: "next" })}>
              {g.face.number >= g.face.of ? "See the scores" : "Next face-off"}
            </BigButton>
          )}
        </div>
      )}

      {(g.status === "scores" || g.status === "finished") && (
        <div className="pop space-y-5">
          <h2 className="font-hand text-5xl font-bold">{g.status === "finished" ? "Final scores" : `After round ${g.round}`}</h2>
          <Podium room={room} scores={g.scores} />
          {g.status === "scores" && (
            <BigButton onClick={() => act(room, token, hostToken, { type: "next" })}>Round {g.round + 1}: double points</BigButton>
          )}
        </div>
      )}

      {room.isHost && (g.status === "writing" || g.status === "voting") && (
        <button onClick={() => act(room, token, hostToken, { type: "skip" })} className="mt-4 text-sm underline underline-offset-4">
          {g.status === "writing" ? "Stop writing and start the votes" : "Close this vote"}
        </button>
      )}
    </RoomShell>
  );
}

export function PunchTv({ room }: { room: RoomView }) {
  const g = pl(room);
  const written = new Set(g.written);
  if (g.status === "lobby")
    return (
      <div>
        <h2 className="font-hand text-8xl font-bold">Punchline</h2>
        <p className="mt-4 max-w-2xl text-2xl">Write the funniest answers on your phone, then vote head to head.</p>
      </div>
    );
  if (g.status === "writing")
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-6">
          <h2 className="font-hand text-8xl font-bold">Writing time</h2>
          <Countdown deadline={g.deadline} big />
        </div>
        <p className="text-3xl">Answer your two prompts on your phone</p>
        <div className="flex flex-wrap gap-5">
          {room.players.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2">
              <Avatar player={p} size={88} dim={!written.has(p.id)} ring={written.has(p.id) ? "ring-hit" : undefined} />
              <span className="text-xl">{written.has(p.id) ? "done" : "writing…"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  if ((g.status === "voting" || g.status === "reveal") && g.face)
    return (
      <div key={`${g.round}-${g.face.number}`} className="space-y-10">
        <div className="flex items-center gap-6">
          <h2 className="pop font-hand text-8xl font-bold leading-tight">{g.face.text}</h2>
          {g.status === "voting" && <Countdown deadline={g.deadline} big />}
        </div>
        <FaceOff room={room} token={null} big />
      </div>
    );
  return (
    <div className="max-w-4xl">
      <h2 className="font-hand text-8xl font-bold">{g.status === "finished" ? "Final scores" : `After round ${g.round}`}</h2>
      <div className="mt-8">
        <Podium room={room} scores={g.scores} big />
      </div>
    </div>
  );
}
