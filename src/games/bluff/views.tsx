"use client";

import { useState } from "react";
import { Avatar } from "@/components/room/avatar";
import { Countdown, GameLobby } from "@/components/room/game-bits";
import { Podium } from "@/components/room/reveal";
import { act, BigButton, RoomShell } from "@/components/room/room-shell";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import type { BluffGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };
const bl = (room: RoomView) => room.game as BluffGameView;
const who = (room: RoomView, id: string) => room.players.find((p) => p.id === id);

/** The fact with its blank drawn as a gap, or filled once revealed. */
function Fact({ text, fill, big = false }: { text: string; fill?: string | null; big?: boolean }) {
  const [before, after] = text.split("___");
  return (
    <h2 className={`font-hand font-bold leading-tight ${big ? "text-8xl" : "text-5xl"}`}>
      {before}
      {fill ? (
        <span className="cheer inline-block rounded-lg bg-hit px-2 text-paper">{fill}</span>
      ) : (
        <span className="inline-block min-w-24 border-b-4 border-dashed border-ink/40">&nbsp;</span>
      )}
      {after}
    </h2>
  );
}

function Reveal({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = bl(room);
  // lies first (most fooled first), the truth last for the drum-roll
  const opts = [...g.options].sort((a, b) => Number(a.truth) - Number(b.truth) || b.pickedBy.length - a.pickedBy.length);
  return (
    <ul className={big ? "space-y-4" : "space-y-3"}>
      {opts.map((o, i) => (
        <li
          key={o.key}
          className={`pop rounded-2xl border-2 p-4 ${o.truth ? "border-hit bg-hit/10" : "border-ink/10 bg-surface"} ${big ? "p-6" : ""}`}
          style={{ animationDelay: `${i * 450}ms` }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className={`font-hand font-bold ${big ? "text-5xl" : "text-3xl"}`}>{o.text}</span>
            <span className={`shrink-0 font-medium ${o.truth ? "text-hit" : "text-miss"} ${big ? "text-2xl" : "text-sm"}`}>
              {o.truth ? "The truth" : `Lie by ${o.authors.map((id) => who(room, id)?.name).join(" & ")}`}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {o.pickedBy.length ? (
              <>
                <span className={`text-faint ${big ? "text-lg" : "text-xs"}`}>{o.truth ? "Found it:" : "Fooled:"}</span>
                {o.pickedBy.map((id, j) => {
                  const p = who(room, id);
                  return p ? (
                    <span key={id} className="cheer" style={{ animationDelay: `${i * 450 + 250 + j * 80}ms` }}>
                      <Avatar player={p} size={big ? 44 : 26} />
                    </span>
                  ) : null;
                })}
              </>
            ) : (
              <span className={`text-faint ${big ? "text-lg" : "text-xs"}`}>{o.truth ? "Nobody found it" : "Nobody fell for it"}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BluffPlayer({ room, token, hostToken, status }: Props) {
  const g = bl(room);
  const [lie, setLie] = useState("");
  const truth = g.options.find((o) => o.truth);
  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken}>
      {g.status === "lobby" && (
        <GameLobby
          room={room}
          token={token}
          hostToken={hostToken}
          minPlayers={3}
          howItWorks="a weird fact appears with a word missing. Write a fake answer good enough to fool people, then spot the real one among everyone's lies. 1000 for finding the truth, 500 for each person you fool."
        />
      )}

      {g.status !== "lobby" && g.status !== "finished" && g.question && (
        <div key={g.number} className="space-y-6">
          <div className="flex items-center justify-between text-sm text-faint">
            <span>
              Fact {g.number} of {g.total}
            </span>
            {g.deadline && <Countdown deadline={g.deadline} />}
          </div>
          <Fact text={g.question} fill={g.status === "reveal" ? truth?.text : null} />

          {g.status === "writing" &&
            (g.myLie ? (
              <p className="pop rounded-2xl bg-ink/5 p-4">
                Your lie: <strong>{g.myLie}</strong>. Waiting for {room.players.length - g.wrote.length} more
              </p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await act(room, token, null, { type: "lie", text: lie })) setLie("");
                }}
                className="flex gap-2"
              >
                <input
                  autoFocus
                  value={lie}
                  onChange={(e) => setLie(e.target.value)}
                  maxLength={50}
                  placeholder="A believable fake answer"
                  className="w-0 flex-1 rounded-xl border-2 border-ink/20 bg-paper px-3 py-3 text-lg outline-none focus:border-ink"
                />
                <button disabled={!lie.trim()} className="rounded-xl bg-ink px-5 font-medium text-paper disabled:opacity-40">
                  Lie
                </button>
              </form>
            ))}

          {g.status === "choosing" && (
            <div className="space-y-2">
              <p className="text-sm text-faint">Which one is real?</p>
              {g.options.map((o, i) => (
                <button
                  key={o.key}
                  disabled={o.mine}
                  onClick={() => act(room, token, null, { type: "pick", key: o.key })}
                  className={`pop flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left font-hand text-3xl font-bold transition-[transform,border-color] active:scale-[0.98] disabled:opacity-40 ${
                    g.myPick === o.key ? "border-hit bg-hit/10" : "border-ink/15 bg-surface hover:border-ink"
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {o.text}
                  {o.mine && <span className="font-sans text-sm font-normal text-faint">your lie</span>}
                </button>
              ))}
            </div>
          )}

          {g.status === "reveal" && (
            <>
              <Reveal room={room} />
              <Podium room={room} scores={g.scores} gained={g.last} />
              <BigButton onClick={() => act(room, token, hostToken, { type: "next" })}>{g.number >= g.total ? "Final scores" : "Next fact"}</BigButton>
            </>
          )}
          {room.isHost && (g.status === "writing" || g.status === "choosing") && (
            <button onClick={() => act(room, token, hostToken, { type: "skip" })} className="text-sm underline underline-offset-4">
              Move on now
            </button>
          )}
        </div>
      )}

      {g.status === "finished" && (
        <div className="pop space-y-5">
          <h2 className="font-hand text-5xl font-bold">Biggest liar wins</h2>
          <Podium room={room} scores={g.scores} />
        </div>
      )}
    </RoomShell>
  );
}

export function BluffTv({ room }: { room: RoomView }) {
  const g = bl(room);
  const truth = g.options.find((o) => o.truth);
  if (g.status === "lobby")
    return (
      <div>
        <h2 className="font-hand text-8xl font-bold">Bluff</h2>
        <p className="mt-4 max-w-2xl text-2xl">Fake an answer to a weird fact, then spot the real one.</p>
      </div>
    );
  if (g.status === "finished")
    return (
      <div className="max-w-4xl">
        <h2 className="font-hand text-8xl font-bold">Biggest liar wins</h2>
        <div className="mt-8">
          <Podium room={room} scores={g.scores} big />
        </div>
      </div>
    );
  const done = new Set(g.status === "writing" ? g.wrote : g.picked);
  return (
    <div key={g.number} className="grid gap-12 lg:grid-cols-[1fr_440px]">
      <div className="space-y-8">
        <div className="flex items-center gap-6">
          <p className="text-2xl text-faint">
            Fact {g.number} of {g.total}
          </p>
          {g.deadline && <Countdown deadline={g.deadline} big />}
        </div>
        <Fact text={g.question ?? ""} fill={g.status === "reveal" ? truth?.text : null} big />
        {g.status === "choosing" && (
          <div className="grid grid-cols-2 gap-4">
            {g.options.map((o, i) => (
              <div key={o.key} className="pop rounded-2xl border-2 border-ink/15 bg-surface p-6 font-hand text-5xl font-bold" style={{ animationDelay: `${i * 100}ms` }}>
                {o.text}
              </div>
            ))}
          </div>
        )}
        {g.status === "reveal" && <Reveal room={room} big />}
      </div>
      <aside>
        {g.status === "reveal" ? (
          <Podium room={room} scores={g.scores} gained={g.last} big />
        ) : (
          <div>
            <p className="text-2xl">{g.status === "writing" ? "Write a lie on your phone" : "Pick the truth on your phone"}</p>
            <div className="mt-6 flex flex-wrap gap-4">
              {room.players.map((p) => (
                <Avatar key={p.id} player={p} size={72} dim={!done.has(p.id)} ring={done.has(p.id) ? "ring-hit" : undefined} />
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
