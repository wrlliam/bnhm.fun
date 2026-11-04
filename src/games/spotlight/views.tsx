"use client";

import { Avatar } from "@/components/room/avatar";
import { GameLobby } from "@/components/room/game-bits";
import { RevealBar } from "@/components/room/reveal";
import { act, BigButton, RoomShell } from "@/components/room/room-shell";
import { SPOTLIGHT_PACKS } from "@/lib/catalog";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import type { SpotGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };
const sp = (room: RoomView) => room.game as SpotGameView;
const who = (room: RoomView, id: string) => room.players.find((p) => p.id === id);
const packName = (v: string) => SPOTLIGHT_PACKS.find((p) => p.value === v)?.label ?? v;

function OptionLabel({ room, option, big = false }: { room: RoomView; option: string; big?: boolean }) {
  if (option === "yes" || option === "no") return <span>{option === "yes" ? "Yes" : "No"}</span>;
  const p = who(room, option);
  return (
    <span className="inline-flex items-center gap-2">
      {p && <Avatar player={p} size={big ? 48 : 30} />}
      {p?.name ?? "Someone"}
    </span>
  );
}

function Settings({ room }: { room: RoomView }) {
  const g = sp(room);
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium">Pack</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {SPOTLIGHT_PACKS.map((p) => (
            <button
              key={p.value}
              onClick={() => act(room, null, null, { type: "settings", pack: p.value })}
              className={`rounded-full border px-3 py-1 transition-colors ${g.pack === p.value ? "border-ink bg-ink text-paper" : "border-ink/20"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-medium">Questions</span>
        {[10, 20, 30].map((n) => (
          <button
            key={n}
            onClick={() => act(room, null, null, { type: "settings", rounds: n })}
            className={`rounded-full border px-3 py-1 font-mono ${g.rounds === n ? "border-ink bg-ink text-paper" : "border-ink/20"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={g.anonymous} onChange={(e) => act(room, null, null, { type: "settings", anonymous: e.target.checked })} />
        Anonymous results (show the split, hide who voted)
      </label>
    </div>
  );
}

function Results({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = sp(room);
  const top = Math.max(...g.results.map((r) => r.count));
  return (
    <div className={big ? "space-y-8" : "space-y-5"}>
      {g.results.map((r, i) => (
        <RevealBar
          key={r.option}
          room={room}
          big={big}
          delay={i * 250}
          label={<OptionLabel room={room} option={r.option} big={big} />}
          pct={r.pct}
          count={r.count}
          voters={r.voters}
          lead={r.count === top && top > 0}
          hidden={g.anonymous}
        />
      ))}
    </div>
  );
}

export function SpotPlayer({ room, token, hostToken, status }: Props) {
  const g = sp(room);
  const menu = room.isHost && g.status === "lobby" ? <Settings room={room} /> : null;
  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken} menu={menu}>
      {g.status === "lobby" && (
        <GameLobby
          room={room}
          token={token}
          hostToken={hostToken}
          minPlayers={3}
          howItWorks={`${g.rounds} questions from the ${packName(g.pack)} pack. Vote in secret on your phone; when everyone's in, the split is revealed${g.anonymous ? " (anonymously)" : " with who voted which way"}.`}
        >
          <Settings room={room} />
        </GameLobby>
      )}

      {(g.status === "question" || g.status === "reveal") && g.question && (
        <div key={g.number} className="pop space-y-6">
          <div className="flex items-center justify-between text-sm text-faint">
            <span>
              {packName(g.pack)} · {g.number} of {g.total}
            </span>
            {g.anonymous && <span>Anonymous</span>}
          </div>
          <h2 className="font-hand text-5xl font-bold leading-tight">{g.question}</h2>

          {g.status === "question" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {g.options.map((o) => {
                  const mine = g.myVote === o;
                  return (
                    <button
                      key={o}
                      onClick={() => act(room, token, null, { type: "vote", choice: o })}
                      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-5 text-xl font-bold transition-[transform,background-color,border-color] active:scale-95 ${
                        mine ? "border-hit bg-hit text-paper" : "border-ink/20 bg-surface hover:border-ink"
                      }`}
                    >
                      {g.type === "pick" ? (
                        <>
                          {who(room, o) && <Avatar player={who(room, o)!} size={72} />}
                          <span className="font-hand text-3xl">{o === room.me ? "Me" : who(room, o)?.name}</span>
                        </>
                      ) : (
                        <span className="py-4 font-hand text-5xl">{o === "yes" ? "Yes" : "No"}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-faint">
                {g.myVote ? "Locked in. You can change it until everyone's voted. " : ""}
                {g.voted.length} of {room.players.filter((p) => p.online).length} voted
              </p>
              {room.isHost && (
                <button onClick={() => act(room, token, hostToken, { type: "reveal" })} className="text-sm underline underline-offset-4">
                  Reveal now
                </button>
              )}
            </>
          )}

          {g.status === "reveal" && (
            <>
              <Results room={room} />
              <BigButton onClick={() => act(room, token, hostToken, { type: "next" })}>
                {g.number >= g.total ? "Finish" : "Next question"}
              </BigButton>
            </>
          )}
        </div>
      )}

      {g.status === "finished" && <h2 className="pop font-hand text-5xl font-bold">That&rsquo;s the pack. Who came out worst?</h2>}
    </RoomShell>
  );
}

export function SpotTv({ room }: { room: RoomView }) {
  const g = sp(room);
  const voted = new Set(g.voted);
  if (g.status === "lobby")
    return (
      <div>
        <h2 className="font-hand text-8xl font-bold">Spotlight</h2>
        <p className="mt-4 max-w-2xl text-2xl">
          {packName(g.pack)} pack · {g.rounds} questions{g.anonymous ? " · anonymous results" : ""}. Join on your phone.
        </p>
      </div>
    );
  if (g.status === "finished") return <h2 className="font-hand text-8xl font-bold">That&rsquo;s the pack</h2>;
  return (
    <div key={g.number} className="pop grid gap-12 lg:grid-cols-[1fr_1fr]">
      <div>
        <p className="text-2xl text-faint">
          {packName(g.pack)} · {g.number} of {g.total}
        </p>
        <h2 className="mt-2 font-hand text-8xl font-bold leading-tight">{g.question}</h2>
        {g.type === "pick" && g.status === "question" && (
          <div className="mt-10 flex items-center gap-10">
            {g.options.map((o, i) => (
              <div key={o} className="cheer flex flex-col items-center gap-3" style={{ animationDelay: `${i * 150}ms` }}>
                {who(room, o) && <Avatar player={who(room, o)!} size={140} ring="ring-hit" />}
                <span className="font-hand text-5xl font-bold">{who(room, o)?.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        {g.status === "question" ? (
          <div>
            <p className="text-2xl">Vote on your phone</p>
            <div className="mt-6 flex flex-wrap gap-4">
              {room.players.map((p) => (
                <Avatar key={p.id} player={p} size={72} dim={!voted.has(p.id)} ring={voted.has(p.id) ? "ring-hit" : undefined} />
              ))}
            </div>
          </div>
        ) : (
          <Results room={room} big />
        )}
      </div>
    </div>
  );
}
