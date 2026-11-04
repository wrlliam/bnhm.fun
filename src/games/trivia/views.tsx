"use client";

import { Avatar } from "@/components/room/avatar";
import { WaitingForDrinks } from "@/components/room/drink-alert";
import { Countdown, GameLobby } from "@/components/room/game-bits";
import { act, BigButton, RoomShell } from "@/components/room/room-shell";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import type { TriviaGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };
const tv = (room: RoomView) => room.game as TriviaGameView;
const LETTERS = ["A", "B", "C", "D"];
const COLORS = ["bg-[#e8475f]", "bg-[#2f6fdf]", "bg-[#e0a800]", "bg-[#2f9d5f]"];

function DrinkToggle({ room }: { room: RoomView }) {
  const g = tv(room);
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={g.drinkOnWrong} onChange={(e) => act(room, null, null, { type: "settings", drinkOnWrong: e.target.checked })} />
      Drinking mode: a wrong or missing answer = 1 sip
    </label>
  );
}

export function Leaderboard({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = tv(room);
  const rows = room.players.map((p) => ({ p, score: g.scores[p.id] ?? 0, gained: g.lastPoints[p.id] ?? 0 })).sort((a, b) => b.score - a.score);
  return (
    <ol className={`space-y-2 ${big ? "text-2xl" : ""}`}>
      {rows.map(({ p, score, gained }, i) => (
        <li key={p.id} className="flex items-center gap-3">
          <span className="w-6 font-mono text-faint">{i + 1}</span>
          <Avatar player={p} size={big ? 48 : 32} />
          <span className="flex-1 font-medium">{p.id === room.me ? `${p.name} (you)` : p.name}</span>
          {gained > 0 && <span className="pop text-hit">+{gained}</span>}
          <span className="w-20 text-right font-mono font-bold">{score}</span>
        </li>
      ))}
    </ol>
  );
}

export function TriviaPlayer({ room, token, hostToken, status }: Props) {
  const g = tv(room);
  const menu = room.isHost ? <DrinkToggle room={room} /> : null;
  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken} menu={menu}>
      {g.status === "lobby" && (
        <GameLobby
          room={room}
          token={token}
          hostToken={hostToken}
          minPlayers={1}
          howItWorks={`${g.total} multiple-choice questions on the TV. Answer on your phone within 20 seconds: right answers score 500 points plus up to 500 for speed.`}
        >
          <DrinkToggle room={room} />
        </GameLobby>
      )}
      {(g.status === "question" || g.status === "reveal") && g.options && (
        <div key={g.number} className="pop space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-faint">
              Question {g.number} of {g.total}
            </p>
            {g.status === "question" && <Countdown deadline={g.deadline} />}
          </div>
          <h2 className="text-2xl font-bold leading-snug">{g.question}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {g.options.map((opt, i) => {
              const picked = g.myAnswer === i;
              const revealed = g.status === "reveal";
              const right = revealed && g.correct === i;
              return (
                <button
                  key={i}
                  disabled={g.myAnswer !== null || revealed}
                  onClick={() => act(room, token, null, { type: "answer", choice: i })}
                  className={`flex items-center gap-3 rounded-2xl p-4 text-left text-lg font-bold text-white transition active:scale-[0.98] ${COLORS[i]} ${
                    revealed ? (right ? "ring-4 ring-hit ring-offset-2 ring-offset-paper" : "opacity-30") : g.myAnswer !== null && !picked ? "opacity-40" : ""
                  }`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/25">{LETTERS[i]}</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {g.status === "question" && (
            <p className="text-sm text-faint">
              {g.myAnswer !== null ? "Locked in! " : ""}
              {g.answered.length} of {room.players.filter((p) => p.online).length} answered
            </p>
          )}
          {g.status === "reveal" && (
            <>
              <p className={`text-xl font-bold ${g.myAnswer === g.correct ? "text-hit" : "text-miss"}`}>
                {g.myAnswer === g.correct ? `Correct! +${g.lastPoints[room.me ?? ""] ?? 0}` : g.myAnswer === null ? "Out of time" : "Wrong"}
              </p>
              <Leaderboard room={room} />
              <WaitingForDrinks room={room} hostToken={hostToken} />
              <BigButton disabled={room.waitingOn.length > 0} onClick={() => act(room, token, hostToken, { type: "next" })}>
                {g.number >= g.total ? "Final results" : "Next question"}
              </BigButton>
            </>
          )}
          {room.isHost && g.status === "question" && (
            <button onClick={() => act(room, token, hostToken, { type: "reveal" })} className="text-sm underline underline-offset-4">
              Reveal now
            </button>
          )}
        </div>
      )}
      {g.status === "finished" && (
        <div className="pop space-y-4">
          <h2 className="font-hand text-5xl font-bold">Final scores</h2>
          <Leaderboard room={room} />
          {room.isHost && <BigButton onClick={() => act(room, token, hostToken, { type: "start" })}>Play again</BigButton>}
        </div>
      )}
    </RoomShell>
  );
}

export function TriviaTv({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = tv(room);
  const answered = new Set(g.answered);
  if (g.status === "lobby")
    return (
      <div>
        <h2 className="font-hand text-8xl font-bold">Trivia</h2>
        <p className="mt-4 max-w-2xl text-2xl">Join on your phone. Fast right answers score the most.</p>
      </div>
    );
  if (g.status === "finished")
    return (
      <div className="max-w-4xl">
        <h2 className="font-hand text-8xl font-bold">Final scores</h2>
        <div className="mt-8">
          <Leaderboard room={room} big />
        </div>
      </div>
    );
  return (
    <div key={g.number} className="pop grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <p className="text-2xl text-faint">
            Question {g.number} of {g.total}
          </p>
          {g.status === "question" && <Countdown deadline={g.deadline} big />}
        </div>
        <h2 className="text-6xl font-bold leading-tight">{g.question}</h2>
        <div className="grid grid-cols-2 gap-4">
          {g.options?.map((opt, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 rounded-2xl p-6 text-3xl font-bold text-white ${COLORS[i]} ${
                g.status === "reveal" && g.correct !== i ? "opacity-25" : ""
              }`}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/25">{LETTERS[i]}</span>
              {opt}
            </div>
          ))}
        </div>
        {g.status === "question" && (
          <div className="flex flex-wrap gap-3">
            {room.players.map((p) => (
              <Avatar key={p.id} player={p} size={56} dim={!answered.has(p.id)} ring={answered.has(p.id) ? "ring-hit" : undefined} />
            ))}
          </div>
        )}
        <WaitingForDrinks room={room} hostToken={hostToken} big />
      </div>
      <aside>
        <h3 className="text-xl text-faint">Scores</h3>
        <div className="mt-3">
          <Leaderboard room={room} big />
        </div>
      </aside>
    </div>
  );
}
