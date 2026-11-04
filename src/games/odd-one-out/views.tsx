"use client";

import { useState } from "react";
import { Avatar } from "@/components/room/avatar";
import { GameLobby, PlayerPicker } from "@/components/room/game-bits";
import { Podium } from "@/components/room/reveal";
import { act, BigButton, RoomShell } from "@/components/room/room-shell";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import type { OddGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };
const od = (room: RoomView) => room.game as OddGameView;
const who = (room: RoomView, id: string | null) => room.players.find((p) => p.id === id);

/** Press and hold to peek at your secret, so the person next to you can't read it. */
function SecretCard({ room }: { room: RoomView }) {
  const g = od(room);
  const [peek, setPeek] = useState(false);
  return (
    <button
      onPointerDown={() => setPeek(true)}
      onPointerUp={() => setPeek(false)}
      onPointerLeave={() => setPeek(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative flex h-56 w-full select-none flex-col items-center justify-center rounded-3xl border-2 p-6 text-center transition-colors ${
        peek ? (g.iAmOdd ? "border-miss bg-miss text-paper" : "border-hit bg-surface") : "border-ink bg-ink text-paper"
      }`}
      aria-label="Press and hold to see your secret"
    >
      {peek ? (
        g.iAmOdd ? (
          <>
            <span className="font-hand text-5xl font-bold leading-tight">You&rsquo;re the odd one out</span>
            <span className="mt-2">Category: {g.category}. Blend in, and work out the word</span>
          </>
        ) : (
          <>
            <span className="text-sm text-faint">{g.category}</span>
            <span className="font-hand text-7xl font-bold leading-none">{g.word}</span>
            <span className="mt-2 text-sm text-faint">One of you doesn&rsquo;t know this</span>
          </>
        )
      ) : (
        <>
          <span className="font-hand text-4xl font-bold">Press and hold</span>
          <span className="mt-1 text-paper/70">to see your secret</span>
        </>
      )}
    </button>
  );
}

function Order({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = od(room);
  return (
    <ol className={`flex flex-wrap gap-3 ${big ? "gap-6" : ""}`}>
      {g.order.map((id, i) => {
        const p = who(room, id);
        return p ? (
          <li key={id} className="pop flex items-center gap-2" style={{ animationDelay: `${i * 80}ms` }}>
            <span className={`flex items-center justify-center rounded-full bg-ink font-mono text-paper ${big ? "size-10 text-xl" : "size-6 text-xs"}`}>{i + 1}</span>
            <Avatar player={p} size={big ? 64 : 32} />
            <span className={big ? "text-2xl" : ""}>{p.id === room.me ? "You" : p.name}</span>
          </li>
        ) : null;
      })}
    </ol>
  );
}

function Verdict({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = od(room);
  const odd = who(room, g.odd);
  const accused = who(room, g.accused);
  const groupWon = g.winner === "group";
  return (
    <div className={`cheer rounded-3xl p-6 text-center ${groupWon ? "bg-hit/15" : "bg-miss/15"} ${big ? "p-12" : ""}`}>
      {odd && <Avatar player={odd} size={big ? 160 : 96} ring={groupWon ? "ring-hit" : "ring-miss"} />}
      <p className={`mt-4 font-hand font-bold leading-tight ${big ? "text-8xl" : "text-5xl"}`}>
        {groupWon ? `Caught ${odd?.name}` : `${odd?.name} fooled you`}
      </p>
      <p className={`mt-2 ${big ? "text-3xl" : "text-lg"}`}>
        The word was <strong>{g.word}</strong>
        {g.guess && (
          <>
            {" "}
            · {odd?.name} guessed <strong>{g.guess}</strong>
          </>
        )}
      </p>
      {!groupWon && !g.guess && (
        <p className={`text-faint ${big ? "text-2xl" : ""}`}>{accused ? `You all picked ${accused.name} instead` : "Nobody got enough votes"}</p>
      )}
    </div>
  );
}

export function OddPlayer({ room, token, hostToken, status }: Props) {
  const g = od(room);
  const [guess, setGuess] = useState("");
  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken}>
      {g.status === "lobby" && (
        <GameLobby
          room={room}
          token={token}
          hostToken={hostToken}
          minPlayers={3}
          howItWorks="everyone's phone shows the same secret word, except one player who only sees the category. Go round and each say one word linked to it, out loud. Then vote for the faker; if you catch them, they get one guess at the word to steal the win."
        />
      )}

      {g.status === "clues" && (
        <div className="space-y-6">
          <p className="text-sm text-faint">Round {g.round}</p>
          <SecretCard room={room} />
          <div>
            <p className="font-medium">Say one word each, out loud, in this order</p>
            <div className="mt-3">
              <Order room={room} />
            </div>
          </div>
          <BigButton onClick={() => act(room, token, hostToken, { type: "toVote" })}>Everyone&rsquo;s said a word: vote</BigButton>
        </div>
      )}

      {g.status === "voting" && (
        <div className="space-y-5">
          <h2 className="font-hand text-5xl font-bold">Who&rsquo;s the odd one out?</h2>
          <PlayerPicker
            room={room}
            exclude={[room.me ?? ""]}
            selected={g.myVote}
            onPick={(id) => act(room, token, null, { type: "vote", playerId: id })}
          />
          <p className="text-sm text-faint">
            {g.voted.length} of {room.players.filter((p) => p.online).length} voted
          </p>
          {room.isHost && (
            <button onClick={() => act(room, token, hostToken, { type: "closeVote" })} className="text-sm underline underline-offset-4">
              Close the vote now
            </button>
          )}
        </div>
      )}

      {g.status === "guess" &&
        (g.iAmOdd ? (
          <form
            className="pop space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              act(room, token, null, { type: "guess", text: guess });
            }}
          >
            <h2 className="font-hand text-5xl font-bold">You&rsquo;ve been caught</h2>
            <p>Guess the secret word ({g.category}) to steal the win</p>
            <input
              autoFocus
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Your guess"
              className="w-full rounded-xl border-2 border-ink/20 bg-paper px-3 py-3 text-2xl outline-none focus:border-ink"
            />
            <BigButton disabled={!guess.trim()}>Guess</BigButton>
          </form>
        ) : (
          <div className="pop text-center">
            {who(room, g.accused) && <Avatar player={who(room, g.accused)!} size={96} ring="ring-miss" />}
            <h2 className="mt-4 font-hand text-5xl font-bold">Caught {who(room, g.accused)?.name}</h2>
            <p className="mt-2 text-lg">They get one guess at the word. Keep a straight face</p>
          </div>
        ))}

      {g.status === "reveal" && (
        <div className="space-y-6">
          <Verdict room={room} />
          <Podium room={room} scores={g.scores} />
          <BigButton onClick={() => act(room, token, hostToken, { type: "next" })}>Next round</BigButton>
        </div>
      )}
    </RoomShell>
  );
}

export function OddTv({ room }: { room: RoomView }) {
  const g = od(room);
  const voted = new Set(g.voted);
  if (g.status === "lobby")
    return (
      <div>
        <h2 className="font-hand text-8xl font-bold">Odd One Out</h2>
        <p className="mt-4 max-w-2xl text-2xl">One of you doesn&rsquo;t know the secret word. Find them.</p>
      </div>
    );
  if (g.status === "clues")
    return (
      <div className="space-y-10">
        <p className="text-3xl text-faint">Round {g.round}</p>
        <h2 className="font-hand text-8xl font-bold">Category: {g.category}</h2>
        <p className="text-3xl">Check your phone, then say one word each, in this order</p>
        <Order room={room} big />
      </div>
    );
  if (g.status === "voting")
    return (
      <div className="space-y-10">
        <h2 className="font-hand text-8xl font-bold">Who&rsquo;s faking?</h2>
        <div className="flex flex-wrap gap-6">
          {room.players.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2">
              <Avatar player={p} size={96} dim={!voted.has(p.id)} ring={voted.has(p.id) ? "ring-hit" : undefined} />
              <span className="text-2xl">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  if (g.status === "guess")
    return (
      <div className="cheer text-center">
        {who(room, g.accused) && <Avatar player={who(room, g.accused)!} size={180} ring="ring-miss" />}
        <h2 className="mt-6 font-hand text-9xl font-bold">Caught {who(room, g.accused)?.name}</h2>
        <p className="mt-4 text-4xl">One guess at the word to steal the win…</p>
      </div>
    );
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
      <Verdict room={room} big />
      <Podium room={room} scores={g.scores} big />
    </div>
  );
}
