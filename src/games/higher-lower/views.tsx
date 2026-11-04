"use client";

import { PlayingCard } from "@/components/playing-card";
import { Avatar } from "@/components/room/avatar";
import { WaitingForDrinks } from "@/components/room/drink-alert";
import { Countdown, GameLobby, PlayerPicker, TurnTimerSetting } from "@/components/room/game-bits";
import { act, RoomShell } from "@/components/room/room-shell";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import type { HlGameView } from "@/lib/rooms/registry";

type Props = { room: RoomView; token: string; hostToken: string | null; status: StreamStatus };
const hl = (room: RoomView) => room.game as HlGameView;
const who = (room: RoomView, id: string | null | undefined) => room.players.find((p) => p.id === id);
const label = (c: { rank: string; suit: { symbol: string } }) => `${c.rank}${c.suit.symbol}`;
const SAID = { H: "higher", L: "lower", E: "equal" } as const;

function LastResult({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = hl(room);
  const l = g.last;
  if (!l) return null;
  const name = l.by === room.me ? "You" : who(room, l.by)?.name;
  return (
    <p className={`${big ? "text-3xl" : "text-lg"} ${l.correct ? "text-hit" : "text-miss"} font-medium`}>
      {name} said {SAID[l.move]}: {label(l.card)} after {label(l.prev)} —{" "}
      {l.correct ? (l.move === "E" ? "called it!" : "correct") : `wrong, drink ${l.drinks}`}
    </p>
  );
}

export function HlPlayer({ room, token, hostToken, status }: Props) {
  const g = hl(room);
  const myTurn = g.turnPlayerId === room.me;
  const blocked = room.waitingOn.length > 0 || !!g.bonusFrom;
  const menu = room.isHost ? <TurnTimerSetting room={room} value={g.turnSeconds} /> : null;
  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken} menu={menu}>
      {g.status === "lobby" && (
        <GameLobby
          room={room}
          token={token}
          hostToken={hostToken}
          howItWorks="take turns calling the next card higher, lower or equal (Aces low). Keep a streak going; a wrong call means you drink one per card in the streak, plus one. Nail an equal and you hand out 3."
        >
          <TurnTimerSetting room={room} value={g.turnSeconds} />
        </GameLobby>
      )}
      {g.status !== "lobby" && g.card && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div key={g.left} className="pop">
              <PlayingCard card={g.card} size="lg" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-faint">Streak {g.streak} · best {g.best} · {g.left} left</p>
              <Countdown deadline={g.deadline} />
              <LastResult room={room} />
            </div>
          </div>

          {g.bonusFrom === room.me ? (
            <div className="rounded-2xl border-2 border-hit bg-surface p-4">
              <p className="font-medium">Equal call! Pick who drinks 3:</p>
              <div className="mt-3">
                <PlayerPicker room={room} exclude={[room.me ?? ""]} onPick={(id) => act(room, token, null, { type: "bonus", playerId: id })} />
              </div>
            </div>
          ) : g.bonusFrom ? (
            <p className="text-lg">{who(room, g.bonusFrom)?.name} is picking who drinks 3…</p>
          ) : null}

          <WaitingForDrinks room={room} hostToken={hostToken} />

          {g.status === "playing" &&
            (myTurn ? (
              <div className={`grid grid-cols-3 gap-2 ${blocked ? "opacity-40" : ""}`}>
                {(["H", "L", "E"] as const).map((m) => (
                  <button
                    key={m}
                    disabled={blocked}
                    onClick={() => act(room, token, null, { type: "guess", move: m })}
                    className={`rounded-2xl py-6 text-xl font-bold transition active:scale-95 ${
                      m === "E" ? "border-2 border-dashed border-ink" : "bg-ink text-paper"
                    }`}
                  >
                    {m === "H" ? "↑ Higher" : m === "L" ? "↓ Lower" : "= Equal"}
                  </button>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-lg">
                {who(room, g.turnPlayerId) && <Avatar player={who(room, g.turnPlayerId)!} size={32} />}
                <strong className="font-hand text-3xl">{who(room, g.turnPlayerId)?.name}</strong> is calling…
              </p>
            ))}
          {g.status === "finished" && <h2 className="font-hand text-5xl font-bold">Deck finished!</h2>}
        </div>
      )}
    </RoomShell>
  );
}

export function HlTv({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = hl(room);
  if (g.status === "lobby")
    return (
      <div>
        <h2 className="font-hand text-8xl font-bold">Higher or Lower</h2>
        <p className="mt-4 max-w-2xl text-2xl">Join on your phone and take turns calling the next card.</p>
      </div>
    );
  const up = who(room, g.turnPlayerId);
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[auto_1fr]">
      {g.card && (
        <div key={g.left} className="pop">
          <PlayingCard card={g.card} size="lg" />
        </div>
      )}
      <div className="space-y-6">
        {g.status === "playing" && up && (
          <div className="flex items-center gap-4">
            <Avatar player={up} size={72} ring="ring-hit" />
            <p className="text-4xl">
              <strong className="font-hand text-6xl">{up.name}</strong>: higher, lower or equal?
            </p>
            <Countdown deadline={g.deadline} big />
          </div>
        )}
        <p className="text-3xl">
          Streak <strong>{g.streak}</strong> · best <strong>{g.best}</strong> · <span className="text-faint">{g.left} cards left</span>
        </p>
        <LastResult room={room} big />
        {g.bonusFrom && <p className="text-3xl">{who(room, g.bonusFrom)?.name} nailed an equal and is picking who drinks 3!</p>}
        <WaitingForDrinks room={room} hostToken={hostToken} big />
        {g.status === "finished" && <h2 className="font-hand text-8xl font-bold">Deck finished!</h2>}
      </div>
    </div>
  );
}
